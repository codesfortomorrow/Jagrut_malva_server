import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
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
    example: 'Updated coordinator responsibilities for field logistics',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
