import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Admin, id, page } from '../common/common';
import { PrismaService } from '../prisma/prisma.service';

@Admin()
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  async list(@Query() query: {
    actorId?: string; action?: string; objectType?: string; objectId?: string;
    from?: string; to?: string; page?: string; limit?: string;
  }) {
    const p = page(query);
    if (query.action && !/^[A-Z_]{1,50}$/.test(query.action))
      throw new BadRequestException('Action không hợp lệ');
    if (query.objectType && !/^[A-Z_]{1,50}$/.test(query.objectType))
      throw new BadRequestException('Loại đối tượng không hợp lệ');
    if (query.objectId && query.objectId.length > 100)
      throw new BadRequestException('ID đối tượng không hợp lệ');
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from > to))
      throw new BadRequestException('Khoảng thời gian không hợp lệ');
    const where: Prisma.AuditEventWhereInput = {
      ...(query.actorId ? { actorId: id(query.actorId) } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.objectType ? { objectType: query.objectType } : {}),
      ...(query.objectId ? { objectId: query.objectId } : {}),
      ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.auditEvent.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: p.skip, take: p.take }),
      this.db.auditEvent.count({ where }),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }
}
