import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MeApiController } from './users.controller';
import { UsersService } from './users.service';

@Module({ imports: [PrismaModule], controllers: [MeApiController], providers: [UsersService] })
export class UsersModule {}
