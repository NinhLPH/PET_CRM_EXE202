import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthRateGuard, SessionGuard } from '../common/common';
import { AdminIdentityController, AuthApiController } from './auth.controller';
import { AuthWorkflowService } from './auth.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthApiController, AdminIdentityController],
  providers: [
    AuthWorkflowService,
    AuthRateGuard,
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AuthModule {}
