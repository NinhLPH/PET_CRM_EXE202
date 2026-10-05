import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) fullName?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
}
