import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateBookingDto {
  @Matches(/^[1-9]\d*$/) petId: string;
  @Matches(/^[1-9]\d*$/) serviceId: string;
  @IsString() @IsNotEmpty() bookingDate: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(9999999999) expectedBasePrice: number;
  @IsOptional() @IsString() note?: string;
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
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => SurchargeDto)
  surcharges: SurchargeDto[];
  @Type(() => Number) @IsInt() @Min(0) @Max(9999999999) discount: number;
}
