import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CustomerDto {
  @IsString() @IsNotEmpty() @MaxLength(100) fullName: string;
  @Matches(/^0\d{9}$/) phone: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() note?: string;
}

export class UpdateCustomerDto extends PartialType(CustomerDto) {}
