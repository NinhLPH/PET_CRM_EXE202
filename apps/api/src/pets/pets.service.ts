import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, id, page } from '../common/common';
import { PetDto, UpdatePetDto } from './dto/pets.dto';

@Injectable()
export class PetsService {
  constructor(private readonly db: PrismaService) {}

  async petList(customerId: bigint, query: { page?: string; limit?: string } = {}) {
    if (!customerId || !(await this.db.customer.findUnique({ where: { id: customerId }, select: { id: true } })))
      throw new NotFoundException('Không tìm thấy khách hàng');
    const p = page(query);
    const [items, total] = await Promise.all([
      this.db.pet.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take }),
      this.db.pet.count({ where: { customerId } }),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }

  async pet(petId: string, actor: Actor, admin = false) {
    const pet = await this.db.pet.findUnique({ where: { id: id(petId) } });
    if (!pet) throw new NotFoundException('Không tìm thấy thú cưng');
    if (!admin && pet.customerId !== actor.customerId) throw new ForbiddenException();
    return pet;
  }

  private petData(body: Partial<PetDto>) {
    if (body.weight !== undefined && (Number(body.weight) <= 0 || Number(body.weight) > 999.99))
      throw new BadRequestException('Cân nặng phải > 0 và ≤ 999,99 kg');
    return {
      ...body,
      name: body.name?.trim(),
      weight: body.weight === undefined ? undefined : new Prisma.Decimal(body.weight),
    };
  }

  async createPet(customerId: bigint, body: PetDto) {
    if (!(await this.db.customer.findUnique({ where: { id: customerId } })))
      throw new NotFoundException('Không tìm thấy khách hàng');
    return this.db.pet.create({
      data: { ...this.petData(body), name: body.name.trim(), species: body.species, weight: new Prisma.Decimal(body.weight), customerId },
    });
  }

  async updatePet(petId: string, actor: Actor, body: UpdatePetDto, admin = false) {
    const pet = await this.pet(petId, actor, admin);
    return this.db.pet.update({ where: { id: pet.id }, data: this.petData(body) });
  }

  async deletePet(petId: string, actor: Actor, admin = false) {
    const pet = await this.pet(petId, actor, admin);
    const [bookings, reminders, activities] = await Promise.all([
      this.db.booking.count({ where: { petId: pet.id } }),
      this.db.petReminder.count({ where: { petId: pet.id } }),
      this.db.crmActivity.count({ where: { petId: pet.id } }),
    ]);
    if (bookings || reminders || activities)
      throw new ConflictException('Thú cưng đã có lịch sử booking, reminder hoặc hoạt động CRM');
    await this.db.pet.delete({ where: { id: pet.id } });
    return { success: true };
  }
}
