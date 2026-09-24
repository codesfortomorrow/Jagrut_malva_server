import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsMobilePhone,
  Length,
} from 'class-validator';

export class UpdateUserRequestDto {
  @ApiPropertyOptional({
    example: 'Rahul Sharma',
    description: 'Full name of the consumer',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    example: 'Ramesh Sharma',
    description: "Consumer's father name",
  })
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'WhatsApp mobile number',
  })
  @IsOptional()
  @IsMobilePhone('en-IN')
  whatsappMobile?: string;

  @ApiPropertyOptional({
    example: '9123456789',
    description: 'Additional mobile number',
    nullable: true,
  })
  @IsOptional()
  @IsMobilePhone('en-IN')
  additionalMobile?: string | null;

  @ApiPropertyOptional({
    example: 'Village Rampur, District Indore, Madhya Pradesh',
    description: 'Complete residential address',
  })
  @IsOptional()
  @IsString()
  fullAddress?: string;

  @ApiPropertyOptional({
    example: 'Rampur',
    description: 'Postal gram/village',
  })
  @IsOptional()
  @IsString()
  postalGram?: string;

  @ApiPropertyOptional({
    example: 'Rampur Post Office',
    description: 'Post office',
  })
  @IsOptional()
  @IsString()
  post?: string;

  @ApiPropertyOptional({
    example: 'Depalpur',
    description: 'Tehsil',
  })
  @IsOptional()
  @IsString()
  tehsil?: string;

  @ApiPropertyOptional({
    example: '453115',
    description: 'PIN code',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  pincode?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Vibhag hierarchy node ID',
  })
  @IsOptional()
  @IsInt()
  vibhagId?: number;

  @ApiPropertyOptional({
    example: 25,
    description: 'Jila hierarchy node ID',
  })
  @IsOptional()
  @IsInt()
  jilaId?: number;

  @ApiPropertyOptional({
    example: 45,
    description: 'Khand/Nagar hierarchy node ID',
  })
  @IsOptional()
  @IsInt()
  khandId?: number;

  @ApiPropertyOptional({
    example: 67,
    description: 'Mandal/Basti hierarchy node ID',
  })
  @IsOptional()
  @IsInt()
  mandalId?: number;

  @ApiPropertyOptional({
    example: 89,
    description: 'Gram/Mohalla hierarchy node ID',
  })
  @IsOptional()
  @IsInt()
  gramId?: number;

  @ApiPropertyOptional({
    example: 'Amit Sharma',
    description: 'Name of the person who registered the consumer',
  })
  @IsOptional()
  @IsString()
  registrarName?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'Mobile number of the registrar',
  })
  @IsOptional()
  @IsMobilePhone('en-IN')
  registrarMobile?: string;
}
