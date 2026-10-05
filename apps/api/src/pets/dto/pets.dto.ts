import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Species } from '@prisma/client';

export class PetDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsEnum(Species) species: Species;
  @IsOptional() @IsString() @MaxLength(100) breed?: string;
  @Matches(/^(?:[1-9]\d{0,2}|0)(?:\.\d{1,2})?$/) weight: string;
  @IsOptional() @IsString() allergyNote?: string;
  @IsOptional() @IsString() specialNote?: string;
}

export class UpdatePetDto extends PartialType(PetDto) {}
