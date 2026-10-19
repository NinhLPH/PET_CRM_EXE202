import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Param, Req } from '@nestjs/common';
import { Admin, Customer } from './common';
import type { ActorRequest } from './common';
import { PrismaService } from '../prisma/prisma.service';

async function lookup(db: PrismaService, request: ActorRequest, key: string) {
  if (!key || key.length > 100) throw new BadRequestException('Idempotency-Key không hợp lệ');
  const item = await db.resourceOperation.findUnique({ where: { actorId_key: { actorId: request.actor.id, key } } });
  if (!item) throw new NotFoundException('Không tìm thấy thao tác');
  if (request.actor.role === 'CUSTOMER' && (
    item.operation !== 'CREATE_PET' ||
    (item.result as { customerId?: string }).customerId !== request.actor.customerId?.toString()
  )) throw new ForbiddenException();
  return { operation: item.operation, resourceId: item.resourceId, result: item.result, createdAt: item.createdAt };
}

@Customer()
@Controller('operations')
export class CustomerResourceOperationsController {
  constructor(private readonly db: PrismaService) {}
  @Get(':key') get(@Req() request: ActorRequest, @Param('key') key: string) { return lookup(this.db, request, key); }
}

@Admin()
@Controller('admin/operations')
export class AdminResourceOperationsController {
  constructor(private readonly db: PrismaService) {}
  @Get(':key') get(@Req() request: ActorRequest, @Param('key') key: string) { return lookup(this.db, request, key); }
}
