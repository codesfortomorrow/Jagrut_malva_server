import { IsEmail, IsMobilePhone, IsOptional } from 'class-validator';

export class ForgotPasswordRequestDto {
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
