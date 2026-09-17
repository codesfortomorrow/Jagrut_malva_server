import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SearchablePaginatedDto } from '@Common';
import { HierarchyLevel, HierarchyStatus } from '../../generated/prisma/client';

export class GetDesignationsDto extends SearchablePaginatedDto {
  @ApiPropertyOptional({
    description: 'Filter designations by hierarchy level',
    enum: HierarchyLevel,
    example: HierarchyLevel.Jila,
  })
  @IsOptional()
  @IsEnum(HierarchyLevel)
  level?: HierarchyLevel;

  @ApiPropertyOptional({
    description: 'Filter designations by status (Active / InActive)',
    enum: HierarchyStatus,
    example: HierarchyStatus.Active,
  })
  @IsOptional()
  @IsEnum(HierarchyStatus)
  status?: HierarchyStatus;
}
