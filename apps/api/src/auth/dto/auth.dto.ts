import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IdentityPurpose } from '@prisma/client';

function MinLengthPassword() {
  return Matches(/^.{8,}$/, { message: 'Mật khẩu tối thiểu 8 ký tự' });
}

export class RegisterDto {
  @IsString() @IsNotEmpty() @MaxLength(100) fullName: string;
  @Matches(/^0\d{9}$/) phone: string;
  @IsString() @MinLengthPassword() password: string;
  @IsString() confirmPassword: string;
  @IsOptional() @IsString() verificationToken?: string;
}

export class LoginDto {
  @Matches(/^0\d{9}$/) phone: string;
  @IsString() @IsNotEmpty() password: string;
}

export class IssueEvidenceDto {
  @Matches(/^0\d{9}$/) phone: string;
  @IsEnum(IdentityPurpose) purpose: IdentityPurpose;
  @IsString() @IsNotEmpty() @MaxLength(500) evidenceSummary: string;
  @IsOptional() @Matches(/^[1-9]\d*$/) customerId?: string;
}

export class RecoverDto {
  @Matches(/^0\d{9}$/) phone: string;
  @IsString() @IsNotEmpty() verificationToken: string;
  @IsString() @MinLengthPassword() newPassword: string;
  @IsString() confirmPassword: string;
}

export class RecoveryRequestDto {
  @Matches(/^0\d{9}$/) phone: string;
}
