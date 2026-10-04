import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const marker = '[petcare-demo:v1]';
const dayMs = 24 * 60 * 60 * 1000;

const customerNames = [
  'Nguyễn Minh Anh',
  'Trần Thu Hà',
  'Lê Hoàng Nam',
  'Phạm Ngọc Mai',
  'Võ Quốc Bảo',
  'Đặng Thảo Vy',
  'Bùi Gia Huy',
  'Đỗ Thanh Trúc',
  'Huỳnh Đức Phúc',
  'Ngô Khánh Linh',
  'Phan Tuấn Kiệt',
  'Dương Mỹ Duyên',
  'Hoàng Nhật Minh',
  'Vũ Hải Yến',
  'Lý Quang Hưng',
  'Mai Hồng Nhung',
  'Tạ Văn Khoa',
  'Cao Bảo Ngọc',
  'Trương Phương Thảo',
  'Đinh Thành Đạt',
  'Hồ Ngọc Lan',
  'Châu Minh Khang',
  'Nguyễn Thị Hạnh',
  'Trần Gia Bảo',
  'Lê Thanh Tâm',
  'Phạm Kiều Oanh',
  'Võ Anh Tuấn',
  'Đặng Ngọc Diệp',
  'Bùi Quốc Việt',
  'Đỗ Phương Uyên',
];

const petNames = [
  'Milu',
  'Mimi',
  'Bông',
  'Mực',
  'Bơ',
  'Cà Phê',
  'Mochi',
  'Bắp',
  'Nâu',
  'Đốm',
  'Bé Na',
  'Mun',
  'Xoài',
  'Sữa',
  'Gấu',
  'Bim',
  'Bông Gòn',
  'Mít',
  'Luna',
  'Cún',
  'Simba',
  'Bé Đậu',
  'Kem',
  'Tôm',
  'Bánh Bao',
];

const serviceDefinitions = [
  { name: 'Tắm vệ sinh', basePrice: 120_000, duration: 60, reminderDays: 30 },
  { name: 'Cắt tỉa lông', basePrice: 180_000, duration: 90, reminderDays: 45 },
  {
    name: 'Vệ sinh tai và móng',
    basePrice: 90_000,
    duration: 40,
    reminderDays: 30,
  },
  {
    name: 'Spa chăm sóc da lông',
    basePrice: 250_000,
    duration: 120,
    reminderDays: 60,
  },
  { name: 'Tắm trị liệu', basePrice: 220_000, duration: 90, reminderDays: 30 },
  {
    name: 'Chăm sóc răng miệng',
    basePrice: 160_000,
    duration: 50,
    reminderDays: 90,
  },
] as const;

type ServiceDefinition = (typeof serviceDefinitions)[number];
type SeedService = {
  id: bigint;
  reminderDays: number;
};

function requireEnvironment() {
  const databaseUrl = process.env.DATABASE_URL;
  const adminPhone = process.env.ADMIN_PHONE;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (!/^0\d{9}$/.test(adminPhone ?? ''))
    throw new Error('ADMIN_PHONE must contain 10 digits and start with 0');
  if (!adminPassword || adminPassword.length < 12)
    throw new Error('ADMIN_PASSWORD must have at least 12 characters');
  if (!customerPassword || customerPassword.length < 8)
    throw new Error('SEED_CUSTOMER_PASSWORD must have at least 8 characters');
  if (
    Array.from({ length: 30 }, (_, i) => customerPhone(i)).includes(adminPhone!)
  )
    throw new Error('ADMIN_PHONE must not match a demo customer phone');
  return {
    databaseUrl,
    adminPhone: adminPhone!,
    adminPassword,
    customerPassword,
  };
}

function customerPhone(index: number) {
  return `0991${String(index + 1).padStart(6, '0')}`;
}

function localDayStart(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00+07:00`);
}

function addLocalDays(date: Date, days: number) {
  const start = localDayStart(date);
  start.setUTCDate(start.getUTCDate() + days);
  return start;
}

function localAt(today: Date, days: number, hour: number) {
  return new Date(today.getTime() + days * dayMs + hour * 60 * 60 * 1000);
}

async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}

async function assertSchemaReady(db: PrismaClient) {
  try {
    await Promise.all([
      db.user.findFirst(),
      db.customer.findFirst(),
      db.pet.findFirst(),
      db.service.findFirst(),
      db.servicePrice.findFirst(),
      db.booking.findFirst(),
      db.bookingService.findFirst(),
      db.bookingSurcharge.findFirst(),
      db.reminderConfig.findFirst(),
      db.petReminder.findFirst(),
      db.crmActivity.findFirst(),
      db.userSession.findFirst(),
      db.idempotencyRequest.findFirst(),
    ]);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2021', 'P2022'].includes(error.code)
    ) {
      throw new Error(
        'Database chưa có đủ bảng/cột theo prisma/schema.prisma. Chuẩn bị schema trước khi chạy seed:demo.',
        { cause: error },
      );
    }
    throw error;
  }
}

async function ensureAdmin(
  db: PrismaClient,
  phone: string,
  password: string,
  demoCreatedAt: Date,
) {
  const existing = await db.user.findUnique({ where: { phone } });
  if (existing) {
    if (existing.role !== 'ADMIN')
      throw new Error(
        `ADMIN_PHONE ${phone} already belongs to a customer account`,
      );
    if (existing.status !== 'ACTIVE')
      throw new Error(
        `ADMIN_PHONE ${phone} belongs to an inactive ADMIN account`,
      );
    return existing;
  }
  return db.user.create({
    data: {
      phone,
      passwordHash: await passwordHash(password),
      role: 'ADMIN',
      createdAt: demoCreatedAt,
    },
  });
}

async function ensureCustomers(
  db: PrismaClient,
  customerPassword: string,
  demoCreatedAt: Date,
) {
  const customers: { id: bigint; phone: string }[] = [];
  for (let index = 0; index < customerNames.length; index++) {
    const phone = customerPhone(index);
    const label = `${marker}:customer:${index + 1}`;
    const hash = index < 10 ? await passwordHash(customerPassword) : undefined;
    const customer = await db.$transaction(async (tx) => {
      const found = await tx.customer.findMany({ where: { phone }, take: 2 });
      if (found.length > 1 || (found[0] && found[0].note !== label))
        throw new Error(
          `Demo customer phone ${phone} collides with existing data`,
        );
      const record =
        found[0] ??
        (await tx.customer.create({
          data: {
            fullName: customerNames[index],
            phone,
            address: `${12 + index} Đường số ${(index % 9) + 1}, TP. Hồ Chí Minh`,
            note: label,
            createdAt: demoCreatedAt,
          },
        }));
      const user = await tx.user.findUnique({ where: { phone } });
      if (index < 10) {
        if (
          user &&
          (user.role !== 'CUSTOMER' ||
            user.status !== 'ACTIVE' ||
            record.userId !== user.id)
        )
          throw new Error(
            `Demo user phone ${phone} collides with existing data`,
          );
        if (record.userId && !user)
          throw new Error(`Demo customer ${phone} is linked to another user`);
        if (!user) {
          if (record.userId)
            throw new Error(`Demo customer ${phone} is linked to another user`);
          const created = await tx.user.create({
            data: {
              phone,
              passwordHash: hash!,
              role: 'CUSTOMER',
              createdAt: demoCreatedAt,
            },
          });
          await tx.customer.update({
            where: { id: record.id },
            data: { userId: created.id },
          });
        }
      } else if (
        user &&
        (user.role !== 'CUSTOMER' || record.userId !== user.id)
      ) {
        throw new Error(
          `Demo customer phone ${phone} collides with another user`,
        );
      }
      return record;
    });
    customers.push({ id: customer.id, phone });
  }
  return customers;
}

async function ensurePets(
  db: PrismaClient,
  customers: { id: bigint }[],
  demoCreatedAt: Date,
) {
  const pets: {
    id: bigint;
    customerId: bigint;
    species: 'DOG' | 'CAT';
    weight: Prisma.Decimal;
  }[] = [];
  for (let index = 0; index < 50; index++) {
    const customer = customers[index < 40 ? Math.floor(index / 2) : index - 20];
    const species = index % 3 === 0 ? 'CAT' : 'DOG';
    const name = petNames[index % petNames.length];
    const label = `${marker}:pet:${index + 1}`;
    const found = await db.pet.findMany({
      where: { specialNote: label },
      take: 2,
    });
    if (found.length > 1 || (found[0] && found[0].customerId !== customer.id))
      throw new Error(`Demo pet ${label} collides with existing data`);
    if (
      !found.length &&
      (await db.pet.findFirst({ where: { customerId: customer.id, name } }))
    )
      throw new Error(
        `Customer already has a pet named ${name}; refusing to claim it as demo data`,
      );
    const pet =
      found[0] ??
      (await db.pet.create({
        data: {
          customerId: customer.id,
          name,
          species,
          breed:
            species === 'CAT'
              ? ['Mèo ta', 'Anh lông ngắn', 'Ba Tư'][index % 3]
              : ['Poodle', 'Corgi', 'Chó ta', 'Golden Retriever'][index % 4],
          weight:
            species === 'CAT'
              ? ['2.50', '4.20', '6.00'][index % 3]
              : ['4.50', '9.50', '19.50', '28.00'][index % 4],
          allergyNote:
            index % 7 === 0 ? 'Nhạy cảm với một số loại sữa tắm' : null,
          specialNote: label,
          createdAt: demoCreatedAt,
        },
      }));
    pets.push({
      id: pet.id,
      customerId: pet.customerId,
      species: pet.species,
      weight: pet.weight,
    });
  }
  return pets;
}

function sameWeightBound(
  actual: Prisma.Decimal | null,
  expected: string | null,
) {
  return expected === null
    ? actual === null
    : actual !== null && actual.equals(expected);
}

function rangesOverlap(
  aMin: Prisma.Decimal,
  aMax: Prisma.Decimal | null,
  bMin: string,
  bMax: string | null,
) {
  return (
    aMin.lessThan(bMax ?? '1000') &&
    new Prisma.Decimal(bMin).lessThan(aMax ?? '1000')
  );
}

async function ensureService(
  db: PrismaClient,
  definition: ServiceDefinition,
  demoCreatedAt: Date,
): Promise<SeedService> {
  return db.$transaction(
    async (tx) => {
      const label = `${marker}:service:${definition.name}`;
      const found = await tx.service.findMany({
        where: { serviceName: definition.name },
        take: 2,
      });
      if (found.length > 1 || (found[0] && found[0].description !== label))
        throw new Error(
          `Demo service ${definition.name} collides with existing data`,
        );
      const service =
        found[0] ??
        (await tx.service.create({
          data: {
            serviceName: definition.name,
            description: label,
            estimatedDuration: definition.duration,
            status: 'INACTIVE',
            createdAt: demoCreatedAt,
          },
        }));
      if (found[0] && service.status !== 'ACTIVE')
        throw new Error(
          `Demo service ${definition.name} was deactivated; refusing to overwrite it`,
        );

      const bands = [
        { minWeight: '0', maxWeight: '5' },
        { minWeight: '5', maxWeight: '15' },
        { minWeight: '15', maxWeight: null },
      ];
      for (const species of ['DOG', 'CAT'] as const) {
        const existing = await tx.servicePrice.findMany({
          where: { serviceId: service.id, species },
        });
        for (let index = 0; index < bands.length; index++) {
          const band = bands[index];
          const exact = existing.filter(
            (rule) =>
              rule.minWeight.equals(band.minWeight) &&
              sameWeightBound(rule.maxWeight, band.maxWeight),
          );
          if (exact.length > 1 || (exact[0] && exact[0].status !== 'ACTIVE'))
            throw new Error(
              `Demo price range for ${definition.name}/${species} was changed`,
            );
          if (exact.length) continue;
          if (
            existing.some(
              (rule) =>
                rule.status === 'ACTIVE' &&
                rangesOverlap(
                  rule.minWeight,
                  rule.maxWeight,
                  band.minWeight,
                  band.maxWeight,
                ),
            )
          )
            throw new Error(
              `Demo price range overlaps existing data for ${definition.name}/${species}`,
            );
          await tx.servicePrice.create({
            data: {
              serviceId: service.id,
              species,
              minWeight: band.minWeight,
              maxWeight: band.maxWeight,
              price:
                definition.basePrice +
                index * 50_000 +
                (species === 'CAT' ? 0 : 20_000),
              status: 'ACTIVE',
              createdAt: demoCreatedAt,
            },
          });
        }
      }
      const configs = await tx.reminderConfig.findMany({
        where: { serviceId: service.id, status: 'ACTIVE' },
        take: 2,
      });
      if (configs.length > 1)
        throw new Error(
          `Multiple active reminder configs found for ${definition.name}`,
        );
      const config =
        configs[0] ??
        (await tx.reminderConfig.create({
          data: {
            serviceId: service.id,
            reminderDays: definition.reminderDays,
            status: 'ACTIVE',
            createdAt: demoCreatedAt,
          },
        }));
      if (service.status !== 'ACTIVE')
        await tx.service.update({
          where: { id: service.id },
          data: { status: 'ACTIVE' },
        });
      return { id: service.id, reminderDays: config.reminderDays };
    },
    { timeout: 30_000 },
  );
}

async function matchingPrice(
  db: PrismaClient,
  serviceId: bigint,
  pet: { species: 'DOG' | 'CAT'; weight: Prisma.Decimal },
) {
  const prices = await db.servicePrice.findMany({
    where: {
      serviceId,
      species: pet.species,
      status: 'ACTIVE',
      minWeight: { lte: pet.weight },
      OR: [{ maxWeight: null }, { maxWeight: { gt: pet.weight } }],
    },
    take: 2,
  });
  if (prices.length !== 1)
    throw new Error(
      `Expected exactly one active price for service ${serviceId}/${pet.species}/${pet.weight.toString()}`,
    );
  return prices[0];
}

async function ensureBookings(
  db: PrismaClient,
  pets: {
    id: bigint;
    customerId: bigint;
    species: 'DOG' | 'CAT';
    weight: Prisma.Decimal;
  }[],
  services: SeedService[],
  adminId: bigint,
  today: Date,
) {
  const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
  let completedIndex = 0;
  for (let index = 0; index < 24; index++) {
    const pet = pets[index * 2];
    const service = services[index % services.length];
    const status = statuses[index % statuses.length];
    const label = `${marker}:booking:${index + 1}`;
    const found = await db.booking.findMany({
      where: { note: label },
      include: { services: true },
      take: 2,
    });
    if (
      found.length > 1 ||
      (found[0] &&
        (found[0].petId !== pet.id ||
          found[0].customerId !== pet.customerId ||
          found[0].services.length !== 1 ||
          found[0].services[0].serviceId !== service.id))
    )
      throw new Error(
        `Demo booking ${label} collides with or was disconnected from existing data`,
      );
    if (found.length) {
      if (status === 'COMPLETED') completedIndex++;
      continue;
    }
    const price = await matchingPrice(db, service.id, pet);
    const base = Number(price.price);
    let bookingDate: Date;
    let createdAt: Date;
    let completedAt: Date | undefined;
    let cancelledAt: Date | undefined;
    if (status === 'COMPLETED') {
      const age =
        completedIndex < 4
          ? service.reminderDays + 5
          : Math.max(1, service.reminderDays - 5);
      completedAt = localAt(today, -age, 15);
      bookingDate = localAt(today, -age, 10);
      createdAt = localAt(today, -age - 2, 9);
    } else if (status === 'CANCELLED') {
      bookingDate = localAt(today, index + 2, 10);
      createdAt = localAt(today, -3, 9);
      cancelledAt = localAt(today, -1, 11);
    } else {
      bookingDate = localAt(
        today,
        status === 'CONFIRMED' && index === 1 ? 0 : index + 2,
        10,
      );
      createdAt = localAt(today, -2, 9);
    }
    const thisCompletedIndex = completedIndex;
    if (status === 'COMPLETED') completedIndex++;
    const surcharge =
      status === 'COMPLETED' && thisCompletedIndex % 2 === 0 ? 30_000 : 0;
    const discount =
      status === 'COMPLETED' && thisCompletedIndex % 2 === 1 ? 20_000 : 0;
    const finalTotal =
      status === 'COMPLETED' ? base + surcharge - discount : undefined;
    await db.$transaction(
      async (tx) => {
        if (
          await tx.booking.findFirst({
            where: {
              petId: pet.id,
              bookingDate,
              status: { in: ['PENDING', 'CONFIRMED'] },
            },
          })
        )
          throw new Error(
            `Pet already has an active booking at ${bookingDate.toISOString()}`,
          );
        const booking = await tx.booking.create({
          data: {
            customerId: pet.customerId,
            petId: pet.id,
            bookingDate,
            createdAt,
            status,
            note: label,
            estimatedTotal: base,
            finalTotal,
            discountAmount: discount,
            completedAt,
            cancelledAt,
            cancellationReason:
              status === 'CANCELLED' ? 'Khách đổi lịch hẹn' : undefined,
            services: {
              create: {
                serviceId: service.id,
                servicePriceId: price.id,
                petWeightSnapshot: pet.weight,
                basePrice: base,
                finalPrice: finalTotal,
                createdAt,
              },
            },
          },
          include: { services: true },
        });
        if (status !== 'COMPLETED') return;
        const bookingService = booking.services[0];
        if (surcharge)
          await tx.bookingSurcharge.create({
            data: {
              bookingId: booking.id,
              bookingServiceId: bookingService.id,
              surchargeName: 'Chăm sóc bổ sung',
              amount: surcharge,
              note: 'Phụ phí demo',
              createdAt: completedAt,
            },
          });
        const contacted = thisCompletedIndex < 2;
        const reminderDate = addLocalDays(completedAt!, service.reminderDays);
        const contactedAt = contacted ? new Date() : undefined;
        const reminder = await tx.petReminder.create({
          data: {
            bookingId: booking.id,
            customerId: pet.customerId,
            petId: pet.id,
            serviceId: service.id,
            completedDate: completedAt!,
            reminderDate,
            status: contacted
              ? 'CONTACTED'
              : thisCompletedIndex === 2
                ? 'DUE'
                : 'PENDING',
            contactedAt,
            contactMethod: contacted
              ? thisCompletedIndex === 0
                ? 'PHONE'
                : 'ZALO'
              : undefined,
            note: contacted ? 'Đã trao đổi lịch chăm sóc tiếp theo' : undefined,
            createdAt: completedAt,
          },
        });
        if (contacted)
          await tx.crmActivity.create({
            data: {
              customerId: pet.customerId,
              petId: pet.id,
              reminderId: reminder.id,
              type: thisCompletedIndex === 0 ? 'CALL' : 'ZALO',
              content: `${marker}:contact:${index + 1} Đã trao đổi lịch chăm sóc tiếp theo`,
              createdBy: adminId,
              createdAt: contactedAt,
            },
          });
      },
      { timeout: 30_000 },
    );
  }
}

async function ensureNotes(
  db: PrismaClient,
  customers: { id: bigint }[],
  pets: { id: bigint; customerId: bigint }[],
  adminId: bigint,
) {
  for (let index = 0; index < 20; index++) {
    const label = `${marker}:activity:note:${index + 1}:`;
    const found = await db.crmActivity.findMany({
      where: { content: { startsWith: label } },
      take: 2,
    });
    if (
      found.length > 1 ||
      (found[0] &&
        (found[0].customerId !== customers[index].id ||
          found[0].type !== 'NOTE' ||
          found[0].createdBy !== adminId))
    )
      throw new Error(`Demo CRM activity ${label} collides with existing data`);
    if (found.length) continue;
    const pet = pets.find((item) => item.customerId === customers[index].id);
    await db.crmActivity.create({
      data: {
        customerId: customers[index].id,
        petId: pet?.id,
        type: 'NOTE',
        content: `${label} Khách quan tâm lịch chăm sóc định kỳ`,
        createdBy: adminId,
      },
    });
  }
}

async function main() {
  const { databaseUrl, adminPhone, adminPassword, customerPassword } =
    requireEnvironment();
  const pool = new Pool({ connectionString: databaseUrl });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await assertSchemaReady(db);
    const today = localDayStart(new Date());
    const demoCreatedAt = localAt(today, -130, 9);
    const admin = await ensureAdmin(
      db,
      adminPhone,
      adminPassword,
      demoCreatedAt,
    );
    const customers = await ensureCustomers(
      db,
      customerPassword,
      demoCreatedAt,
    );
    const pets = await ensurePets(db, customers, demoCreatedAt);
    const services: SeedService[] = [];
    for (const definition of serviceDefinitions)
      services.push(await ensureService(db, definition, demoCreatedAt));
    await ensureBookings(db, pets, services, admin.id, today);
    await ensureNotes(db, customers, pets, admin.id);
    console.log(
      'Demo data ready: 1 ADMIN, 30 customers (10 accounts), 50 pets, 6 services, 24 bookings.',
    );
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(
    'Demo seed failed:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
