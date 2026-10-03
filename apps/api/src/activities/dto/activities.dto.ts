import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ActivityType } from '@prisma/client';

export class ActivityDto {
  @IsEnum(ActivityType) type: ActivityType;
  @IsString() @IsNotEmpty() content: string;
  @IsOptional() @Matches(/^[1-9]\d*$/) petId?: string;
}
