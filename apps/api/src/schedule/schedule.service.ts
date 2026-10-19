import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, addLocalDays, localDayStart } from '../common/common';

export type Interval = { start: string; end: string };
type Rule = { intervals: Interval[]; capacity: number; slotStep: number };

function minute(value: string): number {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw new BadRequestException('Giờ phải theo HH:mm');
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}

export function validateRule(rule: Rule) {
  if (
    !Number.isInteger(rule.capacity) ||
    rule.capacity < 1 ||
    !Number.isInteger(rule.slotStep) ||
    rule.slotStep < 1 ||
    rule.slotStep > 1440 ||
    !Array.isArray(rule.intervals) ||
    rule.intervals.length > 8
  )
    throw new BadRequestException('Cấu hình lịch không hợp lệ');
  let end = 0;
  for (const interval of rule.intervals) {
    if (!interval || typeof interval !== 'object')
      throw new BadRequestException('Khoảng giờ không hợp lệ');
    const start = minute(interval.start),
      next = minute(interval.end);
    if (start >= next || start < end)
      throw new BadRequestException('Khoảng giờ trùng hoặc đảo');
    end = next;
  }
}

export function fitsConfirmed(
  rule: Rule,
  bookings: { id: bigint; bookingDate: Date; scheduledEnd: Date | null }[],
) {
  for (const booking of bookings) {
    if (!booking.scheduledEnd) return false;
    const day = localDayStart(booking.bookingDate).getTime();
    const from = (booking.bookingDate.getTime() - day) / 60000;
    const to = (booking.scheduledEnd.getTime() - day) / 60000;
    if (
      !rule.intervals.some(
        (i) => from >= minute(i.start) && to <= minute(i.end) &&
          (from - minute(i.start)) % rule.slotStep === 0,
      )
    )
      return false;
  }
  const points = bookings
    .flatMap((booking) => [
      { time: booking.bookingDate.getTime(), delta: 1 },
      { time: booking.scheduledEnd!.getTime(), delta: -1 },
    ])
    .sort((a, b) => a.time - b.time || a.delta - b.delta);
  let count = 0;
  for (const point of points) {
    count += point.delta;
    if (count > rule.capacity) return false;
  }
  return true;
}

function localDate(date: Date) {
  return new Date(localDayStart(date).getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
}

@Injectable()
export class ScheduleService {
  constructor(private readonly db: PrismaService) {}

  async lock(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('pilot:schedule', 0))`;
  }

  async rule(
    tx: Prisma.TransactionClient | PrismaService,
    start: Date,
  ): Promise<Rule | null> {
    const day = localDayStart(start);
    const exception = await tx.dateException.findUnique({
      where: { localDate: new Date(`${localDate(start)}T00:00:00.000Z`) },
    });
    if (exception)
      return {
        intervals: exception.intervals as Interval[],
        capacity: exception.capacity,
        slotStep: exception.slotStep,
      };
    const weekday = new Date(day.getTime() + 7 * 60 * 60 * 1000).getUTCDay();
    const weekly = await tx.workingSchedule.findUnique({ where: { weekday } });
    return weekly
      ? {
          intervals: weekly.intervals as Interval[],
          capacity: weekly.capacity,
          slotStep: weekly.slotStep,
        }
      : null;
  }

  async assertAvailable(
    tx: Prisma.TransactionClient,
    start: Date,
    end: Date,
    petId: bigint,
    exclude?: bigint,
  ) {
    const rule = await this.assertWindow(tx, start, end);
    if (
      await tx.booking.count({
        where: {
          status: 'CONFIRMED',
          scheduledEnd: null,
          bookingDate: {
            gte: localDayStart(start),
            lt: addLocalDays(localDayStart(start), 1),
          },
        },
      })
    )
      throw new ConflictException({
        code: 'LEGACY_BOOKING_UNRESOLVED',
        message: 'Ngày này có lịch cũ chưa có thời lượng',
      });
    const occupied = await tx.booking.findMany({
      where: {
        status: 'CONFIRMED',
        bookingDate: { lt: end },
        scheduledEnd: { gt: start },
        ...(exclude ? { id: { not: exclude } } : {}),
      },
      select: { petId: true, bookingDate: true, scheduledEnd: true },
    });
    if (occupied.some((item) => item.petId === petId))
      throw new ConflictException({
        code: 'PET_TIME_CONFLICT',
        message: 'Pet đã có lịch trùng',
      });
    const points = [
      { time: start.getTime(), delta: 1 },
      { time: end.getTime(), delta: -1 },
    ];
    for (const item of occupied) {
      points.push({
        time: Math.max(start.getTime(), item.bookingDate.getTime()),
        delta: 1,
      });
      points.push({
        time: Math.min(end.getTime(), item.scheduledEnd!.getTime()),
        delta: -1,
      });
    }
    points.sort((a, b) => a.time - b.time || a.delta - b.delta);
    let count = 0;
    for (const point of points) {
      count += point.delta;
      if (count > rule.capacity)
        throw new ConflictException({
          code: 'CAPACITY_FULL',
          message: 'Khung giờ đã đủ công suất',
        });
    }
  }

  async assertWindow(tx: Prisma.TransactionClient, start: Date, end: Date) {
    const rule = await this.rule(tx, start);
    if (!rule || !rule.intervals.length)
      throw new ConflictException({
        code: 'SCHEDULE_CLOSED',
        message: 'Cửa hàng không mở trong ngày này',
      });
    const day = localDayStart(start),
      offset = day.getTime();
    const from = (start.getTime() - offset) / 60000;
    const to = (end.getTime() - offset) / 60000;
    if (
      !rule.intervals.some(
        (i) =>
          from >= minute(i.start) &&
          to <= minute(i.end) &&
          (from - minute(i.start)) % rule.slotStep === 0,
      )
    )
      throw new ConflictException({
        code: 'OUTSIDE_WORKING_HOURS',
        message: 'Giờ hẹn nằm ngoài giờ làm việc',
      });
    return rule;
  }

  async availability(serviceId: bigint, date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new BadRequestException('Ngày không hợp lệ');
    const day = new Date(`${date}T00:00:00+07:00`);
    if (Number.isNaN(day.getTime()) || localDate(day) !== date)
      throw new BadRequestException('Ngày không hợp lệ');
    if (day < localDayStart(new Date()) || day > addLocalDays(new Date(), 90))
      throw new BadRequestException('Ngày ngoài phạm vi 90 ngày');
    const service = await this.db.service.findUnique({
      where: { id: serviceId },
    });
    if (
      !service ||
      service.status !== 'ACTIVE' ||
      !service.estimatedDuration ||
      service.estimatedDuration < 1
    )
      throw new ConflictException('Dịch vụ chưa sẵn sàng');
    const rule = await this.rule(this.db, day);
    if (!rule) return { date, slots: [] };
    const unresolved = await this.db.booking.count({
      where: {
        status: 'CONFIRMED',
        scheduledEnd: null,
        bookingDate: { gte: day, lt: addLocalDays(day, 1) },
      },
    });
    if (unresolved)
      return {
        date,
        slots: [],
        unavailableReason: 'LEGACY_BOOKING_UNRESOLVED',
      };
    const slots: { start: Date; end: Date; available: boolean }[] = [];
    for (const interval of rule.intervals) {
      for (
        let value = minute(interval.start);
        value + service.estimatedDuration <= minute(interval.end);
        value += rule.slotStep
      ) {
        const start = new Date(day.getTime() + value * 60000);
        const end = new Date(
          start.getTime() + service.estimatedDuration * 60000,
        );
        const occupied = await this.db.booking.findMany({
          where: {
            status: 'CONFIRMED',
            bookingDate: { lt: end },
            scheduledEnd: { gt: start },
          },
          select: { bookingDate: true, scheduledEnd: true },
        });
        const points = [
          { time: start.getTime(), delta: 1 },
          { time: end.getTime(), delta: -1 },
        ];
        for (const item of occupied) {
          points.push({
            time: Math.max(start.getTime(), item.bookingDate.getTime()),
            delta: 1,
          });
          points.push({
            time: Math.min(end.getTime(), item.scheduledEnd!.getTime()),
            delta: -1,
          });
        }
        points.sort((a, b) => a.time - b.time || a.delta - b.delta);
        let count = 0,
          available = start > new Date();
        for (const point of points) {
          count += point.delta;
          if (count > rule.capacity) available = false;
        }
        slots.push({ start, end, available });
      }
    }
    return { date, slots };
  }

  async saveWeekly(weekday: number, rule: Rule, actor?: Actor) {
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)
      throw new BadRequestException('Thứ không hợp lệ');
    validateRule(rule);
    return this.db.$transaction(async (tx) => {
      await this.lock(tx);
      const current = await tx.workingSchedule.findUnique({
        where: { weekday },
      });
      const existing = await tx.booking.findMany({
        where: { status: 'CONFIRMED', bookingDate: { gte: new Date() } },
        select: { id: true, bookingDate: true, scheduledEnd: true },
      });
      const dates = new Map<string, typeof existing>();
      for (const booking of existing) {
        const date = localDate(booking.bookingDate);
        if (
          new Date(booking.bookingDate.getTime() + 7 * 3600000).getUTCDay() !==
          weekday
        )
          continue;
        const group = dates.get(date) ?? [];
        group.push(booking);
        dates.set(date, group);
      }
      for (const [date, bookings] of dates) {
        const exception = await tx.dateException.findUnique({
          where: { localDate: new Date(`${date}T00:00:00.000Z`) },
        });
        if (exception) continue;
        if (!fitsConfirmed(rule, bookings))
          throw new ConflictException({
            code: 'SCHEDULE_HAS_CONFIRMED',
            message: 'Cấu hình ảnh hưởng lịch đã xác nhận',
            bookingIds: bookings.map((b) => b.id.toString()),
          });
      }
      const saved = current
        ? tx.workingSchedule.update({
            where: { weekday },
            data: { ...rule, version: { increment: 1 } },
          })
        : tx.workingSchedule.create({ data: { weekday, ...rule } });
      const result = await saved;
      if (actor) await tx.auditEvent.create({ data: {
        actorId: actor.id, action: 'SAVE_WEEKLY_SCHEDULE', objectType: 'WORKING_SCHEDULE',
        objectId: String(weekday), change: { previousVersion: current?.version ?? null, newVersion: result.version },
      } });
      return result;
    });
  }

  async weekly() {
    return this.db.workingSchedule.findMany({ orderBy: { weekday: 'asc' } });
  }

  async exceptions(from: string, to: string) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
      Number.isNaN(Date.parse(`${from}T00:00:00+07:00`)) ||
      Number.isNaN(Date.parse(`${to}T00:00:00+07:00`))
    )
      throw new BadRequestException('Khoảng ngày không hợp lệ');
    const first = new Date(`${from}T00:00:00.000Z`);
    const last = new Date(`${to}T00:00:00.000Z`);
    if (first > last || last.getTime() - first.getTime() > 90 * 86400000)
      throw new BadRequestException('Khoảng ngày tối đa 90 ngày');
    return this.db.dateException.findMany({
      where: { localDate: { gte: first, lte: last } },
      orderBy: { localDate: 'asc' },
    });
  }

  async saveException(date: string, rule: Rule, actor?: Actor) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(new Date(`${date}T00:00:00+07:00`).getTime()) ||
      localDate(new Date(`${date}T00:00:00+07:00`)) !== date
    )
      throw new BadRequestException('Ngày không hợp lệ');
    validateRule(rule);
    const start = new Date(`${date}T00:00:00+07:00`);
    const end = addLocalDays(start, 1);
    return this.db.$transaction(async (tx) => {
      await this.lock(tx);
      const affected = await tx.booking.findMany({
        where: { status: 'CONFIRMED', bookingDate: { gte: start, lt: end } },
        select: { id: true, bookingDate: true, scheduledEnd: true },
      });
      if (!fitsConfirmed(rule, affected))
        throw new ConflictException({
          code: 'SCHEDULE_HAS_CONFIRMED',
          message: 'Cấu hình ảnh hưởng lịch đã xác nhận',
          bookingIds: affected.map((booking) => booking.id.toString()),
        });
      const localDate = new Date(`${date}T00:00:00.000Z`);
      const result = await tx.dateException.upsert({
        where: { localDate },
        create: { localDate, ...rule },
        update: rule,
      });
      if (actor) await tx.auditEvent.create({ data: {
        actorId: actor.id, action: 'SAVE_DATE_EXCEPTION', objectType: 'DATE_EXCEPTION',
        objectId: date, change: { intervals: rule.intervals.length, capacity: rule.capacity, slotStep: rule.slotStep },
      } });
      return result;
    });
  }

  async deleteException(date: string, actor: Actor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00+07:00`).getTime()))
      throw new BadRequestException('Ngày không hợp lệ');
    const start = new Date(`${date}T00:00:00+07:00`);
    if (localDate(start) !== date) throw new BadRequestException('Ngày không hợp lệ');
    return this.db.$transaction(async (tx) => {
      await this.lock(tx);
      const localDate = new Date(`${date}T00:00:00.000Z`);
      const existing = await tx.dateException.findUnique({ where: { localDate } });
      if (!existing) return { deleted: false };
      const weekday = new Date(start.getTime() + 7 * 3600000).getUTCDay();
      const weekly = await tx.workingSchedule.findUnique({ where: { weekday } });
      const bookings = await tx.booking.findMany({
        where: { status: 'CONFIRMED', bookingDate: { gte: start, lt: addLocalDays(start, 1) } },
        select: { id: true, bookingDate: true, scheduledEnd: true },
      });
      const rule = weekly ? { intervals: weekly.intervals as Interval[], capacity: weekly.capacity, slotStep: weekly.slotStep } : null;
      if (bookings.length && (!rule || !fitsConfirmed(rule, bookings)))
        throw new ConflictException({ code: 'SCHEDULE_HAS_CONFIRMED', message: 'Cấu hình ảnh hưởng lịch đã xác nhận', bookingIds: bookings.map((b) => b.id.toString()) });
      await tx.dateException.delete({ where: { localDate } });
      await tx.auditEvent.create({ data: {
        actorId: actor.id, action: 'DELETE_DATE_EXCEPTION', objectType: 'DATE_EXCEPTION', objectId: date,
      } });
      return { deleted: true };
    });
  }
}
