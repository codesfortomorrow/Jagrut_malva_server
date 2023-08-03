import {
  IsEmail,
  IsMobilePhone,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class ResetPasswordRequestDto {
  @IsString()
  code: string;

  @IsStrongPassword()
  newPassword: string;

  @IsOptional()
  @IsMobilePhone(undefined, { strictMode: true })
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
