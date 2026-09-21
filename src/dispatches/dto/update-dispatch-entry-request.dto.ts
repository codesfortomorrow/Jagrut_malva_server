import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { DeliveryMethod } from '../../generated/prisma/enums';

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

  @ApiPropertyOptional({
    description: 'Method of parcel delivery (Courier or Manual)',
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
}
