import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { SearchablePaginatedDto } from '@Common';
import { HierarchyLevel } from '../../generated/prisma/client';

export class GetUserDesignationsDto extends SearchablePaginatedDto {
  @ApiPropertyOptional({
    description: 'Filter assignments by user ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({
    description: 'Filter assignments by hierarchy node ID',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nodeId?: number;

  @ApiPropertyOptional({
    description: 'Filter assignments by designation ID',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  designationId?: number;

  @ApiPropertyOptional({
    description:
      'Filter assignments by hierarchy level of the designation/node',
    enum: HierarchyLevel,
    example: HierarchyLevel.Jila,
  })
  @IsOptional()
  @IsEnum(HierarchyLevel)
  level?: HierarchyLevel;

  @ApiPropertyOptional({
    description:
      'Filter by active status (true for current responsibilities, false for history)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}
