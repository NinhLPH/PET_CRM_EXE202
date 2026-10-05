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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
