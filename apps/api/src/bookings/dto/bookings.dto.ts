import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsEnum } from 'class-validator';
import { BookingSource } from '@prisma/client';

export class CreateBookingDto {
  @Matches(/^[1-9]\d*$/) petId: string;
  @Matches(/^[1-9]\d*$/) serviceId: string;
  @IsString() @IsNotEmpty() bookingDate: string;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9999999999)
  expectedBasePrice: number;
  @IsOptional() @IsString() note?: string;
}
export class AdminCreateBookingDto extends CreateBookingDto {
  @Matches(/^[1-9]\d*$/) customerId: string;
  @IsEnum(BookingSource) source: BookingSource;
  @IsEnum(['PENDING', 'CONFIRMED']) targetStatus: 'PENDING' | 'CONFIRMED';
}
export class CancelDto {
  @IsOptional() @IsString() @MaxLength(255) reason?: string;
}
export class SurchargeDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(9999999999) amount: number;
  @IsOptional() @IsString() @MaxLength(255) note?: string;
}
export class CompleteDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SurchargeDto)
  surcharges: SurchargeDto[];
  @Type(() => Number) @IsInt() @Min(0) @Max(9999999999) discount: number;
}
export class RescheduleDto {
  @IsString() @IsNotEmpty() bookingDate: string;
  @IsString() @IsNotEmpty() @MaxLength(255) reason: string;
}
export class AdjustmentDto {
  @Type(() => Number) @IsInt() delta: number;
  @IsString() @IsNotEmpty() @MaxLength(255) reason: string;
  @IsOptional() @Matches(/^[1-9]\d*$/) reversalRef?: string;
}
