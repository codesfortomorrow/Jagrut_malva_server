import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { SearchablePaginatedDto } from '@Common';
import { DeliveryMethod, DispatchStatus } from '../../generated/prisma/enums';

export class GetDispatchesRequestDto extends SearchablePaginatedDto {
  @ApiPropertyOptional({
    description: 'Filter by PublishIssue ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  issueId?: number;

  @ApiPropertyOptional({
    description: 'Filter by source hierarchy node ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fromPointId?: number;

  @ApiPropertyOptional({
    description: 'Filter by destination hierarchy node ID',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  toPointId?: number;

  @ApiPropertyOptional({
    description: 'Filter by dispatch status',
    enum: DispatchStatus,
  })
  @IsOptional()
  @IsEnum(DispatchStatus, {
    message: 'status must be a valid DispatchStatus',
  })
  status?: DispatchStatus;

  @ApiPropertyOptional({
    description: 'Filter by parcel delivery method (Courier or Manual)',
    enum: DeliveryMethod,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.toLowerCase() === 'courier') return DeliveryMethod.Courier;
      if (trimmed.toLowerCase() === 'manual') return DeliveryMethod.Manual;
    }
    return value;
  })
  @IsEnum(DeliveryMethod, {
    message: 'deliveryMethod must be either Courier or Manual',
  })
  deliveryMethod?: DeliveryMethod;

  @ApiPropertyOptional({
    description: 'Filter dispatches on or after this date',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate({ message: 'startDate must be a valid date' })
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter dispatches on or before this date',
    example: '2026-09-30T23:59:59.999Z',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate({ message: 'endDate must be a valid date' })
  endDate?: Date;
}
