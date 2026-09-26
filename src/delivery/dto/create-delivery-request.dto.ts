import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, Length, ValidateIf } from 'class-validator';
import { DeliveryLogStatus } from '../../generated/prisma/enums';

export class MarkDeliveryLogRequestDto {
  @ApiProperty({
    description: 'Outcome of the delivery attempt',
    enum: [DeliveryLogStatus.Delivered, DeliveryLogStatus.Failed],
  })
  @IsEnum([DeliveryLogStatus.Delivered, DeliveryLogStatus.Failed], {
    message: 'status must be either Delivered or Failed',
  })
  status: DeliveryLogStatus;

  @ApiPropertyOptional({
    description:
      'Required when status is Failed — reason the parcel could not be delivered (e.g. consumer moved, not at home)',
  })
  @ValidateIf(
    (o: MarkDeliveryLogRequestDto) => o.status === DeliveryLogStatus.Failed,
  )
  @IsString()
  @Length(1, 300, {
    message: 'remarks is required when status is Failed',
  })
  remarks?: string;
}
