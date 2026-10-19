import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ServiceStatus, Species } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, id, page } from '../common/common';
import {
  PriceDto,
  ReminderConfigDto,
  ServiceDto,
  UpdateServiceDto,
} from './dto/services.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly db: PrismaService) {}

  private async audit(tx: Prisma.TransactionClient, actor: Actor | undefined, action: string, objectType: string, objectId: bigint, change?: Record<string, string | number | null>) {
    if (!actor) return;
    await tx.auditEvent.create({ data: {
      actorId: actor.id, action, objectType, objectId: objectId.toString(),
      ...(change ? { change } : {}),
    } });
  }

  async publicServices(query: { page?: string; limit?: string } = {}) {
    const p = page(query),
      where = { status: 'ACTIVE' as const };
    const [items, total] = await Promise.all([
      this.db.service.findMany({
        where,
        orderBy: { serviceName: 'asc' },
        skip: p.skip,
        take: p.take,
      }),
      this.db.service.count({ where }),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }

  async adminServices(query: { page?: string; limit?: string } = {}) {
    const p = page(query);
    const [items, total] = await Promise.all([
      this.db.service.findMany({
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      this.db.service.count(),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }

  async service(serviceId: string) {
    const result = await this.db.service.findUnique({
      where: { id: id(serviceId) },
    });
    if (!result) throw new NotFoundException('Không tìm thấy dịch vụ');
    return result;
  }

  private async checkServiceName(name: string, except?: bigint) {
    const found = await this.db.service.findFirst({
      where: {
        serviceName: { equals: name.trim(), mode: 'insensitive' },
        status: 'ACTIVE',
        ...(except ? { id: { not: except } } : {}),
      },
    });
    if (found)
      throw new ConflictException('Tên dịch vụ đang hoạt động đã tồn tại');
  }

  async createService(body: ServiceDto, actor?: Actor) {
    await this.checkServiceName(body.serviceName);
    return this.db.$transaction(async (tx) => {
      const result = await tx.service.create({ data: {
        serviceName: body.serviceName.trim(),
        description: body.description,
        estimatedDuration: body.estimatedDuration,
        status: 'INACTIVE',
      } });
      await this.audit(tx, actor, 'CREATE_SERVICE', 'SERVICE', result.id);
      return result;
    });
  }

  async updateService(serviceId: string, body: UpdateServiceDto, actor?: Actor) {
    const service = await this.service(serviceId);
    if (body.serviceName)
      await this.checkServiceName(body.serviceName, service.id);
    return this.db.$transaction(async (tx) => {
      const result = await tx.service.update({ where: { id: service.id }, data: {
        serviceName: body.serviceName?.trim(),
        description: body.description,
        estimatedDuration: body.estimatedDuration,
      } });
      await this.audit(tx, actor, 'UPDATE_SERVICE', 'SERVICE', result.id);
      return result;
    });
  }

  async serviceStatus(serviceId: string, status: ServiceStatus, actor?: Actor) {
    const service = await this.service(serviceId);
    if (status === 'ACTIVE')
      await this.checkServiceName(service.serviceName, service.id);
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('pilot:schedule', 0))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`service:${service.id}`}, 0))`;
      const current = await tx.service.findUniqueOrThrow({
        where: { id: service.id },
      });
      if (
        status === 'ACTIVE' &&
        (!current.estimatedDuration || current.estimatedDuration < 1)
      )
        throw new ConflictException('Dịch vụ cần thời lượng hợp lệ');
      if (
        status === 'ACTIVE' &&
        !(await tx.servicePrice.count({
          where: {
            serviceId: service.id,
            status: 'ACTIVE',
            species: { not: null },
          },
        }))
      )
        throw new ConflictException(
          'Dịch vụ cần ít nhất một khoảng giá Active',
        );
      const result = await tx.service.update({ where: { id: service.id }, data: { status } });
      await this.audit(tx, actor, 'SERVICE_STATUS', 'SERVICE', result.id, { oldStatus: current.status, newStatus: status });
      return result;
    });
  }

  async prices(
    serviceId: string,
    species?: Species,
    query: { page?: string; limit?: string } = {},
  ) {
    const service = await this.service(serviceId),
      p = page(query),
      where: Prisma.ServicePriceWhereInput = {
        serviceId: service.id,
        status: 'ACTIVE',
        ...(species ? { species } : {}),
      };
    const [items, total] = await Promise.all([
      this.db.servicePrice.findMany({
        where,
        orderBy: { minWeight: 'asc' },
        skip: p.skip,
        take: p.take,
      }),
      this.db.servicePrice.count({ where }),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }

  async quote(serviceId: string, species: Species, weight: string) {
    const service = await this.service(serviceId);
    if (service.status !== 'ACTIVE')
      throw new ConflictException('Dịch vụ không mở bán');
    if (
      !Object.values(Species).includes(species) ||
      !/^(?:\d{1,3})(?:\.\d{1,2})?$/.test(weight) ||
      Number(weight) <= 0 ||
      Number(weight) > 999.99
    )
      throw new BadRequestException('Loài hoặc cân nặng không hợp lệ');
    const value = new Prisma.Decimal(weight);
    const matches = await this.db.servicePrice.findMany({
      where: {
        serviceId: service.id,
        species,
        status: 'ACTIVE',
        minWeight: { lte: value },
        OR: [{ maxWeight: null }, { maxWeight: { gt: value } }],
      },
      take: 2,
    });
    if (!matches.length)
      throw new ConflictException('Chưa có giá cho cân nặng này');
    if (matches.length > 1)
      throw new ConflictException('Cấu hình bảng giá bị chồng khoảng');
    return {
      serviceId: service.id,
      species,
      weight: value,
      servicePriceId: matches[0].id,
      basePrice: matches[0].price,
    };
  }

  private checkPrice(body: PriceDto) {
    if (
      body.maxWeight !== undefined &&
      Number(body.minWeight) >= Number(body.maxWeight)
    )
      throw new BadRequestException('Khoảng cân nặng không hợp lệ');
  }

  private async lockPrice(
    tx: Prisma.TransactionClient,
    serviceId: bigint,
    species: Species,
  ) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${serviceId}:${species}`}, 0))`;
  }

  private async checkOverlap(
    tx: Prisma.TransactionClient,
    serviceId: bigint,
    body: PriceDto,
    except?: bigint,
  ) {
    const rules = await tx.servicePrice.findMany({
      where: {
        serviceId,
        species: body.species,
        status: 'ACTIVE',
        ...(except ? { id: { not: except } } : {}),
      },
    });
    const low = Number(body.minWeight),
      high = body.maxWeight === undefined ? Infinity : Number(body.maxWeight);
    if (
      rules.some(
        (rule) =>
          low < (rule.maxWeight === null ? Infinity : Number(rule.maxWeight)) &&
          Number(rule.minWeight) < high,
      )
    )
      throw new ConflictException('Khoảng giá bị chồng lấn');
  }

  async createPrice(serviceId: string, body: PriceDto, actor?: Actor) {
    const service = await this.service(serviceId);
    this.checkPrice(body);
    return this.db.$transaction(async (tx) => {
      await this.lockPrice(tx, service.id, body.species);
      await this.checkOverlap(tx, service.id, body);
      const result = await tx.servicePrice.create({
        data: {
          serviceId: service.id,
          species: body.species,
          minWeight: body.minWeight,
          maxWeight: body.maxWeight,
          price: body.price,
        },
      });
      await this.audit(tx, actor, 'CREATE_PRICE', 'SERVICE_PRICE', result.id, { serviceId: service.id.toString(), price: Number(result.price) });
      return result;
    });
  }

  async updatePrice(serviceId: string, priceId: string, body: PriceDto, actor?: Actor) {
    const service = await this.service(serviceId);
    this.checkPrice(body);
    return this.db.$transaction(async (tx) => {
      const existing = await tx.servicePrice.findUnique({
        where: { id: id(priceId) },
      });
      if (!existing || existing.serviceId !== service.id)
        throw new NotFoundException('Không tìm thấy khoảng giá');
      await this.lockPrice(tx, service.id, existing.species ?? body.species);
      if (body.species !== existing.species)
        await this.lockPrice(tx, service.id, body.species);
      await this.checkOverlap(tx, service.id, body, existing.id);
      const result = await tx.servicePrice.update({
        where: { id: existing.id },
        data: {
          species: body.species,
          minWeight: body.minWeight,
          maxWeight: body.maxWeight ?? null,
          price: body.price,
        },
      });
      await this.audit(tx, actor, 'UPDATE_PRICE', 'SERVICE_PRICE', result.id, { serviceId: service.id.toString(), price: Number(result.price) });
      return result;
    });
  }

  async priceStatus(priceId: string, status: ServiceStatus, actor?: Actor) {
    const existing = await this.db.servicePrice.findUnique({
      where: { id: id(priceId) },
    });
    if (!existing) throw new NotFoundException();
    if (!existing.species)
      throw new ConflictException('Rule giá chung loài không dùng trong v1');
    return this.db.$transaction(async (tx) => {
      await this.lockPrice(tx, existing.serviceId, existing.species!);
      if (status === 'ACTIVE')
        await this.checkOverlap(
          tx,
          existing.serviceId,
          {
            species: existing.species!,
            minWeight: String(existing.minWeight),
            maxWeight: existing.maxWeight?.toString(),
            price: Number(existing.price),
          },
          existing.id,
        );
      const result = await tx.servicePrice.update({
        where: { id: existing.id },
        data: { status },
      });
      await this.audit(tx, actor, 'PRICE_STATUS', 'SERVICE_PRICE', result.id, { oldStatus: existing.status, newStatus: status });
      return result;
    });
  }

  async reminderConfig(serviceId: string) {
    const service = await this.service(serviceId);
    return this.db.reminderConfig.findFirst({
      where: { serviceId: service.id, status: 'ACTIVE' },
    });
  }

  async putReminderConfig(serviceId: string, body: ReminderConfigDto, actor?: Actor) {
    const service = await this.service(serviceId);
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`reminder:${service.id}`}, 0))`;
      const existing = await tx.reminderConfig.findFirst({
        where: { serviceId: service.id, status: 'ACTIVE' },
      });
      const result = existing
        ? await tx.reminderConfig.update({
          where: { id: existing.id },
          data: { reminderDays: body.reminderDays },
        })
        : await tx.reminderConfig.create({
        data: { serviceId: service.id, reminderDays: body.reminderDays },
      });
      await this.audit(tx, actor, 'SAVE_REMINDER_CONFIG', 'REMINDER_CONFIG', result.id, { serviceId: service.id.toString(), oldDays: existing?.reminderDays ?? null, newDays: body.reminderDays });
      return result;
    });
  }
}
