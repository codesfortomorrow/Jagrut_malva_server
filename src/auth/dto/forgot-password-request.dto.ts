import { IsEmail, IsMobilePhone, IsOptional } from 'class-validator';

export class ForgotPasswordRequestDto {
  @IsOptional()
  @IsMobilePhone(undefined, { strictMode: true })
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
