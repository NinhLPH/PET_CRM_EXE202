import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ContactMethod } from '@prisma/client';

export class ContactDto {
  @IsEnum(ContactMethod) method: ContactMethod;
  @IsOptional() @IsString() note?: string;
}
