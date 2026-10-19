import 'dotenv/config';
import scheduleCode from '../dist/schedule/schedule.service.js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const { fitsConfirmed } = scheduleCode;
const apply = process.argv.includes('--apply');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const open = {
  intervals: [
    { start: '08:00', end: '12:00' },
    { start: '13:00', end: '17:00' },
  ],
  capacity: 2,
  slotStep: 30,
};
const rules = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  ...(weekday === 0 ? { intervals: [], capacity: 2, slotStep: 30 } : open),
}));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
try {
  const existing = await db.workingSchedule.findMany();
  const matches = (left, right) =>
    JSON.stringify(left.intervals.map(({ start, end }) => [start, end])) ===
      JSON.stringify(right.intervals.map(({ start, end }) => [start, end])) &&
    left.capacity === right.capacity &&
    left.slotStep === right.slotStep;
  if (existing.some((rule) => !matches(rule, rules[rule.weekday])))
    throw new Error(
      'Existing schedule differs from pilot proposal; refusing overwrite',
    );
  async function verifyFuture(client) {
    const confirmed = await client.booking.findMany({
      where: { status: 'CONFIRMED', bookingDate: { gte: new Date() } },
      select: { id: true, bookingDate: true, scheduledEnd: true },
    });
    const groups = new Map();
    for (const booking of confirmed) {
      const date = new Date(booking.bookingDate.getTime() + 7 * 3600000)
        .toISOString()
        .slice(0, 10);
      const items = groups.get(date) ?? [];
      items.push(booking);
      groups.set(date, items);
    }
    for (const [date, bookings] of groups) {
      if (
        await client.dateException.findUnique({
          where: { localDate: new Date(`${date}T00:00:00.000Z`) },
        })
      )
        continue;
      const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
      if (!fitsConfirmed(rules[weekday], bookings))
        throw new Error(
          `Pilot schedule conflicts with CONFIRMED bookings on ${date}: ${bookings.map((b) => b.id).join(',')}`,
        );
    }
    return [...groups.keys()];
  }
  const compatibleFutureDates = await verifyFuture(db);
  console.log(
    JSON.stringify(
      {
        apply,
        rules,
        compatibleFutureDates,
        existingRuleCount: existing.length,
      },
      null,
      2,
    ),
  );
  if (apply) {
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('pilot:schedule', 0))`;
        const current = await tx.workingSchedule.findMany();
        if (current.some((rule) => !matches(rule, rules[rule.weekday])))
          throw new Error('Schedule changed during apply');
        await verifyFuture(tx);
        const remaining = rules.filter(
          (rule) => !current.some((item) => item.weekday === rule.weekday),
        );
        if (remaining.length)
          await tx.workingSchedule.createMany({ data: remaining });
      },
      { timeout: 30000 },
    );
    console.log('Pilot schedule committed');
  }
} finally {
  await db.$disconnect();
  await pool.end();
}
