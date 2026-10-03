import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ServiceStatus, Species } from '@prisma/client';

export class ServiceDto {
  @IsString() @IsNotEmpty() @MaxLength(100) serviceName: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) estimatedDuration?: number;
}
export class UpdateServiceDto extends PartialType(ServiceDto) {}
export class StatusDto {
  @IsEnum(ServiceStatus) status: ServiceStatus;
}
export class PriceDto {
  @IsEnum(Species) species: Species;
  @Matches(/^(?:\d{1,3})(?:\.\d{1,2})?$/) minWeight: string;
  @IsOptional() @Matches(/^(?:\d{1,3})(?:\.\d{1,2})?$/) maxWeight?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(9999999999) price: number;
}
export class ReminderConfigDto {
  @Type(() => Number) @IsInt() @Min(8) @Max(364) reminderDays: number;
}
