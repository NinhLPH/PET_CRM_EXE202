import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Actor } from '../common/common';
import { ProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly db: PrismaService) {}

  async profile(actor: Actor) {
    if (!actor.customerId)
      throw new NotFoundException('Hồ sơ khách hàng không tồn tại');
    return this.db.customer.findUniqueOrThrow({
      where: { id: actor.customerId },
      select: { id: true, fullName: true, phone: true, address: true },
    });
  }

  async updateProfile(actor: Actor, body: ProfileDto) {
    if (!actor.customerId) throw new NotFoundException();
    return this.db.customer.update({
      where: { id: actor.customerId },
      data: { fullName: body.fullName?.trim(), address: body.address },
      select: { id: true, fullName: true, phone: true, address: true },
    });
  }
}
