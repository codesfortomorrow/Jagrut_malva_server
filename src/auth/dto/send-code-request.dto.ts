import { IsEmail, IsEnum, IsMobilePhone, IsOptional } from 'class-validator';

export enum SendCodeRequestType {}

export class SendCodeRequestDto {
  @IsOptional()
  @IsMobilePhone(undefined, { strictMode: true })
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(SendCodeRequestType)
  type: SendCodeRequestType;
}
