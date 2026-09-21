import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateAdminAssignmentDto {
  @ApiProperty({
    example: 5,
    description: 'Hierarchy Node ID (Point) where user is assigned',
  })
  @IsNotEmpty({ message: 'pointId is required' })
  @IsInt({ message: 'pointId must be an integer' })
  @Min(1, { message: 'pointId must be a positive integer' })
  @Type(() => Number)
  pointId: number;

  @ApiProperty({
    example: 1,
    description: 'Designation ID to hold at the selected point',
  })
  @IsNotEmpty({ message: 'designationId is required' })
  @IsInt({ message: 'designationId must be an integer' })
  @Min(1, { message: 'designationId must be a positive integer' })
  @Type(() => Number)
  designationId: number;

  @ApiPropertyOptional({
    example: 10,
    description:
      'User ID of the Reporting Authority manager (optional / nullable)',
    nullable: true,
  })
  @IsOptional()
  @IsInt({ message: 'reportingId must be an integer' })
  @Min(1, { message: 'reportingId must be a positive integer' })
  @Type(() => Number)
  reportingId?: number | null;
}

export class CreateAdminRequestDto {
  @ApiProperty({
    example: 'Rajendra',
    description: 'First name of the user',
  })
  @IsNotEmpty({ message: 'firstname is required' })
  @IsString()
  firstname: string;

  @ApiProperty({
    example: 'Sharma',
    description: 'Last name of the user',
  })
  @IsNotEmpty({ message: 'lastname is required' })
  @IsString()
  lastname: string;

  @ApiProperty({
    example: 'manager@example.com',
    description: 'Unique email address',
  })
  @IsNotEmpty({ message: 'email is required' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'Mobile phone number',
  })
  @IsOptional()
  @IsString()
  mobile?: string;

  country?: string;

  @ApiProperty({
    example: 'SecurePassword@123',
    description: 'Account password (minimum 6 characters)',
  })
  @IsNotEmpty({ message: 'password is required' })
  @MinLength(6, { message: 'password must be at least 6 characters long' })
  @IsString()
  password: string;

  @ApiProperty({
    example: 3,
    description:
      'Role ID to assign (e.g. 2 for ORGANIZATION_MEMBER or 3 for MANAGER)',
    type: Number,
  })
  @IsNotEmpty({ message: 'roleId is required' })
  @IsInt({ message: 'roleId must be an integer' })
  @Min(1, { message: 'roleId must be a positive integer' })
  @Type(() => Number)
  roleId: number;

  @ApiPropertyOptional({
    description:
      'Array of explicit organizational assignments, each binding a point, designation, and reporting authority',
    type: [CreateAdminAssignmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAdminAssignmentDto)
  assignments: CreateAdminAssignmentDto[];
}
