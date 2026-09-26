import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { DeliveryLogStatus } from '../../generated/prisma/enums';

export class MarkDeliveryLogRequestDto {
  @ApiProperty({
    enum: DeliveryLogStatus,
    example: DeliveryLogStatus.Delivered,
  })
  @IsEnum(DeliveryLogStatus)
  status: DeliveryLogStatus;

  @ApiProperty({
    example: '2026-09-26T10:30:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  deliveryDate: string;

  @ApiPropertyOptional({
    example: 'Delivered to consumer personally',
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({
    example: 'delivery-proofs/dispatch-123/user-456.jpg',
  })
  @IsOptional()
  @IsString()
  deliveryProof?: string;

  @ApiPropertyOptional({
    example: 123,
  })
  @IsOptional()
  @IsInt()
  dispatchEntryId?: number;

  @ApiPropertyOptional({
    example: 456,
  })
  @IsOptional()
  @IsInt()
  issueId?: number;
}
