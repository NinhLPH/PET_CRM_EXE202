import 'dotenv/config';
import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const schema = `petcare_verify_${randomBytes(4).toString('hex')}`;
const baseline = await readFile(
  new URL(
    '../prisma/migrations/20261018000000_v1_current_baseline/migration.sql',
    import.meta.url,
  ),
  'utf8',
);
const invariants = await readFile(
  new URL(
    '../prisma/migrations/20261018000100_v1_invariants/migration.sql',
    import.meta.url,
  ),
  'utf8',
);
const v2 = await readFile(
  new URL('../prisma/migrations/20261019000100_v2_booking_schedule/migration.sql', import.meta.url),
  'utf8',
);
const operations = await readFile(
  new URL('../prisma/migrations/20261019000200_v2_operations_audit/migration.sql', import.meta.url),
  'utf8',
);
const sessions = await readFile(
  new URL('../prisma/migrations/20261019000300_v2_session_policy/migration.sql', import.meta.url),
  'utf8',
);
const resources = await readFile(
  new URL('../prisma/migrations/20261019000400_v2_resource_operations/migration.sql', import.meta.url),
  'utf8',
);
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET LOCAL search_path TO "${schema}"`);
  await client.query(baseline);
  // The deploy migration has its own BEGIN/COMMIT. Omit those wrappers here so
  // the entire verification remains inside the outer rollback transaction.
  await client.query(
    invariants
      .split(/\r?\n/)
      .filter((line) => !/^\s*(BEGIN|COMMIT);\s*$/i.test(line))
      .join('\n'),
  );
  await client.query(v2);
  await client.query(operations);
  await client.query(sessions);
  await client.query(resources);
  const columns = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'users' AND column_name = 'user_id'`,
    [schema],
  );
  if (columns.rows[0]?.data_type !== 'bigint')
    throw new Error('users.user_id was not upgraded to BIGINT');
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name IN ('user_sessions', 'idempotency_requests')`,
    [schema],
  );
  if (tables.rowCount !== 2)
    throw new Error('Session or idempotency table is missing');
  const constraints = await client.query(
    `SELECT con.conname FROM pg_constraint con JOIN pg_namespace ns ON ns.oid = con.connamespace WHERE ns.nspname = $1 AND con.conname IN ('reminder_days_v1_check', 'pets_weight_v1_check', 'service_prices_range_v1_check', 'service_prices_money_v1_check', 'surcharges_money_v1_check', 'bookings_discount_v1_check')`,
    [schema],
  );
  if (constraints.rowCount !== 6)
    throw new Error('One or more v1 check constraints are missing');
  const indexes = await client.query(
    `SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND indexname IN ('bookings_one_active_pet_slot_idx', 'reminder_configs_one_active_service_idx', 'services_one_active_name_idx')`,
    [schema],
  );
  if (indexes.rowCount !== 3)
    throw new Error('One or more v1 partial unique indexes are missing');
  const v2Tables = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name IN ('working_schedules', 'date_exceptions', 'booking_adjustments', 'booking_events', 'identity_evidence')`,
    [schema],
  );
  if (v2Tables.rowCount !== 5)
    throw new Error('One or more v2 tables are missing');
  const v2Columns = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'bookings' AND column_name IN ('scheduled_end', 'source', 'version', 'cancellation_type')`,
    [schema],
  );
  if (v2Columns.rowCount !== 4)
    throw new Error('One or more v2 booking columns are missing');
  const operationTables = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name IN ('audit_events', 'request_rate_limits')`,
    [schema],
  );
  if (operationTables.rowCount !== 2)
    throw new Error('Audit or shared rate-limit table is missing');
  const idleColumn = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'user_sessions' AND column_name = 'last_seen_at'`,
    [schema],
  );
  if (idleColumn.rowCount !== 1) throw new Error('Session idle column is missing');
  const resourceTable = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'resource_operations'`,
    [schema],
  );
  if (resourceTable.rowCount !== 1) throw new Error('Resource operation table is missing');
  console.log(
    'Baseline, v1 invariants and all v2 migrations executed successfully in a rolled-back isolated schema',
  );
} finally {
  await client.query('ROLLBACK');
  await client.end();
}
