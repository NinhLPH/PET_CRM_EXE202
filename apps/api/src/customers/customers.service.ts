import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, id, page } from '../common/common';
import { runResourceOperation } from '../common/resource-operation';
import { CustomerDto, UpdateCustomerDto } from './dto/customers.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly db: PrismaService) {}

  async customers(query: { q?: string; page?: string; limit?: string }) {
    const pagination = page(query);
    const q = query.q?.trim();
    const where: Prisma.CustomerWhereInput = q
      ? {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.db.customer.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.customer.count({ where }),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async customer(customerId: string) {
    const result = await this.db.customer.findUnique({
      where: { id: id(customerId) },
      include: {
        pets: true,
        bookings: {
          include: { services: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!result) throw new NotFoundException('Không tìm thấy khách hàng');
    return result;
  }

  async createCustomer(body: CustomerDto, actor?: Actor, key?: string) {
    return runResourceOperation(this.db, actor?.id, key, 'CREATE_CUSTOMER', {
      fullName: body.fullName.trim(), phone: body.phone, address: body.address ?? null, note: body.note ?? null,
    }, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-phone:${body.phone}`}, 0))`;
      if (await tx.customer.findFirst({ where: { phone: body.phone } }))
        throw new ConflictException('Số điện thoại đã có hồ sơ CRM');
      const result = await tx.customer.create({
        data: {
          fullName: body.fullName.trim(),
          phone: body.phone,
          address: body.address,
          note: body.note,
        },
      });
      if (actor) await tx.auditEvent.create({ data: {
        actorId: actor.id, action: 'CREATE_CUSTOMER', objectType: 'CUSTOMER', objectId: result.id.toString(),
      } });
      return result;
    });
  }

  async updateCustomer(customerId: string, body: UpdateCustomerDto) {
    const existing = await this.customer(customerId);
    return this.db.$transaction(async (tx) => {
      const phones = [
        ...new Set(
          [existing.phone, body.phone].filter((value): value is string =>
            Boolean(value),
          ),
        ),
      ].sort();
      for (const phone of phones)
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-phone:${phone}`}, 0))`;
      const current = await tx.customer.findUniqueOrThrow({
        where: { id: existing.id },
      });
      if (current.userId && body.phone && body.phone !== current.phone)
        throw new ConflictException('Không đổi SĐT hồ sơ đã gắn tài khoản');
      if (body.phone && body.phone !== existing.phone) {
        if (await tx.customer.findFirst({ where: { phone: body.phone } }))
          throw new ConflictException('Số điện thoại đã có hồ sơ CRM');
      }
      return tx.customer.update({
        where: { id: existing.id },
        data: {
          fullName: body.fullName?.trim(),
          phone: body.phone,
          address: body.address,
          note: body.note,
        },
      });
    });
  }

  async deleteCustomer(customerId: string) {
    const existing = await this.customer(customerId);
    if (
      existing.userId ||
      existing.pets.length ||
      existing.bookings.length ||
      existing.activities.length ||
      (await this.db.petReminder.count({ where: { customerId: existing.id } }))
    )
      throw new ConflictException('Khách hàng đã có tài khoản hoặc lịch sử');
    await this.db.customer.delete({ where: { id: existing.id } });
    return { success: true };
  }
}
