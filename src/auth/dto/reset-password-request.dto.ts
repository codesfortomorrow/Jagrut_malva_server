import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsMobilePhone,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class ResetPasswordRequestDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsStrongPassword()
  newPassword: string;

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
