import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCustomerPetsApiController, AdminPetsApiController, PetsApiController } from './pets.controller';
import { PetsService } from './pets.service';

@Module({
  imports: [PrismaModule],
  controllers: [PetsApiController, AdminPetsApiController, AdminCustomerPetsApiController],
  providers: [PetsService],
})
export class PetsModule {}
