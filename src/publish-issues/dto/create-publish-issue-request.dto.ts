import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PublishIssueStatus } from '../../generated/prisma/client';

export class CreatePublishIssueRequestDto {
  @ApiProperty({
    description: 'Unique issue number or identifier',
    example: '26',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'issueNo is required' })
  @IsString()
  issueNo: string;

  @ApiPropertyOptional({
    description: 'Issue title',
    example: 'Jagrat Malwa Patrika',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Release / publication date',
    example: '2026-10-01T00:00:00.000Z',
  })
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsNotEmpty({ message: 'publishDate is required' })
  @IsDate({ message: 'publishDate must be a valid date' })
  publishDate: Date;

  @ApiProperty({
    description: 'Print copies target (positive integer)',
    example: 10000,
  })
  @Type(() => Number)
  @IsInt({ message: 'totalCopies must be an integer' })
  @Min(1, { message: 'totalCopies must be greater than 0' })
  totalCopies: number;

  @ApiPropertyOptional({
    description: 'Price per copy in ₹',
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'pricePerCopy cannot be negative' })
  pricePerCopy?: number;

  @ApiPropertyOptional({
    description: 'Page count of the issue',
    example: 48,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageCount must be an integer' })
  @Min(1, { message: 'pageCount must be greater than 0' })
  pageCount?: number;

  @ApiPropertyOptional({
    description: 'Initial status of the issue (Draft or Published)',
    enum: PublishIssueStatus,
    default: PublishIssueStatus.Draft,
  })
  @IsOptional()
  @IsEnum(PublishIssueStatus, {
    message:
      'status must be a valid PublishIssueStatus (Draft, Published, Archived)',
  })
  status?: PublishIssueStatus;
}
