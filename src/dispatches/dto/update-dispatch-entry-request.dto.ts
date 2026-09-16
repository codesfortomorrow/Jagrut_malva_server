import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class UpdateDispatchEntryRequestDto {
  @ApiPropertyOptional({
    description: 'Dispatch timestamp',
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
