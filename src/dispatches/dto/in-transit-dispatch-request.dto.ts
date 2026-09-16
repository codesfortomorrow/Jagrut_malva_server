import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class InTransitDispatchRequestDto {
  @ApiPropertyOptional({
    description:
      'Courier or shipment tracking link to add/update when moving to InTransit',
    example: 'https://track.courier.com/TRK123456',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  trackingLink?: string;
}
