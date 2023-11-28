import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsMobilePhone, IsOptional } from 'class-validator';

export class ForgotPasswordRequestDto {
  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}
