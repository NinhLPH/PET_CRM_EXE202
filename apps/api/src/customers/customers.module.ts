import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCustomersApiController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminCustomersApiController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
