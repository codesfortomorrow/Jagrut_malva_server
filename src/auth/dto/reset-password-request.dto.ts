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
  @IsMobilePhone(
    undefined,
    { strictMode: true },
    {
      message:
        'The mobile number you entered is invalid, please provide a valid mobile number',
    },
  )
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
