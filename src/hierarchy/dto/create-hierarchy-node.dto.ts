import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { HierarchyLevel } from '../../generated/prisma/client';

export class CreateHierarchyNodeDto {
  @ApiProperty({
    description: 'Name of the hierarchy node',
    example: 'Indore Jila',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Hierarchy level for this node',
    enum: HierarchyLevel,
    example: HierarchyLevel.Jila,
  })
  @IsEnum(HierarchyLevel)
  level: HierarchyLevel;

  @ApiPropertyOptional({
    description:
      'Parent node ID. Required for all levels except Prant (root). Prant must have no parent.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number;

  @ApiPropertyOptional({
    description: 'Optional description of this node',
    example: 'Indore district covering urban and rural areas',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
