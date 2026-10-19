import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const phone = process.env.IDENTITY_OPERATOR_PHONE;
if ((phone && !/^0\d{9}$/.test(phone)) || !process.env.DATABASE_URL)
  throw new Error('Set DATABASE_URL and optionally a valid IDENTITY_OPERATOR_PHONE');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
try {
  const matches = phone
    ? [await prisma.user.findUnique({ where: { phone } })]
    : await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, take: 2 });
  if (matches.length !== 1)
    throw new Error('Expected exactly one ACTIVE ADMIN; set IDENTITY_OPERATOR_PHONE explicitly');
  const user = matches[0];
  if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE')
    throw new Error('Target must be an ACTIVE ADMIN; refusing to change role or status');
  await prisma.user.update({ where: { id: user.id }, data: { canVerifyIdentity: true } });
  console.log(`Granted identity verification to ADMIN ${user.id}`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
