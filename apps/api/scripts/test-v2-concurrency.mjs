import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { Client, Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import scheduleCode from '../dist/schedule/schedule.service.js';
import bookingCode from '../dist/bookings/bookings.service.js';
import resourceCode from '../dist/common/resource-operation.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const schema = `petcare_concurrency_${randomBytes(6).toString('hex')}`;
const admin = new Client({ connectionString: process.env.DATABASE_URL });
const { ScheduleService } = scheduleCode;
const { BookingWorkflowService } = bookingCode;
const { runResourceOperation } = resourceCode;
const scripts = [
  '../prisma/migrations/20261018000000_v1_current_baseline/migration.sql',
  '../prisma/migrations/20261018000100_v1_invariants/migration.sql',
  '../prisma/migrations/20261019000100_v2_booking_schedule/migration.sql',
  '../prisma/migrations/20261019000200_v2_operations_audit/migration.sql',
  '../prisma/migrations/20261019000300_v2_session_policy/migration.sql',
  '../prisma/migrations/20261019000400_v2_resource_operations/migration.sql',
];
await admin.connect();
let pool;
let db;
try {
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.query(`SET search_path TO "${schema}"`);
  for (const file of scripts) {
    const sql = await readFile(new URL(file, import.meta.url), 'utf8');
    await admin.query(sql.split(/\r?\n/).filter((line) => !/^\s*(BEGIN|COMMIT);\s*$/i.test(line)).join('\n'));
  }
  pool = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}`, max: 5 });
  const check = await pool.query('SELECT current_schema() AS name');
  if (check.rows[0]?.name !== schema) throw new Error('Test pool did not enter isolated schema');
  db = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  const schedule = new ScheduleService(db);
  for (const weekday of [1, 2]) await db.workingSchedule.create({
    data: { weekday, intervals: [{ start: '08:00', end: '12:00' }], capacity: weekday === 1 ? 1 : 2, slotStep: 30 },
  });
  const customer = await db.customer.create({ data: { fullName: 'Concurrency Test', phone: '0900000000' } });
  const pets = await Promise.all([1, 2].map((n) => db.pet.create({
    data: { customerId: customer.id, name: `Test ${n}`, species: 'DOG', weight: 5 },
  })));
  async function compete(startText, petIds) {
    const start = new Date(startText), end = new Date(start.getTime() + 60 * 60000);
    const attempts = await Promise.allSettled(petIds.map((petId) => db.$transaction(async (tx) => {
      await schedule.lock(tx);
      await schedule.assertAvailable(tx, start, end, petId);
      return tx.booking.create({ data: { customerId: customer.id, petId, bookingDate: start, scheduledEnd: end, status: 'CONFIRMED' } });
    }, { timeout: 15000 })));
    return { successes: attempts.filter((x) => x.status === 'fulfilled').length, failures: attempts.filter((x) => x.status === 'rejected').length };
  }
  const capacity = await compete('2026-11-02T09:00:00+07:00', pets.map((p) => p.id));
  if (capacity.successes !== 1 || capacity.failures !== 1) throw new Error(`Capacity race failed: ${JSON.stringify(capacity)}`);
  const petConflict = await compete('2026-11-03T09:00:00+07:00', [pets[0].id, pets[0].id]);
  if (petConflict.successes !== 1 || petConflict.failures !== 1) throw new Error(`Pet race failed: ${JSON.stringify(petConflict)}`);
  const adminUser = await db.user.create({ data: { phone: '0900000001', passwordHash: 'test-only', role: 'ADMIN' } });
  const actor = { id: adminUser.id, role: 'ADMIN', sessionId: 1n };
  const resourceRetries = await Promise.all([1, 2].map(() => runResourceOperation(
    db, actor.id, 'same-pet-key', 'CREATE_PET', { customerId: customer.id.toString(), name: 'Retry Pet' },
    (tx) => tx.pet.create({ data: { customerId: customer.id, name: 'Retry Pet', species: 'DOG', weight: 5 } }),
  )));
  if (resourceRetries[0].id.toString() !== resourceRetries[1].id.toString() ||
      await db.pet.count({ where: { customerId: customer.id, name: 'Retry Pet' } }) !== 1)
    throw new Error('Resource idempotency race created duplicate pet');
  const service = await db.service.create({ data: { serviceName: 'Concurrency Care', estimatedDuration: 60, status: 'ACTIVE' } });
  const price = await db.servicePrice.create({ data: { serviceId: service.id, species: 'DOG', minWeight: 0, price: 250000 } });
  await db.reminderConfig.create({ data: { serviceId: service.id, reminderDays: 60, status: 'ACTIVE' } });
  async function completedCandidate(startText) {
    const start = new Date(startText);
    return db.booking.create({ data: {
      customerId: customer.id, petId: pets[0].id, bookingDate: start,
      scheduledEnd: new Date(start.getTime() + 3600000), status: 'CONFIRMED',
      services: { create: { serviceId: service.id, servicePriceId: price.id, petWeightSnapshot: 5, basePrice: 250000, durationMinutes: 60, serviceNameSnapshot: service.serviceName } },
    } });
  }
  const workflow = new BookingWorkflowService(db, schedule);
  const first = await completedCandidate('2026-11-04T09:00:00+07:00');
  const second = await completedCandidate('2026-11-05T09:00:00+07:00');
  const completion = await Promise.allSettled([first, second].map((booking) => workflow.complete(booking.id.toString(), { surcharges: [], discount: 0 }, actor)));
  if (completion.some((item) => item.status !== 'fulfilled')) throw new Error('Concurrent completion failed');
  const reminderRows = await db.petReminder.findMany({ where: { petId: pets[0].id, serviceId: service.id } });
  if (reminderRows.filter((item) => item.status === 'PENDING').length !== 1 || reminderRows.filter((item) => item.status === 'DISMISSED').length !== 1)
    throw new Error('Concurrent completion left incorrect reminder state');
  const third = await completedCandidate('2026-11-06T09:00:00+07:00');
  const transition = await Promise.allSettled([
    workflow.complete(third.id.toString(), { surcharges: [], discount: 0 }, actor),
    workflow.cancel(third.id.toString(), { reason: 'Test race' }, actor),
  ]);
  if (transition.filter((item) => item.status === 'fulfilled').length !== 1) throw new Error('Cancel/complete race did not choose one terminal state');
  const terminal = await db.booking.findUniqueOrThrow({ where: { id: third.id } });
  if (!['COMPLETED', 'CANCELLED'].includes(terminal.status)) throw new Error('Unexpected terminal state');
  console.log(JSON.stringify({ isolatedSchema: schema, capacity, petConflict, resourceRetry: { petCount: 1 }, completion: { successes: 2, activeReminders: 1 }, terminalRace: terminal.status, status: 'passed' }));
} finally {
  if (db) await db.$disconnect();
  if (pool) await pool.end();
  await admin.query('SET search_path TO public');
  if (/^petcare_concurrency_[0-9a-f]{12}$/.test(schema))
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
}
