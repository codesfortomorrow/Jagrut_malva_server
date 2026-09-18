import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateConsumerRequestDto {
  @ApiProperty({
    description: 'Full name of the consumer',
    example: 'Rameshwar Sharma',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'fullName is required' })
  @IsString()
  fullName: string;

  @ApiProperty({
    description: "Father's name of the consumer",
    example: 'Shri Ramchandra Sharma',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'fatherName is required' })
  @IsString()
  fatherName: string;

  @ApiProperty({
    description: 'WhatsApp mobile number (10 digits)',
    example: '9826012345',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : String(value || ''),
  )
  @IsNotEmpty({ message: 'whatsappMobile is required' })
  @Matches(/^[6-9]\d{9}$/, {
    message: 'whatsappMobile must be a valid 10-digit Indian mobile number',
  })
  whatsappMobile: string;

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

  @ApiProperty({
    description: 'Full street / residential address',
    example: 'House No. 45, Main Road, Near Shiv Temple',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'fullAddress is required' })
  @IsString()
  fullAddress: string;

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

  @ApiProperty({
    description: 'Hierarchy Jila Node ID (Sangh Yojna Anusar)',
    example: 2,
  })
  @Type(() => Number)
  @IsInt({ message: 'jilaId must be an integer' })
  @Min(1)
  @IsNotEmpty({ message: 'jilaId is required' })
  jilaId: number;

  @ApiProperty({
    description: 'Hierarchy Khand / Nagar Node ID (child of selected Jila)',
    example: 3,
  })
  @Type(() => Number)
  @IsInt({ message: 'khandId must be an integer' })
  @Min(1)
  @IsNotEmpty({ message: 'khandId is required' })
  khandId: number;

  @ApiProperty({
    description: 'Hierarchy Mandal / Basti Node ID (child of selected Khand)',
    example: 4,
  })
  @Type(() => Number)
  @IsInt({ message: 'mandalId must be an integer' })
  @Min(1)
  @IsNotEmpty({ message: 'mandalId is required' })
  mandalId: number;

  @ApiProperty({
    description: 'Hierarchy Gram / Mohalla Node ID (child of selected Mandal)',
    example: 5,
  })
  @Type(() => Number)
  @IsInt({ message: 'gramId must be an integer' })
  @Min(1)
  @IsNotEmpty({ message: 'gramId is required' })
  gramId: number;

  @ApiPropertyOptional({
    description:
      'Registrar / Karyakarta name (auto-fills from logged in user if omitted)',
    example: 'Jayendra Parmar',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsString()
  registrarName?: string;

  @ApiPropertyOptional({
    description:
      'Registrar / Karyakarta mobile number (auto-fills from logged in user if omitted)',
    example: '9826011111',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null ? String(value).trim() : undefined,
  )
  @IsString()
  registrarMobile?: string;
}
