import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateRoleRequestDto {
  @ApiPropertyOptional({
    description: 'Updated name of the role (custom roles only)',
    example: 'FIELD_COORDINATOR',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'Role name must contain only uppercase letters, numbers, and underscores',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the role responsibilities',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Full replacement set of privilege keys. When provided, replaces all existing privileges on the role.',
    type: [String],
    example: ['dashboard.view', 'geo_unit.edit'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, {
    message:
      'If privilegeKeys is provided, it must contain at least one privilege',
  })
  @ArrayUnique()
  @IsString({ each: true })
  privilegeKeys?: string[];
}
