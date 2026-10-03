import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, addLocalDays, digest, id, localDayStart, page } from '../common/common';
import { CancelDto, CompleteDto, CreateBookingDto } from './dto/bookings.dto';

@Injectable()
export class BookingWorkflowService {
  constructor(private readonly db: PrismaService) {}

  private async bookingRecord(bookingId: string) {
    const booking = await this.db.booking.findUnique({
      where: { id: id(bookingId) },
      include: {
        customer: true,
        pet: true,
        services: { include: { service: true } },
        surcharges: true,
        reminders: true,
      },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    return booking;
  }
  async booking(bookingId: string, actor: Actor, admin = false) {
    const booking = await this.bookingRecord(bookingId);
    if (!admin && booking.customerId !== actor.customerId)
      throw new ForbiddenException();
    if (!admin && booking.status !== 'COMPLETED')
      return {
        ...booking,
        surcharges: [],
        discountAmount: undefined,
        finalTotal: undefined,
      };
    return booking;
  }
  async mine(actor: Actor, query: { page?: string; limit?: string }) {
    if (!actor.customerId) throw new NotFoundException('Hồ sơ không tồn tại');
    const p = page(query);
    const where = { customerId: actor.customerId };
    const [items, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        include: { pet: true, services: { include: { service: true } } },
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      this.db.booking.count({ where }),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }
  async create(actor: Actor, body: CreateBookingDto, requestKey: string) {
    if (!actor.customerId) throw new ForbiddenException();
    if (!requestKey || requestKey.length > 100)
      throw new BadRequestException('Idempotency-Key là bắt buộc');
    const date = new Date(body.bookingDate);
    if (
      Number.isNaN(date.getTime()) ||
      !/[zZ]|[+-]\d\d:\d\d$/.test(body.bookingDate) ||
      date <= new Date()
    )
      throw new BadRequestException(
        'Ngày giờ hẹn phải ở tương lai và có múi giờ',
      );
    const requestHash = digest(
      JSON.stringify({
        petId: body.petId,
        serviceId: body.serviceId,
        bookingDate: date.toISOString(),
        expectedBasePrice: body.expectedBasePrice,
        note: body.note ?? null,
      }),
    );
    const previous = await this.db.idempotencyRequest.findUnique({
      where: { userId_key: { userId: actor.id, key: requestKey } },
    });
    if (previous) {
      if (previous.requestHash !== requestHash)
        throw new ConflictException('Idempotency-Key đã dùng cho request khác');
      return this.bookingRecord(previous.bookingId.toString());
    }
    try {
      return await this.db.$transaction(async (tx) => {
        const pet = await tx.pet.findUnique({ where: { id: id(body.petId) } });
        if (!pet || pet.customerId !== actor.customerId)
          throw new ForbiddenException('Pet không thuộc tài khoản');
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`service:${body.serviceId}`}, 0))`;
        const service = await tx.service.findUnique({
          where: { id: id(body.serviceId) },
        });
        if (!service || service.status !== 'ACTIVE')
          throw new ConflictException('Dịch vụ không mở bán');
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${service.id}:${pet.species}`}, 0))`;
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
            customerId: actor.customerId!,
            petId: pet.id,
            bookingDate: date,
            status: 'PENDING',
            note: body.note,
            estimatedTotal: base,
            services: {
              create: {
                serviceId: service.id,
                servicePriceId: prices[0].id,
                petWeightSnapshot: pet.weight,
                basePrice: base,
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
        return booking;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const replay = await this.db.idempotencyRequest.findUnique({
          where: { userId_key: { userId: actor.id, key: requestKey } },
        });
        if (replay && replay.requestHash === requestHash)
          return this.bookingRecord(replay.bookingId.toString());
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
    page?: string;
    limit?: string;
  }) {
    const p = page(query);
    if (query.status && !Object.values(BookingStatus).includes(query.status))
      throw new BadRequestException('Trạng thái không hợp lệ');
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
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(range ? { bookingDate: range } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        include: {
          customer: true,
          pet: true,
          services: { include: { service: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      this.db.booking.count({ where }),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }
  async confirm(bookingId: string) {
    return this.db.$transaction(async (tx) => {
      const changed = await tx.booking.updateMany({
        where: { id: id(bookingId), status: 'PENDING' },
        data: { status: 'CONFIRMED' },
      });
      if (!changed.count)
        throw new ConflictException('Booking không còn ở trạng thái Pending');
      return tx.booking.findUniqueOrThrow({ where: { id: id(bookingId) } });
    });
  }
  async cancel(bookingId: string, body: CancelDto) {
    return this.db.$transaction(async (tx) => {
      const changed = await tx.booking.updateMany({
        where: { id: id(bookingId), status: { in: ['PENDING', 'CONFIRMED'] } },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: body.reason,
        },
      });
      if (!changed.count)
        throw new ConflictException(
          'Booking không thể hủy ở trạng thái hiện tại',
        );
      return tx.booking.findUniqueOrThrow({ where: { id: id(bookingId) } });
    });
  }
  async complete(bookingId: string, body: CompleteDto) {
    if (
      !Array.isArray(body.surcharges) ||
      !Number.isInteger(body.discount) ||
      body.discount < 0
    )
      throw new BadRequestException('Dữ liệu chốt đơn không hợp lệ');
    return this.db.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: id(bookingId) },
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
      await tx.petReminder.updateMany({
        where: {
          petId: booking.petId,
          serviceId: bookingService.serviceId,
          status: { in: ['PENDING', 'DUE'] },
        },
        data: { status: 'DISMISSED' },
      });
      await tx.petReminder.create({
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
      return tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: { services: true, surcharges: true, reminders: true },
      });
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
    return { pending, confirmedToday, remindersDue };
  }
}
