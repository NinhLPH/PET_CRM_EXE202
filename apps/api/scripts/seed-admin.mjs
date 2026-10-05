import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const phone = process.env.ADMIN_PHONE;
const password = process.env.ADMIN_PASSWORD;
if (
  !/^0\d{9}$/.test(phone ?? '') ||
  !password ||
  password.length < 12 ||
  !process.env.DATABASE_URL
) {
  throw new Error(
    'Set DATABASE_URL, ADMIN_PHONE (10 digits) and ADMIN_PASSWORD (at least 12 characters)',
  );
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
try {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing)
    throw new Error(
      'Phone already has an account; refusing to promote or overwrite it',
    );
  const salt = randomBytes(16).toString('hex');
  const hash = await promisify(scryptCallback)(password, salt, 64);
  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash: `scrypt:${salt}:${hash.toString('hex')}`,
      role: 'ADMIN',
    },
  });
  console.log(`Created ADMIN user ${user.id}`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
