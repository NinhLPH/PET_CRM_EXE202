import { BadRequestException, Injectable } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, id, page } from '../common/common';
import { runResourceOperation } from '../common/resource-operation';
import { CustomersService } from '../customers/customers.service';
import { ActivityDto } from './dto/activities.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly db: PrismaService, private readonly customers: CustomersService) {}

  async activities(customerId: string, query: { page?: string; limit?: string }) {
    const customer = await this.customers.customer(customerId);
    const pagination = page(query);
    const [items, total] = await Promise.all([
      this.db.crmActivity.findMany({ where: { customerId: customer.id }, include: { user: { select: { id: true, phone: true } } }, orderBy: { createdAt: 'desc' }, skip: pagination.skip, take: pagination.take }),
      this.db.crmActivity.count({ where: { customerId: customer.id } }),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async addActivity(customerId: string, actor: Actor, body: ActivityDto, key?: string) {
    if (body.type !== ActivityType.NOTE) throw new BadRequestException('Chỉ được thêm ghi chú thủ công');
    const customer = await this.customers.customer(customerId);
    return runResourceOperation(this.db, actor.id, key, 'CREATE_NOTE', {
      customerId: customer.id.toString(), petId: body.petId ?? null, content: body.content.trim(),
    }, async (tx) => {
      if (body.petId) {
        const pet = await tx.pet.findUnique({ where: { id: id(body.petId) } });
        if (!pet || pet.customerId !== customer.id) throw new BadRequestException('Pet không thuộc khách hàng');
      }
      const result = await tx.crmActivity.create({
        data: { customerId: customer.id, petId: body.petId ? id(body.petId) : null, type: 'NOTE', content: body.content.trim(), createdBy: actor.id },
      });
      await tx.auditEvent.create({ data: {
        actorId: actor.id, action: 'CREATE_NOTE', objectType: 'CRM_ACTIVITY', objectId: result.id.toString(),
        change: { customerId: customer.id.toString(), petId: body.petId ?? null },
      } });
      return result;
    });
  }
}
