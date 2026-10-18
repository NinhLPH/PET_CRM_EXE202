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
  console.log(
    'Baseline and v1 invariants executed successfully in a rolled-back isolated schema',
  );
} finally {
  await client.query('ROLLBACK');
  await client.end();
}
