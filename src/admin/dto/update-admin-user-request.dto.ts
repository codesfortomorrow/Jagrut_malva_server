import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateAdminAssignmentDto } from './create-admin-request.dto';

export class UpdateAdminUserRequestDto {
  @ApiPropertyOptional({
    example: 'Rajendra',
    description: 'First Name of the user',
  })
  @IsOptional()
  @IsString()
  firstname?: string;

  @ApiPropertyOptional({
    example: 'Sharma',
    description: 'Last Name of the user',
  })
  @IsOptional()
  @IsString()
  lastname?: string;

  @ApiPropertyOptional({
    example: 'rajendra.sharma@example.com',
    description: 'Email address of the user',
  })
  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'Mobile phone number',
  })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'Role ID assigned to the user',
    type: Number,
  })
  @IsOptional()
  @IsInt({ message: 'roleId must be an integer' })
  @Min(1, { message: 'roleId must be a positive integer' })
  @Type(() => Number)
  roleId?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Hierarchy Point (nodeId) assigned to the user',
    type: Number,
  })
  @IsOptional()
  @IsInt({ message: 'pointId must be an integer' })
  @Min(1, { message: 'pointId must be a positive integer' })
  @Type(() => Number)
  pointId?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Designation ID assigned to the user at the hierarchy point',
    type: Number,
  })
  @IsOptional()
  @IsInt({ message: 'designationId must be an integer' })
  @Min(1, { message: 'designationId must be a positive integer' })
  @Type(() => Number)
  designationId?: number;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Reporting Authority (Admin User ID) to whom this user reports (optional/nullable)',
    type: Number,
    nullable: true,
  })
  @IsOptional()
  @IsInt({ message: 'reportingId must be an integer' })
  @Min(1, { message: 'reportingId must be a positive integer' })
  @Type(() => Number)
  reportingId?: number | null;

  @ApiPropertyOptional({
    description:
      'Array of explicit organizational assignments (optional alternative to flat pointId/designationId)',
    type: [CreateAdminAssignmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAdminAssignmentDto)
  assignments?: CreateAdminAssignmentDto[];
}
