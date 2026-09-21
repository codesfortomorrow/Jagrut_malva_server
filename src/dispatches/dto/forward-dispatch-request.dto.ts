import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DeliveryMethod } from '../../generated/prisma/enums';

export class ForwardDispatchRequestDto {
  @ApiProperty({
    description: 'Next downstream destination hierarchy node ID',
    example: 3,
  })
  @Type(() => Number)
  @IsInt({ message: 'toPointId must be an integer' })
  @Min(1)
  @IsNotEmpty({ message: 'toPointId is required' })
  toPointId: number;

  @ApiProperty({
    description: 'Number of copies to forward (must be greater than 0)',
    example: 200,
  })
  @Type(() => Number)
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be greater than 0' })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Dispatch timestamp for the forwarded consignment',
    example: '2026-09-17T10:00:00.000Z',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate({ message: 'dispatchDate must be a valid date' })
  dispatchDate?: Date;

  @ApiPropertyOptional({
    description: 'Courier or tracking link for the forwarded shipment',
    example: 'https://track.courier.com/FWD789012',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  trackingLink?: string;

  @ApiPropertyOptional({
    description:
      'Method of parcel delivery for forwarded consignment (defaults to source dispatch delivery method if omitted)',
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
