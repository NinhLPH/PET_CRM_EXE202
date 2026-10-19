import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
try {
  const [admins, operators, schedules, unresolved] = await Promise.all([
    db.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } }),
    db.user.count({
      where: { role: 'ADMIN', status: 'ACTIVE', canVerifyIdentity: true },
    }),
    db.workingSchedule.findMany({
      select: {
        weekday: true,
        capacity: true,
        slotStep: true,
        intervals: true,
      },
      orderBy: { weekday: 'asc' },
    }),
    db.booking.findMany({
      where: { status: 'CONFIRMED', scheduledEnd: null },
      select: {
        id: true,
        bookingDate: true,
        services: {
          select: {
            id: true,
            durationMinutes: true,
            service: { select: { estimatedDuration: true } },
          },
        },
      },
      orderBy: { bookingDate: 'asc' },
      take: 100,
    }),
  ]);
  const unresolvedCount = await db.booking.count({
    where: { status: 'CONFIRMED', scheduledEnd: null },
  });
  console.log(
    JSON.stringify(
      {
        activeAdminCount: admins,
        identityOperatorCount: operators,
        schedules,
        unresolvedConfirmedCount: unresolvedCount,
        unresolvedConfirmedSample: unresolved.map((booking) => ({
          bookingId: booking.id.toString(),
          bookingDate: booking.bookingDate.toISOString(),
          bookingServiceCount: booking.services.length,
          currentServiceDuration:
            booking.services[0]?.service.estimatedDuration ?? null,
          durationSnapshot: booking.services[0]?.durationMinutes ?? null,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  await db.$disconnect();
  await pool.end();
}
