import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCustomerActivitiesApiController } from './activities.controller';
import { ActivitiesService } from './activities.service';

@Module({
  imports: [PrismaModule, CustomersModule],
  controllers: [AdminCustomerActivitiesApiController],
  providers: [ActivitiesService],
})
export class ActivitiesModule {}
