import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { SearchablePaginatedDto } from '@Common';
import { AdminStatus } from '../../generated/prisma/enums';

export class GetAdminUsersRequestDto extends SearchablePaginatedDto {
  @ApiPropertyOptional({
    description: 'Filter by assigned Role ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'roleId must be an integer' })
  @Min(1, { message: 'roleId must be a positive integer' })
  roleId?: number;

  @ApiPropertyOptional({
    description: 'Filter by admin user status',
    enum: AdminStatus,
  })
  @IsOptional()
  @IsEnum(AdminStatus, { message: 'status must be a valid AdminStatus' })
  status?: AdminStatus;

  @ApiPropertyOptional({
    description: 'Filter by assigned Hierarchy Point (Node) ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pointId must be an integer' })
  @Min(1, { message: 'pointId must be a positive integer' })
  pointId?: number;

  @ApiPropertyOptional({
    description: 'Filter by assigned Hierarchy Designation ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'designationId must be an integer' })
  @Min(1, { message: 'designationId must be a positive integer' })
  designationId?: number;
}
