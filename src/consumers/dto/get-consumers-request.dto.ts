import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { SearchablePaginatedDto } from '@Common';
import { ConsumerStatus } from '../../generated/prisma/client';

export class GetConsumersRequestDto extends SearchablePaginatedDto {
  @ApiPropertyOptional({
    description: 'Filter by Hierarchy Jila Node ID',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jilaId?: number;

  @ApiPropertyOptional({
    description: 'Filter by Hierarchy Khand Node ID',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  khandId?: number;

  @ApiPropertyOptional({
    description: 'Filter by Hierarchy Mandal Node ID',
    example: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mandalId?: number;

  @ApiPropertyOptional({
    description: 'Filter by Hierarchy Gram Node ID',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gramId?: number;

  @ApiPropertyOptional({
    description: 'Filter by consumer status',
    enum: ConsumerStatus,
  })
  @IsOptional()
  @IsEnum(ConsumerStatus)
  status?: ConsumerStatus;
}
