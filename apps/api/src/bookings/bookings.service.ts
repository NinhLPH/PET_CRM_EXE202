import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  Actor,
  addLocalDays,
  digest,
  id,
  localDayStart,
  page,
  serialize,
} from '../common/common';
import {
  AdminCreateBookingDto,
  CancelDto,
  CompleteDto,
  CreateBookingDto,
} from './dto/bookings.dto';
import { ScheduleService } from '../schedule/schedule.service';

@Injectable()
export class BookingWorkflowService {
  constructor(
    private readonly db: PrismaService,
    private readonly schedule: ScheduleService,
  ) {}

  private async replay(
    tx: Prisma.TransactionClient,
    actor: Actor,
    key: string | undefined,
    operation: string,
    bookingId: bigint,
    hash: string,
  ) {
    if (!key) return null;
    if (key.length > 100) throw new BadRequestException('Idempotency-Key quá dài');
    const previous = await tx.idempotencyRequest.findUnique({
      where: { userId_key: { userId: actor.id, key } },
    });
    if (!previous) return null;
    if (previous.operation !== operation || previous.bookingId !== bookingId || previous.requestHash !== hash)
      throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency-Key đã dùng cho request khác' });
    return previous.result ?? { bookingId: bookingId.toString(), operation, replay: true };
  }

  private async record(
    tx: Prisma.TransactionClient,
    actor: Actor,
    key: string | undefined,
    operation: string,
    bookingId: bigint,
    hash: string,
    result: unknown,
  ) {
    if (!key) return;
    await tx.idempotencyRequest.create({
      data: {
        userId: actor.id, key, operation, bookingId, requestHash: hash,
        result: serialize(result) as Prisma.InputJsonValue,
      },
    });
  }

  private async audit(
    tx: Prisma.TransactionClient,
    actor: Actor,
    action: string,
    bookingId: bigint,
    reason?: string,
    change?: Record<string, string | number | null>,
  ) {
    await tx.auditEvent.create({
      data: {
        actorId: actor.id, action, objectType: 'BOOKING', objectId: bookingId.toString(),
        reason: reason?.trim() || null,
        ...(change ? { change } : {}),
      },
    });
  }

  async operation(actor: Actor, key: string) {
    if (!key || key.length > 100) throw new BadRequestException('Idempotency-Key không hợp lệ');
    const item = await this.db.idempotencyRequest.findUnique({
      where: { userId_key: { userId: actor.id, key } },
    });
    if (!item) throw new NotFoundException('Không tìm thấy thao tác');
    if (actor.role === 'CUSTOMER') await this.booking(item.bookingId.toString(), actor);
    let result: unknown = item.result;
    if (!result && item.operation === 'ADJUST' && item.adjustmentId) {
      result = {
        adjustment: await this.db.bookingAdjustment.findUniqueOrThrow({ where: { id: item.adjustmentId } }),
        adjustedTotal: item.resultTotal,
      };
    }
    if (!result) result = actor.role === 'ADMIN'
      ? await this.booking(item.bookingId.toString(), actor, true)
      : await this.booking(item.bookingId.toString(), actor);
    return {
      operation: item.operation,
      bookingId: item.bookingId,
      result,
      createdAt: item.createdAt,
    };
  }

  private async bookingRecord(bookingId: string) {
    const booking = await this.db.booking.findUnique({
      where: { id: id(bookingId) },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            address: true,
            note: true,
          },
        },
        pet: true,
        services: { include: { service: true } },
        surcharges: true,
        reminders: true,
        events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        adjustments: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    return booking;
  }
  async booking(bookingId: string, actor: Actor, admin = false) {
    const booking = await this.bookingRecord(bookingId);
    if (!admin && booking.customerId !== actor.customerId)
      throw new ForbiddenException();
    if (!admin) return this.customerBooking(booking);
    return {
      ...booking,
      adjustedTotal:
        booking.finalTotal === null
          ? null
          : Number(booking.finalTotal) +
            booking.adjustments.reduce(
              (sum, item) => sum + Number(item.delta),
              0,
            ),
    };
  }
  private customerBooking(
    booking: Awaited<ReturnType<BookingWorkflowService['bookingRecord']>>,
  ) {
    return {
      id: booking.id,
      customerId: booking.customerId,
      pet: {
        id: booking.pet.id,
        name: booking.pet.name,
        species: booking.pet.species,
      },
      bookingDate: booking.bookingDate,
      scheduledEnd: booking.scheduledEnd,
      status: booking.status,
      cancellationType: booking.cancellationType,
      cancellationReason: booking.cancellationReason,
      version: booking.version,
      note: booking.note,
      estimatedTotal: booking.estimatedTotal,
      ...(booking.status === 'COMPLETED'
        ? {
            finalTotal: booking.finalTotal,
            discountAmount: booking.discountAmount,
            adjustedTotal:
              Number(booking.finalTotal) +
              booking.adjustments.reduce(
                (sum, item) => sum + Number(item.delta),
                0,
              ),
            surcharges: booking.surcharges.map((item) => ({
              name: item.surchargeName,
              amount: item.amount,
            })),
            adjustments: booking.adjustments.map((item) => ({
              id: item.id,
              delta: item.delta,
              reason: item.reason,
              reversalRef: item.reversalRef,
              createdAt: item.createdAt,
            })),
          }
        : {}),
      services: booking.services.map((item) => ({
        serviceId: item.serviceId,
        serviceName: item.serviceNameSnapshot ?? item.service.serviceName,
        basePrice: item.basePrice,
        durationMinutes: item.durationMinutes,
      })),
      events: booking.events.map((item) => ({
        action: item.action,
        oldStatus: item.oldStatus,
        newStatus: item.newStatus,
        oldStart: item.oldStart,
        newStart: item.newStart,
        createdAt: item.createdAt,
      })),
    };
  }
  async mine(actor: Actor, query: { page?: string; limit?: string }) {
    if (!actor.customerId) throw new NotFoundException('Hồ sơ không tồn tại');
    const p = page(query);
    const where = { customerId: actor.customerId };
    const [items, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        include: {
          pet: true,
          services: { include: { service: true } },
          events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          adjustments: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          surcharges: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: p.skip,
        take: p.take,
      }),
      this.db.booking.count({ where }),
    ]);
    return {
      items: items.map((item) =>
        this.customerBooking(
          item as Awaited<ReturnType<BookingWorkflowService['bookingRecord']>>,
        ),
      ),
      total,
      page: p.page,
      limit: p.limit,
    };
  }
  async create(
    actor: Actor,
    body: CreateBookingDto | AdminCreateBookingDto,
    requestKey: string,
  ) {
    const admin = actor.role === 'ADMIN';
    const adminBody = admin ? (body as AdminCreateBookingDto) : null;
    if (adminBody?.source === 'CUSTOMER_WEB')
      throw new BadRequestException('Nguồn tiếp nhận tại quầy không hợp lệ');
    const customerId = admin ? id(adminBody!.customerId) : actor.customerId;
    if (!customerId) throw new ForbiddenException();
    if (!requestKey || requestKey.length > 100)
      throw new BadRequestException('Idempotency-Key là bắt buộc');
    const date = new Date(body.bookingDate);
    if (
      Number.isNaN(date.getTime()) ||
      !/[zZ]|[+-]\d\d:\d\d$/.test(body.bookingDate)
    )
      throw new BadRequestException('Ngày giờ hẹn phải có múi giờ');
    const requestHash = digest(
      JSON.stringify({
        petId: body.petId,
        serviceId: body.serviceId,
        bookingDate: date.toISOString(),
        expectedBasePrice: body.expectedBasePrice,
        note: body.note ?? null,
        customerId: customerId.toString(),
        source: adminBody?.source ?? 'CUSTOMER_WEB',
        targetStatus: adminBody?.targetStatus ?? 'PENDING',
      }),
    );
    const previous = await this.db.idempotencyRequest.findUnique({
      where: { userId_key: { userId: actor.id, key: requestKey } },
    });
    if (previous) {
      if (previous.requestHash !== requestHash)
        throw new ConflictException('Idempotency-Key đã dùng cho request khác');
      return this.booking(previous.bookingId.toString(), actor, admin);
    }
    if (date <= new Date())
      throw new BadRequestException('Ngày giờ hẹn phải ở tương lai');
    if (date > addLocalDays(new Date(), 90))
      throw new BadRequestException('Chỉ được đặt lịch trong 90 ngày tới');
    try {
      const created = await this.db.$transaction(async (tx) => {
        await this.schedule.lock(tx);
        const pet = await tx.pet.findUnique({ where: { id: id(body.petId) } });
        if (!pet || pet.customerId !== customerId)
          throw new ForbiddenException('Pet không thuộc tài khoản');
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`service:${body.serviceId}`}, 0))`;
        const service = await tx.service.findUnique({
          where: { id: id(body.serviceId) },
        });
        if (!service || service.status !== 'ACTIVE')
          throw new ConflictException('Dịch vụ không mở bán');
        if (!service.estimatedDuration || service.estimatedDuration < 1)
          throw new ConflictException('Dịch vụ chưa có thời lượng');
        const end = new Date(
          date.getTime() + service.estimatedDuration * 60000,
        );
        await this.schedule.assertWindow(tx, date, end);
        if (adminBody?.targetStatus === 'CONFIRMED')
          await this.schedule.assertAvailable(tx, date, end, pet.id);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${service.id}:${pet.species}`}, 0))`;
        const prices = await tx.servicePrice.findMany({
          where: {
            serviceId: service.id,
            species: pet.species,
            status: 'ACTIVE',
            minWeight: { lte: pet.weight },
            OR: [{ maxWeight: null }, { maxWeight: { gt: pet.weight } }],
          },
          take: 2,
        });
        if (prices.length !== 1)
          throw new ConflictException(
            prices.length
              ? 'Cấu hình giá bị chồng khoảng'
              : 'Chưa có giá cho cân nặng này',
          );
        const base = Number(prices[0].price);
        if (base !== body.expectedBasePrice)
          throw new ConflictException({
            code: 'PRICE_CHANGED',
            message: 'Giá đã thay đổi',
            currentQuote: {
              basePrice: base,
              servicePriceId: prices[0].id.toString(),
            },
          });
        const booking = await tx.booking.create({
          data: {
            customerId,
            petId: pet.id,
            bookingDate: date,
            scheduledEnd: end,
            source: adminBody?.source ?? 'CUSTOMER_WEB',
            createdBy: actor.id,
            status: adminBody?.targetStatus ?? 'PENDING',
            note: body.note,
            estimatedTotal: base,
            services: {
              create: {
                serviceId: service.id,
                servicePriceId: prices[0].id,
                petWeightSnapshot: pet.weight,
                basePrice: base,
                durationMinutes: service.estimatedDuration,
                serviceNameSnapshot: service.serviceName,
              },
            },
          },
          include: { services: true },
        });
        await tx.idempotencyRequest.create({
          data: {
            userId: actor.id,
            key: requestKey,
            requestHash,
            bookingId: booking.id,
          },
        });
        await tx.bookingEvent.create({
          data: {
            bookingId: booking.id,
            action: 'CREATE',
            actorId: actor.id,
            newStatus: adminBody?.targetStatus ?? 'PENDING',
            newStart: date,
          },
        });
        await this.audit(tx, actor, 'CREATE', booking.id, undefined, {
          status: booking.status, start: date.toISOString(), source: booking.source,
        });
        return booking.id;
      });
      return this.booking(created.toString(), actor, admin);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const replay = await this.db.idempotencyRequest.findUnique({
          where: { userId_key: { userId: actor.id, key: requestKey } },
        });
        if (replay && replay.requestHash === requestHash)
          return this.booking(replay.bookingId.toString(), actor, admin);
        throw new ConflictException(
          'Pet đã có booking cùng thời điểm hoặc request đã gửi',
        );
      }
      throw error;
    }
  }

  async adminList(query: {
    status?: BookingStatus;
    date?: string;
    from?: string;
    to?: string;
    dateBasis?: 'bookingDate' | 'completedAt';
    page?: string;
    limit?: string;
  }) {
    const p = page(query);
    if (query.status && !Object.values(BookingStatus).includes(query.status))
      throw new BadRequestException('Trạng thái không hợp lệ');
    if ((query.from && !query.to) || (!query.from && query.to) ||
        (query.date && (query.from || query.to)) ||
        (query.dateBasis && !['bookingDate','completedAt'].includes(query.dateBasis)))
      throw new BadRequestException('Bộ lọc ngày không hợp lệ');
    let range: { gte: Date; lt: Date } | undefined;
    if (query.date) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(query.date) ||
        Number.isNaN(Date.parse(`${query.date}T00:00:00+07:00`))
      )
        throw new BadRequestException('Ngày không hợp lệ');
      const start = new Date(`${query.date}T00:00:00+07:00`);
      range = { gte: start, lt: addLocalDays(start, 1) };
    }
    if (query.from && query.to) {
      if (![query.from,query.to].every(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00+07:00`))) ||
          query.from > query.to || Date.parse(`${query.to}T00:00:00+07:00`) - Date.parse(`${query.from}T00:00:00+07:00`) > 90*86400000)
        throw new BadRequestException('Khoảng ngày tối đa 90 ngày');
      range = { gte: new Date(`${query.from}T00:00:00+07:00`), lt: addLocalDays(new Date(`${query.to}T00:00:00+07:00`),1) };
    }
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(range ? { [query.dateBasis === 'completedAt' ? 'completedAt' : 'bookingDate']: range } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              address: true,
              note: true,
            },
          },
          pet: true,
          services: { include: { service: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: p.skip,
        take: p.take,
      }),
      this.db.booking.count({ where }),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }
  async confirm(bookingId: string, actor: Actor, key?: string) {
    return this.db.$transaction(async (tx) => {
      await this.schedule.lock(tx);
      const bookingKey = id(bookingId), hash = digest(JSON.stringify({ bookingId }));
      const replay = await this.replay(tx, actor, key, 'CONFIRM', bookingKey, hash);
      if (replay) return replay;
      const booking = await tx.booking.findUnique({
        where: { id: bookingKey },
        include: { services: true },
      });
      if (
        !booking ||
        booking.status !== 'PENDING' ||
        !booking.scheduledEnd ||
        booking.bookingDate <= new Date() ||
        booking.services.length !== 1
      )
        throw new ConflictException('Booking không thể xác nhận');
      const service = await tx.service.findUnique({
        where: { id: booking.services[0].serviceId },
      });
      if (!service || service.status !== 'ACTIVE')
        throw new ConflictException('Dịch vụ không mở bán');
      await this.schedule.assertAvailable(
        tx,
        booking.bookingDate,
        booking.scheduledEnd,
        booking.petId,
        booking.id,
      );
      const changed = await tx.booking.updateMany({
        where: { id: id(bookingId), status: 'PENDING' },
        data: { status: 'CONFIRMED', version: { increment: 1 } },
      });
      if (!changed.count)
        throw new ConflictException('Booking không còn ở trạng thái Pending');
      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          action: 'CONFIRM',
          actorId: actor.id,
          oldStatus: 'PENDING',
          newStatus: 'CONFIRMED',
        },
      });
      await this.audit(tx, actor, 'CONFIRM', booking.id, undefined, { oldStatus: 'PENDING', newStatus: 'CONFIRMED' });
      const result = await tx.booking.findUniqueOrThrow({ where: { id: bookingKey } });
      await this.record(tx, actor, key, 'CONFIRM', bookingKey, hash, result);
      return result;
    });
  }
  async cancel(bookingId: string, body: CancelDto, actor: Actor, key?: string) {
    return this.db.$transaction(async (tx) => {
      await this.schedule.lock(tx);
      const bookingKey = id(bookingId), hash = digest(JSON.stringify({ bookingId, reason: body.reason ?? null }));
      const replay = await this.replay(tx, actor, key, 'CANCEL', bookingKey, hash);
      if (replay) return replay;
      const previous = await tx.booking.findUnique({
        where: { id: bookingKey },
      });
      if (!previous || !['PENDING', 'CONFIRMED'].includes(previous.status))
        throw new ConflictException(
          'Booking không thể hủy ở trạng thái hiện tại',
        );
      const changed = await tx.booking.updateMany({
        where: { id: id(bookingId), status: { in: ['PENDING', 'CONFIRMED'] } },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: body.reason,
          cancellationType: 'STORE',
          cancelledBy: actor.id,
          version: { increment: 1 },
        },
      });
      if (!changed.count)
        throw new ConflictException(
          'Booking không thể hủy ở trạng thái hiện tại',
        );
      await tx.bookingEvent.create({
        data: {
          bookingId: previous.id,
          action: 'CANCEL',
          actorId: actor.id,
          oldStatus: previous.status,
          newStatus: 'CANCELLED',
          reason: body.reason,
        },
      });
      await this.audit(tx, actor, 'CANCEL', previous.id, body.reason, { oldStatus: previous.status, newStatus: 'CANCELLED' });
      const result = await tx.booking.findUniqueOrThrow({ where: { id: bookingKey } });
      await this.record(tx, actor, key, 'CANCEL', bookingKey, hash, result);
      return result;
    });
  }
  async reschedule(
    bookingId: string,
    startText: string,
    reason: string,
    actor: Actor,
    key?: string,
  ) {
    const start = new Date(startText);
    if (
      !/[zZ]|[+-]\d\d:\d\d$/.test(startText) ||
      Number.isNaN(start.getTime()) ||
      !reason?.trim() ||
      reason.length > 255
    )
      throw new BadRequestException(
        'Ngày giờ hoặc lý do dời lịch không hợp lệ',
      );
    return this.db.$transaction(async (tx) => {
      await this.schedule.lock(tx);
      const bookingKey = id(bookingId), hash = digest(JSON.stringify({ bookingId, start: start.toISOString(), reason: reason.trim() }));
      const replay = await this.replay(tx, actor, key, 'RESCHEDULE', bookingKey, hash);
      if (replay) return replay;
      if (start <= new Date() || start > addLocalDays(new Date(), 90))
        throw new BadRequestException('Chỉ được dời lịch trong 90 ngày tới');
      const booking = await tx.booking.findUnique({
        where: { id: bookingKey },
        include: { services: true },
      });
      if (
        !booking ||
        !['PENDING', 'CONFIRMED'].includes(booking.status) ||
        booking.services.length !== 1 ||
        !booking.services[0].durationMinutes
      )
        throw new ConflictException('Booking không thể dời');
      const end = new Date(
        start.getTime() + booking.services[0].durationMinutes * 60000,
      );
      if (booking.status === 'CONFIRMED')
        await this.schedule.assertAvailable(
          tx,
          start,
          end,
          booking.petId,
          booking.id,
        );
      else await this.schedule.assertWindow(tx, start, end);
      const changed = await tx.booking.updateMany({
        where: { id: booking.id, version: booking.version },
        data: {
          bookingDate: start,
          scheduledEnd: end,
          version: { increment: 1 },
        },
      });
      if (!changed.count)
        throw new ConflictException({
          code: 'VERSION_CONFLICT',
          message: 'Booking đã thay đổi',
        });
      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          action: 'RESCHEDULE',
          actorId: actor.id,
          oldStatus: booking.status,
          newStatus: booking.status,
          oldStart: booking.bookingDate,
          newStart: start,
          reason: reason.trim(),
        },
      });
      await this.audit(tx, actor, 'RESCHEDULE', booking.id, reason, { oldStart: booking.bookingDate.toISOString(), newStart: start.toISOString() });
      const result = await tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
      await this.record(tx, actor, key, 'RESCHEDULE', bookingKey, hash, result);
      return result;
    });
  }
  async noShow(bookingId: string, actor: Actor, key?: string) {
    return this.db.$transaction(async (tx) => {
      await this.schedule.lock(tx);
      const bookingKey = id(bookingId), hash = digest(JSON.stringify({ bookingId }));
      const replay = await this.replay(tx, actor, key, 'NO_SHOW', bookingKey, hash);
      if (replay) return replay;
      const booking = await tx.booking.findUnique({
        where: { id: bookingKey },
      });
      if (
        !booking ||
        booking.status !== 'CONFIRMED' ||
        !booking.scheduledEnd ||
        booking.scheduledEnd > new Date()
      )
        throw new ConflictException('Chưa thể ghi nhận không đến');
      const changed = await tx.booking.updateMany({
        where: { id: booking.id, status: 'CONFIRMED' },
        data: {
          status: 'CANCELLED',
          cancellationType: 'NO_SHOW',
          cancelledBy: actor.id,
          cancelledAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (!changed.count) throw new ConflictException('Booking đã thay đổi');
      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          action: 'NO_SHOW',
          actorId: actor.id,
          oldStatus: 'CONFIRMED',
          newStatus: 'CANCELLED',
        },
      });
      await this.audit(tx, actor, 'NO_SHOW', booking.id, undefined, { oldStatus: 'CONFIRMED', newStatus: 'CANCELLED' });
      const result = await tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
      await this.record(tx, actor, key, 'NO_SHOW', bookingKey, hash, result);
      return result;
    });
  }
  async complete(bookingId: string, body: CompleteDto, actor: Actor, key?: string) {
    if (
      !Array.isArray(body.surcharges) ||
      !Number.isInteger(body.discount) ||
      body.discount < 0
    )
      throw new BadRequestException('Dữ liệu chốt đơn không hợp lệ');
    return this.db.$transaction(async (tx) => {
      await this.schedule.lock(tx);
      const bookingKey = id(bookingId), hash = digest(JSON.stringify({ bookingId, discount: body.discount, surcharges: body.surcharges }));
      const replay = await this.replay(tx, actor, key, 'COMPLETE', bookingKey, hash);
      if (replay) return replay;
      const booking = await tx.booking.findUnique({
        where: { id: bookingKey },
        include: { services: true },
      });
      if (
        !booking ||
        booking.status !== 'CONFIRMED' ||
        booking.services.length !== 1
      )
        throw new ConflictException('Booking không thể hoàn thành');
      const bookingService = booking.services[0];
      const config = await tx.reminderConfig.findFirst({
        where: { serviceId: bookingService.serviceId, status: 'ACTIVE' },
      });
      if (!config)
        throw new ConflictException('Dịch vụ chưa có cấu hình nhắc nhở');
      const totalSurcharge = body.surcharges.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
      const base = Number(bookingService.basePrice);
      if (base + totalSurcharge > 9999999999)
        throw new BadRequestException('Tổng tiền vượt giới hạn hỗ trợ');
      if (body.discount > base + totalSurcharge)
        throw new BadRequestException('Giảm giá vượt quá tổng tiền');
      const now = new Date(),
        finalTotal = base + totalSurcharge - body.discount;
      const changed = await tx.booking.updateMany({
        where: { id: booking.id, status: 'CONFIRMED' },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          discountAmount: body.discount,
          finalTotal,
          version: { increment: 1 },
        },
      });
      if (!changed.count)
        throw new ConflictException('Booking đã đổi trạng thái');
      await tx.bookingService.update({
        where: { id: bookingService.id },
        data: { finalPrice: finalTotal },
      });
      if (body.surcharges.length)
        await tx.bookingSurcharge.createMany({
          data: body.surcharges.map((item) => ({
            bookingId: booking.id,
            bookingServiceId: bookingService.id,
            surchargeName: item.name.trim(),
            amount: item.amount,
            note: item.note,
          })),
        });
      const replaced = await tx.petReminder.findMany({
        where: {
          petId: booking.petId,
          serviceId: bookingService.serviceId,
          status: { in: ['PENDING', 'DUE'] },
        },
        select: { id: true },
      });
      const nextReminder = await tx.petReminder.create({
        data: {
          bookingId: booking.id,
          customerId: booking.customerId,
          petId: booking.petId,
          serviceId: bookingService.serviceId,
          completedDate: now,
          reminderDate: addLocalDays(now, config.reminderDays),
          status: 'PENDING',
        },
      });
      if (replaced.length) await tx.petReminder.updateMany({
        where: { id: { in: replaced.map((item) => item.id) }, status: { in: ['PENDING', 'DUE'] } },
        data: { status: 'DISMISSED', replacementReason: 'NEW_COMPLETION', replacedByReminderId: nextReminder.id },
      });
      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          action: 'COMPLETE',
          actorId: actor.id,
          oldStatus: 'CONFIRMED',
          newStatus: 'COMPLETED',
        },
      });
      await this.audit(tx, actor, 'COMPLETE', booking.id, undefined, { oldStatus: 'CONFIRMED', newStatus: 'COMPLETED', finalTotal });
      const result = await tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: { services: true, surcharges: true, reminders: true },
      });
      await this.record(tx, actor, key, 'COMPLETE', bookingKey, hash, result);
      return result;
    });
  }
  async adjust(
    bookingId: string,
    delta: number,
    reason: string,
    actor: Actor,
    requestKey: string,
    reversalRef?: string,
  ) {
    if (!requestKey || requestKey.length > 100)
      throw new BadRequestException('Idempotency-Key là bắt buộc');
    const requestHash = digest(
      JSON.stringify({
        bookingId,
        delta,
        reason: reason?.trim(),
        reversalRef: reversalRef ?? null,
      }),
    );
    if (
      !Number.isSafeInteger(delta) ||
      delta === 0 ||
      Math.abs(delta) > 9999999999 ||
      !reason?.trim() ||
      reason.length > 255
    )
      throw new BadRequestException('Điều chỉnh không hợp lệ');
    return this.db.$transaction(async (tx) => {
      await this.schedule.lock(tx);
      const previous = await tx.idempotencyRequest.findUnique({
        where: { userId_key: { userId: actor.id, key: requestKey } },
      });
      if (previous) {
        if (
          previous.operation !== 'ADJUST' ||
          previous.bookingId !== id(bookingId) ||
          previous.requestHash !== requestHash ||
          !previous.adjustmentId
        )
          throw new ConflictException(
            'Idempotency-Key đã dùng cho request khác',
          );
        const adjustment = await tx.bookingAdjustment.findUniqueOrThrow({
          where: { id: previous.adjustmentId },
        });
        return {
          adjustment,
          adjustedTotal: previous.resultTotal,
          replay: true,
        };
      }
      const booking = await tx.booking.findUnique({
        where: { id: id(bookingId) },
        include: { adjustments: true },
      });
      if (
        !booking ||
        booking.status !== 'COMPLETED' ||
        booking.finalTotal === null
      )
        throw new ConflictException('Booking chưa hoàn thành');
      const current =
        Number(booking.finalTotal) +
        booking.adjustments.reduce((sum, item) => sum + Number(item.delta), 0);
      if (current + delta < 0 || current + delta > 9999999999)
        throw new ConflictException({
          code: 'ADJUSTMENT_TOTAL_INVALID',
          message: 'Tổng sau điều chỉnh ngoài phạm vi',
        });
      if (reversalRef) {
        const original = booking.adjustments.find(
          (item) => item.id === id(reversalRef),
        );
        if (
          !original ||
          Number(original.delta) !== -delta ||
          booking.adjustments.some((item) => item.reversalRef === original.id)
        )
          throw new ConflictException('Bản bù không hợp lệ');
      }
      const adjustment = await tx.bookingAdjustment.create({
        data: {
          bookingId: booking.id,
          delta,
          reason: reason.trim(),
          createdBy: actor.id,
          reversalRef: reversalRef ? id(reversalRef) : null,
        },
      });
      await tx.idempotencyRequest.create({
        data: {
          userId: actor.id,
          key: requestKey,
          requestHash,
          bookingId: booking.id,
          operation: 'ADJUST',
          adjustmentId: adjustment.id,
          resultTotal: current + delta,
        },
      });
      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          action: 'ADJUST',
          actorId: actor.id,
          oldStatus: 'COMPLETED',
          newStatus: 'COMPLETED',
          reason: reason.trim(),
        },
      });
      await this.audit(tx, actor, 'ADJUST', booking.id, reason, { delta, adjustedTotal: current + delta });
      return {
        adjustment,
        originalTotal: booking.finalTotal,
        adjustedTotal: current + delta,
      };
    });
  }
  async dashboard() {
    const today = localDayStart(new Date()),
      tomorrow = addLocalDays(today, 1);
    const [pending, confirmedToday, remindersDue] = await Promise.all([
      this.db.booking.count({ where: { status: 'PENDING' } }),
      this.db.booking.count({
        where: {
          status: 'CONFIRMED',
          bookingDate: { gte: today, lt: tomorrow },
        },
      }),
      this.db.petReminder.count({
        where: {
          status: { in: ['PENDING', 'DUE'] },
          reminderDate: { lt: tomorrow },
        },
      }),
    ]);
    return { pending, confirmedToday, remindersDue, asOf: new Date() };
  }
}
