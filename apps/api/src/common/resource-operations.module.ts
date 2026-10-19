import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminResourceOperationsController, CustomerResourceOperationsController } from './resource-operations.controller';

@Module({ imports: [PrismaModule], controllers: [AdminResourceOperationsController, CustomerResourceOperationsController] })
export class ResourceOperationsModule {}
