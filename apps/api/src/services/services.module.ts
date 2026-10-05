import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminPricesApiController, AdminServicesApiController, PublicServicesApiController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicServicesApiController, AdminServicesApiController, AdminPricesApiController],
  providers: [ServicesService],
})
export class ServicesModule {}
