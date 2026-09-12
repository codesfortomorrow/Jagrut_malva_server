import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleRequestDto {
  @ApiProperty({
    description: 'Unique name of the role (letters, numbers, and underscores)',
    example: 'COORDINATOR',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'Role name must contain only uppercase letters, numbers, and underscores',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the role responsibilities',
    example: 'Coordinator responsible for area distribution logistics',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
