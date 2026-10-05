import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

function MinLengthPassword() {
  return Matches(/^.{8,}$/, { message: 'Mật khẩu tối thiểu 8 ký tự' });
}

export class RegisterDto {
  @IsString() @IsNotEmpty() @MaxLength(100) fullName: string;
  @Matches(/^0\d{9}$/) phone: string;
  @IsString() @MinLengthPassword() password: string;
  @IsString() confirmPassword: string;
}

export class LoginDto {
  @Matches(/^0\d{9}$/) phone: string;
  @IsString() @IsNotEmpty() password: string;
}
