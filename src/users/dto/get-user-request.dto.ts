import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { SearchablePaginatedDto } from '@Common';
import { UserStatus } from '../../generated/prisma/enums';

export class GetUsersRequestDto extends SearchablePaginatedDto {
  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: UserStatus,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'status must be a valid UserStatus' })
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Filter by assigned Vibhag hierarchy node ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'vibhagId must be an integer' })
  @Min(1, { message: 'vibhagId must be a positive integer' })
  vibhagId?: number;

  @ApiPropertyOptional({
    description: 'Filter by assigned Jila hierarchy node ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'jilaId must be an integer' })
  @Min(1, { message: 'jilaId must be a positive integer' })
  jilaId?: number;

  @ApiPropertyOptional({
    description: 'Filter by assigned Khand hierarchy node ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'khandId must be an integer' })
  @Min(1, { message: 'khandId must be a positive integer' })
  khandId?: number;

  @ApiPropertyOptional({
    description: 'Filter by assigned Mandal hierarchy node ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'mandalId must be an integer' })
  @Min(1, { message: 'mandalId must be a positive integer' })
  mandalId?: number;

  @ApiPropertyOptional({
    description: 'Filter by assigned Gram (leaf hierarchy node) ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'gramId must be an integer' })
  @Min(1, { message: 'gramId must be a positive integer' })
  gramId?: number;

  @ApiPropertyOptional({
    description: 'Filter by the Admin who registered the user',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'registeredById must be an integer' })
  @Min(1, { message: 'registeredById must be a positive integer' })
  registeredById?: number;
}
