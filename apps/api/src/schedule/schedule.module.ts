import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import {
  AvailabilityController,
  ScheduleController,
} from './schedule.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ScheduleService],
  controllers: [AvailabilityController, ScheduleController],
  exports: [ScheduleService],
})
export class ScheduleModule {}
