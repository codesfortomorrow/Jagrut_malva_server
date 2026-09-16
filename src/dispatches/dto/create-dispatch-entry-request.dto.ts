import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateDispatchEntryRequestDto {
  @ApiProperty({
    description: 'PublishIssue ID to dispatch',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'issueId must be an integer' })
  @Min(1)
  @IsNotEmpty({ message: 'issueId is required' })
  issueId: number;

  @ApiPropertyOptional({
    description:
      'Source hierarchy node ID (omit or pass null for Central Publisher dispatch to root Sangh)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'fromPointId must be an integer' })
  @Min(1)
  fromPointId?: number;

  @ApiProperty({
    description: 'Destination hierarchy node ID',
    example: 2,
  })
  @Type(() => Number)
  @IsInt({ message: 'toPointId must be an integer' })
  @Min(1)
  @IsNotEmpty({ message: 'toPointId is required' })
  toPointId: number;

  @ApiProperty({
    description: 'Number of copies to dispatch (must be greater than 0)',
    example: 500,
  })
  @Type(() => Number)
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be greater than 0' })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Dispatch timestamp (defaults to current time)',
    example: '2026-09-16T12:00:00.000Z',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate({ message: 'dispatchDate must be a valid date' })
  dispatchDate?: Date;

  @ApiPropertyOptional({
    description: 'Courier or shipment tracking link/code',
    example: 'https://track.courier.com/TRK123456',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  trackingLink?: string;
}
