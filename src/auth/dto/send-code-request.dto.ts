import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsMobilePhone,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum SendCodeRequestType {
  Register = 'register',
}

export class SendCodeRequestDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  country?: string;

  @ApiProperty({ enum: SendCodeRequestType })
  @IsEnum(SendCodeRequestType)
  type: SendCodeRequestType;
}
