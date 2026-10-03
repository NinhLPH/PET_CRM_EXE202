import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminRemindersApiController } from './reminders.controller';
import { ReminderWorkflowService } from './reminders.service';

@Module({ imports: [PrismaModule], controllers: [AdminRemindersApiController], providers: [ReminderWorkflowService] })
export class RemindersModule {}
