import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserRequestDto {
  @ApiProperty({
    example: 'Rajendra',
    description: 'First name of the user',
  })
  @IsNotEmpty()
  @IsString()
  firstname: string;

  @ApiPropertyOptional({
    example: 'Sharma',
    description: 'Last name of the user',
  })
  @IsOptional()
  @IsString()
  lastname?: string;

  @ApiProperty({
    example: 'manager@example.com',
    description: 'Unique email address',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'Mobile phone number',
  })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({
    example: '+91',
    description: 'Dial code',
    default: '+91',
  })
  @IsOptional()
  @IsString()
  dialCode?: string;

  @ApiPropertyOptional({
    example: 'IN',
    description: 'Country code',
    default: 'IN',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    example: 'SecurePassword@123',
    description: 'Account password (minimum 6 characters)',
  })
  @IsNotEmpty()
  @MinLength(6)
  @IsString()
  password: string;

  @ApiPropertyOptional({
    example: [3],
    description:
      'Array of Role IDs to assign (e.g. 2 for ORGANIZATION_MEMBER, 3 for MANAGER)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  roleIds?: number[];

  @ApiPropertyOptional({
    example: 5,
    description: 'Hierarchy Node ID (Point) to assign this user to',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  pointId?: number;

  @ApiPropertyOptional({
    example: [1],
    description: 'Array of Designation IDs to assign at the selected point',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  designationIds?: number[];

  @ApiPropertyOptional({
    example: 10,
    description: 'User ID of the Reporting Authority manager',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  reportingId?: number;
}
