import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { addLocalDays, localDayStart } from '../common/common';

function bounds(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
    throw new BadRequestException('Khoảng ngày không hợp lệ');
  const start = new Date(`${from}T00:00:00+07:00`);
  const last = new Date(`${to}T00:00:00+07:00`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(last.getTime()) ||
    localDayStart(start).getTime() !== start.getTime() ||
    localDayStart(last).getTime() !== last.getTime() ||
    start > last ||
    last.getTime() - start.getTime() > 90 * 86400000
  )
    throw new BadRequestException('Khoảng ngày tối đa 90 ngày');
  return { gte: start, lt: addLocalDays(last, 1) };
}

function money(value: Prisma.Decimal | null | undefined) {
  if (!value) return 0;
  if (!value.isInteger() || !Number.isSafeInteger(value.toNumber()))
    throw new ConflictException('Tổng tiền vượt phạm vi số nguyên an toàn');
  return value.toNumber();
}

@Injectable()
export class ReportsService {
  constructor(private readonly db: PrismaService) {}

  async bookings(from: string, to: string) {
    const bookingDate = bounds(from, to);
    const asOf = new Date();
    return this.db.$transaction(
      async (tx) => {
        const [groups, noShow] = await Promise.all([
          tx.booking.groupBy({
            by: ['status'],
            where: { bookingDate },
            _count: { _all: true },
          }),
          tx.booking.count({
            where: {
              bookingDate,
              status: 'CANCELLED',
              cancellationType: 'NO_SHOW',
            },
          }),
        ]);
        const counts = Object.fromEntries(
          groups.map((group) => [group.status, group._count._all]),
        );
        const total = groups.reduce((sum, group) => sum + group._count._all, 0);
        const cancelled = counts.CANCELLED ?? 0;
        return {
          from,
          to,
          dateBasis: 'bookingDate',
          timeZone: 'Asia/Ho_Chi_Minh',
          asOf,
          total,
          pending: counts.PENDING ?? 0,
          confirmed: counts.CONFIRMED ?? 0,
          completed: counts.COMPLETED ?? 0,
          cancelled,
          noShow,
          cancellationRate: total ? cancelled / total : null,
          noShowRate: total ? noShow / total : null,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async value(from: string, to: string) {
    const period = bounds(from, to);
    const asOf = new Date();
    return this.db.$transaction(
      async (tx) => {
        const [completed, adjustments, recorded] = await Promise.all([
          tx.booking.aggregate({
            where: { status: 'COMPLETED', completedAt: period },
            _count: { _all: true },
            _sum: { finalTotal: true },
          }),
          tx.bookingAdjustment.aggregate({
            where: { booking: { status: 'COMPLETED', completedAt: period } },
            _sum: { delta: true },
          }),
          tx.bookingAdjustment.aggregate({
            where: { createdAt: period },
            _sum: { delta: true },
          }),
        ]);
        const originalTotal = money(completed._sum.finalTotal);
        const deltaTotal = money(adjustments._sum.delta);
        const adjustedTotal = originalTotal + deltaTotal;
        if (!Number.isSafeInteger(adjustedTotal))
          throw new ConflictException(
            'Tổng tiền vượt phạm vi số nguyên an toàn',
          );
        return {
          from,
          to,
          dateBasis: 'completedAt',
          timeZone: 'Asia/Ho_Chi_Minh',
          asOf,
          completedCount: completed._count._all,
          originalTotal,
          deltaTotal,
          adjustedTotal,
          adjustmentsRecordedInPeriod: money(recorded._sum.delta),
          meaning: 'Service value, not collected payments',
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async care(from: string, to: string, windowDays = 30) {
    const period = bounds(from, to);
    if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 90)
      throw new BadRequestException('Cửa sổ chuyển đổi phải từ 1 đến 90 ngày');
    const asOf = new Date();
    const lookback = new Date(period.gte.getTime() - windowDays * 86400000);
    const [reminders, bookings] = await this.db.$transaction(async (tx) => Promise.all([
      tx.petReminder.findMany({
        where: { status: 'CONTACTED', contactedAt: { gte: lookback, lt: period.lt } },
        select: { id: true, petId: true, serviceId: true, contactedAt: true },
        orderBy: [{ contactedAt: 'asc' }, { id: 'asc' }], take: 5001,
      }),
      tx.booking.findMany({
        where: { status: { not: 'CANCELLED' }, createdAt: { gte: lookback, lt: new Date(Math.min(period.lt.getTime() + windowDays * 86400000, asOf.getTime())) } },
        select: { id: true, petId: true, status: true, createdAt: true, services: { select: { serviceId: true } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 5001,
      }),
    ]), { isolationLevel: 'RepeatableRead' });
    if (reminders.length > 5000 || bookings.length > 5000)
      throw new ConflictException('Báo cáo vượt giới hạn 5.000 bản ghi; chọn khoảng ngày ngắn hơn');
    const used = new Set<bigint>();
    const converted = new Map<bigint, string>();
    for (const booking of bookings) {
      const candidates = reminders.filter((reminder) =>
        reminder.petId === booking.petId &&
        booking.services.some((service) => service.serviceId === reminder.serviceId) &&
        reminder.contactedAt && booking.createdAt > reminder.contactedAt &&
        booking.createdAt.getTime() <= reminder.contactedAt.getTime() + windowDays * 86400000 &&
        !used.has(reminder.id),
      ).sort((a, b) => b.contactedAt!.getTime() - a.contactedAt!.getTime() || (a.id > b.id ? -1 : 1));
      const chosen = candidates[0];
      if (chosen) { used.add(chosen.id); converted.set(chosen.id, booking.status); }
    }
    const cohort = reminders.filter((item) => item.contactedAt && item.contactedAt >= period.gte && item.contactedAt < period.lt);
    const matured = cohort.filter((item) => item.contactedAt!.getTime() + windowDays * 86400000 <= asOf.getTime());
    const counts = (items: typeof cohort) => ({
      created: items.filter((item) => converted.has(item.id)).length,
      confirmed: items.filter((item) => ['CONFIRMED', 'COMPLETED'].includes(converted.get(item.id) ?? '')).length,
      completed: items.filter((item) => converted.get(item.id) === 'COMPLETED').length,
    });
    const observed = counts(cohort), mature = counts(matured);
    return {
      from, to, windowDays, dateBasis: 'contactedAt', timeZone: 'Asia/Ho_Chi_Minh', asOf,
      contacted: cohort.length, matured: matured.length, immature: cohort.length - matured.length,
      observed, mature,
      rates: {
        created: matured.length ? mature.created / matured.length : null,
        confirmed: matured.length ? mature.confirmed / matured.length : null,
        completed: matured.length ? mature.completed / matured.length : null,
      },
      meaning: 'Observed rebooking after contact; not proof of causation',
    };
  }
}
