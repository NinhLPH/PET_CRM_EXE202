import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, addLocalDays, digest, id, localDayStart, page, serialize } from '../common/common';
import { ContactDto } from './dto/reminders.dto';

@Injectable()
export class ReminderWorkflowService {
  constructor(private readonly db: PrismaService) {}
  async list(query: { due?: string; page?: string; limit?: string }) {
    if (query.due !== undefined && !['true', 'false'].includes(query.due))
      throw new BadRequestException('Bộ lọc due không hợp lệ');
    const p = page(query),
      tomorrow = addLocalDays(localDayStart(new Date()), 1);
    const where: Prisma.PetReminderWhereInput =
      query.due === 'true'
        ? { status: { in: ['PENDING', 'DUE'] }, reminderDate: { lt: tomorrow } }
        : {};
    const [items, total] = await Promise.all([
      this.db.petReminder.findMany({
        where,
        include: { customer: true, pet: true, service: true },
        orderBy: [{ reminderDate: 'asc' }, { id: 'asc' }],
        skip: p.skip,
        take: p.take,
      }),
      this.db.petReminder.count({ where }),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }
  async detail(reminderId: string) {
    const item = await this.db.petReminder.findUnique({
      where: { id: id(reminderId) },
      include: {
        customer: true,
        pet: {
          include: { activities: { orderBy: { createdAt: 'desc' }, take: 20 } },
        },
        service: true,
        booking: { include: { services: true, surcharges: true } },
      },
    });
    if (!item) throw new NotFoundException('Không tìm thấy reminder');
    return item;
  }
  async contact(reminderId: string, actor: Actor, body: ContactDto, key?: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('pilot:schedule', 0))`;
      if (key && key.length > 100) throw new BadRequestException('Idempotency-Key quá dài');
      const hash = digest(JSON.stringify({ reminderId, method: body.method, note: body.note ?? null }));
      if (key) {
        const prior = await tx.idempotencyRequest.findUnique({ where: { userId_key: { userId: actor.id, key } } });
        if (prior) {
          if (prior.operation !== 'CONTACT' || prior.requestHash !== hash)
            throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency-Key đã dùng cho request khác' });
          return prior.result ?? { reminderId, replay: true };
        }
      }
      const reminder = await tx.petReminder.findUnique({
        where: { id: id(reminderId) },
      });
      if (!reminder) throw new NotFoundException('Không tìm thấy reminder');
      const changed = await tx.petReminder.updateMany({
        where: { id: reminder.id, status: { in: ['PENDING', 'DUE'] } },
        data: {
          status: 'CONTACTED',
          contactedAt: new Date(),
          contactMethod: body.method,
          note: body.note,
        },
      });
      if (!changed.count) throw new ConflictException('Reminder đã được xử lý');
      await tx.crmActivity.create({
        data: {
          customerId: reminder.customerId,
          petId: reminder.petId,
          reminderId: reminder.id,
          type:
            body.method === 'PHONE'
              ? 'CALL'
              : body.method === 'ZALO'
                ? 'ZALO'
                : 'NOTE',
          content: body.note,
          createdBy: actor.id,
        },
      });
      const result = await tx.petReminder.findUniqueOrThrow({ where: { id: reminder.id } });
      await tx.auditEvent.create({ data: {
        actorId: actor.id, action: 'CONTACT', objectType: 'REMINDER', objectId: reminder.id.toString(),
        change: { method: body.method, bookingId: reminder.bookingId.toString() },
      } });
      if (key) await tx.idempotencyRequest.create({ data: {
        userId: actor.id, key, requestHash: hash, operation: 'CONTACT',
        bookingId: reminder.bookingId, result: serialize(result) as Prisma.InputJsonValue,
      } });
      return result;
    });
  }
}
