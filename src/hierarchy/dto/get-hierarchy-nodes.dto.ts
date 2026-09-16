import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { HierarchyLevel, HierarchyStatus } from '../../generated/prisma/client';
import { SearchablePaginatedDto } from '@Common';

export class GetHierarchyNodesDto extends SearchablePaginatedDto {
  @ApiPropertyOptional({
    description: 'Filter nodes by their hierarchy level',
    enum: HierarchyLevel,
  })
  @IsOptional()
  @IsEnum(HierarchyLevel)
  level?: HierarchyLevel;

  @ApiPropertyOptional({
    description: 'Filter nodes by status',
    enum: HierarchyStatus,
  })
  @IsOptional()
  @IsEnum(HierarchyStatus)
  status?: HierarchyStatus;

  @ApiPropertyOptional({
    description: 'Filter by parent node ID (direct children only)',
  })
  @IsOptional()
  parentId?: number;
}
