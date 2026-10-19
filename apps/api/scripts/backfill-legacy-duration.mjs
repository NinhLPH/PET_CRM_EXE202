import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const mappingPath = process.argv[2];
const apply = process.argv.includes('--apply');
if (!mappingPath || !process.env.DATABASE_URL)
  throw new Error(
    'Usage: node scripts/backfill-legacy-duration.mjs <reviewed mapping.json> [--apply]; DATABASE_URL required',
  );
const rows = JSON.parse(await readFile(mappingPath, 'utf8'));
if (!Array.isArray(rows) || !rows.length || rows.length > 1000)
  throw new Error('Mapping must contain 1–1000 rows');
const seen = new Set();
for (const row of rows) {
  if (
    !/^[1-9]\d*$/.test(row.bookingId) ||
    !Number.isInteger(row.durationMinutes) ||
    row.durationMinutes < 1 ||
    row.durationMinutes > 1440 ||
    typeof row.reason !== 'string' ||
    !row.reason.trim() ||
    row.reason.length > 255 ||
    seen.has(row.bookingId)
  )
    throw new Error('Invalid or duplicate mapping row');
  seen.add(row.bookingId);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
try {
  const plan = [];
  for (const row of rows) {
    const booking = await db.booking.findUnique({
      where: { id: BigInt(row.bookingId) },
      include: { services: { include: { service: true } } },
    });
    if (
      !booking ||
      booking.status !== 'CONFIRMED' ||
      booking.services.length !== 1
    )
      throw new Error(
        `Booking ${row.bookingId} is not a single-service CONFIRMED booking`,
      );
    const end = new Date(
      booking.bookingDate.getTime() + row.durationMinutes * 60000,
    );
    if (
      booking.scheduledEnd &&
      (booking.scheduledEnd.getTime() !== end.getTime() ||
        booking.services[0].durationMinutes !== row.durationMinutes)
    )
      throw new Error(
        `Booking ${row.bookingId} has a conflicting duration snapshot`,
      );
    plan.push({
      bookingId: row.bookingId,
      start: booking.bookingDate.toISOString(),
      end: end.toISOString(),
      durationMinutes: row.durationMinutes,
      currentServiceDuration: booking.services[0].service.estimatedDuration,
      alreadyApplied: Boolean(booking.scheduledEnd),
    });
  }
  console.log(JSON.stringify({ apply, plan }, null, 2));
  if (apply) {
    const phone = process.env.BACKFILL_ACTOR_PHONE;
    if (phone && !/^0\d{9}$/.test(phone))
      throw new Error('Invalid BACKFILL_ACTOR_PHONE');
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('pilot:schedule', 0))`;
        const matches = phone
          ? [await tx.user.findUnique({ where: { phone } })]
          : await tx.user.findMany({
              where: { role: 'ADMIN', status: 'ACTIVE' },
              take: 2,
            });
        if (
          matches.length !== 1 ||
          !matches[0] ||
          matches[0].role !== 'ADMIN' ||
          matches[0].status !== 'ACTIVE'
        )
          throw new Error(
            'Backfill actor must be one ACTIVE ADMIN; set BACKFILL_ACTOR_PHONE if needed',
          );
        const actor = matches[0];
        for (const row of rows) {
          const booking = await tx.booking.findUnique({
            where: { id: BigInt(row.bookingId) },
            include: { services: { include: { service: true } } },
          });
          if (
            !booking ||
            booking.status !== 'CONFIRMED' ||
            booking.services.length !== 1
          )
            throw new Error(`Booking ${row.bookingId} changed during backfill`);
          const end = new Date(
            booking.bookingDate.getTime() + row.durationMinutes * 60000,
          );
          if (booking.scheduledEnd) {
            if (
              booking.scheduledEnd.getTime() === end.getTime() &&
              booking.services[0].durationMinutes === row.durationMinutes
            )
              continue;
            throw new Error(
              `Booking ${row.bookingId} has a conflicting duration snapshot`,
            );
          }
          await tx.bookingService.update({
            where: { id: booking.services[0].id },
            data: {
              durationMinutes: row.durationMinutes,
              serviceNameSnapshot: booking.services[0].service.serviceName,
            },
          });
          await tx.booking.update({
            where: { id: booking.id },
            data: { scheduledEnd: end, version: { increment: 1 } },
          });
          await tx.bookingEvent.create({
            data: {
              bookingId: booking.id,
              action: 'BACKFILL',
              actorId: actor.id,
              oldStatus: 'CONFIRMED',
              newStatus: 'CONFIRMED',
              oldStart: booking.bookingDate,
              newStart: booking.bookingDate,
              reason: row.reason.trim(),
            },
          });
        }
      },
      { timeout: 30000 },
    );
    console.log('Backfill committed');
  }
} finally {
  await db.$disconnect();
  await pool.end();
}
