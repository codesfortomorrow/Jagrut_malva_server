import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaymentMode, SubscriptionPlan } from 'src/generated/prisma/enums';

export class NewSubscriptionRequestDto {
  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.Yearly })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiProperty({
    example: '2026-10-01',
    description: 'Subscription start date',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2027-10-01', description: 'Subscription end date' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: PaymentMode, example: PaymentMode.UPI })
  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @ApiPropertyOptional({
    example: '425612345678',
    description:
      'UTR / transaction reference. Required for every mode except Cash.',
  })
  @ValidateIf(
    (o: NewSubscriptionRequestDto) => o.paymentMode !== PaymentMode.Cash,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  utrNumber?: string;

  @ApiPropertyOptional({ example: 'Paid at Indore office' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;

  @ApiPropertyOptional({
    example: 1001,
    description: 'ID of this record in the third-party system',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  externalId?: number;
}
