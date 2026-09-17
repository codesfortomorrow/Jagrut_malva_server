import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { HierarchyLevel } from '../../generated/prisma/client';

export class CreateDesignationDto {
  @ApiProperty({
    description: 'Name of the designation',
    example: 'Jila Prabhari',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Hierarchy level this designation belongs to',
    enum: HierarchyLevel,
    example: HierarchyLevel.Jila,
  })
  @IsEnum(HierarchyLevel)
  level: HierarchyLevel;

  @ApiPropertyOptional({
    description: 'Optional description of the designation and responsibilities',
    example:
      'Responsible for overseeing district-level publication distribution',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
