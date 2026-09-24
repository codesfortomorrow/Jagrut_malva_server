import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserRequestDto {
  @ApiProperty({ example: 'Ramesh Kumar' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'Suresh Kumar' })
  @IsString()
  @IsNotEmpty()
  fatherName: string;

  @ApiProperty({
    example: '9876543210',
    description: '10-digit mobile number used for WhatsApp contact/OTP',
  })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'whatsappMobile must be a valid 10-digit mobile number',
  })
  whatsappMobile: string;

  @ApiPropertyOptional({
    example: '9123456780',
    description: 'Alternate 10-digit mobile number',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'additionalMobile must be a valid 10-digit mobile number',
  })
  additionalMobile?: string;

  @ApiProperty({ example: 'House No. 12, Near Shiv Mandir' })
  @IsString()
  @IsNotEmpty()
  fullAddress: string;

  @ApiPropertyOptional({ example: 'Rampura' })
  @IsOptional()
  @IsString()
  postalGram?: string;

  @ApiPropertyOptional({ example: 'Rampura Post' })
  @IsOptional()
  @IsString()
  post?: string;

  @ApiPropertyOptional({ example: 'Indore' })
  @IsOptional()
  @IsString()
  tehsil?: string;

  @ApiPropertyOptional({ example: '452001' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiProperty({ example: 1, description: 'HierarchyNode id at Vibhag level' })
  @IsInt()
  vibhagId: number;

  @ApiProperty({ example: 1, description: 'HierarchyNode id at Jila level' })
  @IsInt()
  jilaId: number;

  @ApiProperty({ example: 2, description: 'HierarchyNode id at Khand level' })
  @IsInt()
  khandId: number;

  @ApiProperty({ example: 3, description: 'HierarchyNode id at Mandal level' })
  @IsInt()
  mandalId: number;

  @ApiProperty({ example: 4, description: 'HierarchyNode id at Gram level' })
  @IsInt()
  gramId: number;

  @ApiProperty({
    example: 'Mohan Sharma',
    description: 'Name of the person who registered this user offline',
  })
  @IsString()
  @IsNotEmpty()
  registrarName: string;

  @ApiProperty({
    example: '9988776655',
    description: '10-digit mobile number of the registrar',
  })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'registrarMobile must be a valid 10-digit mobile number',
  })
  registrarMobile: string;
}
