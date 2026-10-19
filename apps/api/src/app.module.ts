import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivitiesModule } from './activities/activities.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { CustomersModule } from './customers/customers.module';
import { PetsModule } from './pets/pets.module';
import { RemindersModule } from './reminders/reminders.module';
import { ServicesModule } from './services/services.module';
import { UsersModule } from './users/users.module';
import { ScheduleModule } from './schedule/schedule.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './audit/audit.module';
import { ResourceOperationsModule } from './common/resource-operations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    PetsModule,
    BookingsModule,
    CustomersModule,
    ServicesModule,
    ActivitiesModule,
    RemindersModule,
    ScheduleModule,
    ReportsModule,
    HealthModule,
    AuditModule,
    ResourceOperationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
