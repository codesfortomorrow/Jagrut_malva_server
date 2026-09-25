import { ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

@ApiSchema({ name: 'UpdateAdminProfileDetailsRequestDto' })
export class UpdateProfileDetailsRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  roleId?: number;
}
