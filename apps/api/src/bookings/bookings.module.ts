import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminBookingsApiController, AdminDashboardApiController, BookingsApiController } from './bookings.controller';
import { BookingWorkflowService } from './bookings.service';

@Module({
  imports: [PrismaModule],
  controllers: [BookingsApiController, AdminDashboardApiController, AdminBookingsApiController],
  providers: [BookingWorkflowService],
})
export class BookingsModule {}
