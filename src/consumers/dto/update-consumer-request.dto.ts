import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { ConsumerStatus } from '../../generated/prisma/client';

export class UpdateConsumerRequestDto {
  @ApiPropertyOptional({
    description: 'Full name of the consumer',
    example: 'Rameshwar Sharma',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'fullName cannot be empty if provided' })
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: "Father's name of the consumer",
    example: 'Shri Ramchandra Sharma',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'fatherName cannot be empty if provided' })
  @IsString()
  fatherName?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp mobile number (10 digits)',
    example: '9826012345',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : String(value || ''),
  )
  @Matches(/^[6-9]\d{9}$/, {
    message: 'whatsappMobile must be a valid 10-digit Indian mobile number',
  })
  whatsappMobile?: string;

  @ApiPropertyOptional({
    description: 'Additional / alternate contact number',
    example: '9826099999',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim()
      : value
        ? String(value)
        : undefined,
  )
  @Matches(/^[6-9]\d{9}$/, {
    message: 'additionalMobile must be a valid 10-digit mobile number',
  })
  additionalMobile?: string;

  @ApiPropertyOptional({
    description: 'Full street / residential address',
    example: 'House No. 45, Main Road, Near Shiv Temple',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  fullAddress?: string;

  @ApiPropertyOptional({
    description: 'Postal village / Gram name (free-text legacy support)',
    example: 'Badi Kalmer',
  })
  @IsOptional()
  @Transform(({ value, obj }) => {
    const val = value ?? obj?.gram;
    return typeof val === 'string' && val.trim() ? val.trim() : undefined;
  })
  @IsString()
  postalGram?: string;

  @ApiPropertyOptional({
    description: 'Post office name',
    example: 'Hatod',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsString()
  post?: string;

  @ApiPropertyOptional({
    description: 'Tehsil name',
    example: 'Depalpur',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsString()
  tehsil?: string;

  @ApiPropertyOptional({
    description: 'Postal pincode',
    example: '453111',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null ? String(value).trim() : undefined,
  )
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({
    description: 'Hierarchy Jila Node ID (Sangh Yojna Anusar)',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'jilaId must be an integer' })
  @Min(1)
  jilaId?: number;

  @ApiPropertyOptional({
    description: 'Hierarchy Khand Node ID (child of selected Jila)',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'khandId must be an integer' })
  @Min(1)
  khandId?: number;

  @ApiPropertyOptional({
    description: 'Hierarchy Mandal Node ID (child of selected Khand)',
    example: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'mandalId must be an integer' })
  @Min(1)
  mandalId?: number;

  @ApiPropertyOptional({
    description: 'Hierarchy Gram Node ID (child of selected Mandal)',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'gramId must be an integer' })
  @Min(1)
  gramId?: number;

  @ApiPropertyOptional({
    description: 'Registrar / Karyakarta name',
    example: 'Jayendra Parmar',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsString()
  registrarName?: string;

  @ApiPropertyOptional({
    description: 'Registrar / Karyakarta mobile number',
    example: '9826011111',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null ? String(value).trim() : undefined,
  )
  @IsString()
  registrarMobile?: string;

  @ApiPropertyOptional({
    description: 'Status of the consumer (Active or InActive)',
    enum: ConsumerStatus,
  })
  @IsOptional()
  @IsEnum(ConsumerStatus, {
    message: 'status must be either Active or InActive',
  })
  status?: ConsumerStatus;
}
