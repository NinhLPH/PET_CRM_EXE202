import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { id, page } from '../common/common';
import { CustomerDto, UpdateCustomerDto } from './dto/customers.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly db: PrismaService) {}

  async customers(query: { q?: string; page?: string; limit?: string }) {
    const pagination = page(query);
    const q = query.q?.trim();
    const where: Prisma.CustomerWhereInput = q
      ? { OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] }
      : {};
    const [items, total] = await Promise.all([
      this.db.customer.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { createdAt: 'desc' } }),
      this.db.customer.count({ where }),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async customer(customerId: string) {
    const result = await this.db.customer.findUnique({
      where: { id: id(customerId) },
      include: {
        pets: true,
        bookings: { include: { services: true }, orderBy: { createdAt: 'desc' }, take: 20 },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!result) throw new NotFoundException('Không tìm thấy khách hàng');
    return result;
  }

  async createCustomer(body: CustomerDto) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-phone:${body.phone}`}, 0))`;
      if (await tx.customer.findFirst({ where: { phone: body.phone } }))
        throw new ConflictException('Số điện thoại đã có hồ sơ CRM');
      return tx.customer.create({ data: { ...body, fullName: body.fullName.trim() } });
    });
  }

  async updateCustomer(customerId: string, body: UpdateCustomerDto) {
    const existing = await this.customer(customerId);
    return this.db.$transaction(async (tx) => {
      const phones = [...new Set([existing.phone, body.phone].filter((value): value is string => Boolean(value)))].sort();
      for (const phone of phones)
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-phone:${phone}`}, 0))`;
      const current = await tx.customer.findUniqueOrThrow({ where: { id: existing.id } });
      if (current.userId && body.phone && body.phone !== current.phone)
        throw new ConflictException('Không đổi SĐT hồ sơ đã gắn tài khoản');
      if (body.phone && body.phone !== existing.phone) {
        if (await tx.customer.findFirst({ where: { phone: body.phone } }))
          throw new ConflictException('Số điện thoại đã có hồ sơ CRM');
      }
      return tx.customer.update({ where: { id: existing.id }, data: { ...body, fullName: body.fullName?.trim() } });
    });
  }

  async deleteCustomer(customerId: string) {
    const existing = await this.customer(customerId);
    if (existing.userId || existing.pets.length || existing.bookings.length || existing.activities.length ||
      (await this.db.petReminder.count({ where: { customerId: existing.id } })))
      throw new ConflictException('Khách hàng đã có tài khoản hoặc lịch sử');
    await this.db.customer.delete({ where: { id: existing.id } });
    return { success: true };
  }
}
