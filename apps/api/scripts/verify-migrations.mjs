import 'dotenv/config';
import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const schema = `petcare_verify_${randomBytes(4).toString('hex')}`;
const baseline = await readFile(
  new URL(
    '../prisma/migrations/20261001080000_baseline/migration.sql',
    import.meta.url,
  ),
  'utf8',
);
const upgrade = await readFile(
  new URL(
    '../prisma/migrations/20261002120000_api_v1/migration.sql',
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
  await client.query(baseline.replaceAll('"public"', `"${schema}"`));
  await client.query(upgrade);
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
  console.log(
    'Baseline and upgrade migration SQL executed successfully in a rolled-back isolated schema',
  );
} finally {
  await client.query('ROLLBACK');
  await client.end();
}
