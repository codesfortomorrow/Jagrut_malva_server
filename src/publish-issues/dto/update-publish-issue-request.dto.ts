import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdatePublishIssueRequestDto {
  @ApiPropertyOptional({
    description: 'Unique issue number or identifier',
    example: '26',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsNotEmpty({ message: 'issueNo cannot be empty if provided' })
  @IsString()
  issueNo?: string;

  @ApiPropertyOptional({
    description: 'Issue title',
    example: 'Jagrat Malwa Patrika',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Release / publication date',
    example: '2026-10-01T00:00:00.000Z',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : new Date(value),
  )
  @IsDate({ message: 'publishDate must be a valid date' })
  publishDate?: Date;

  @ApiPropertyOptional({
    description: 'Print copies target (positive integer)',
    example: 10000,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsInt({ message: 'totalCopies must be an integer' })
  @Min(1, { message: 'totalCopies must be greater than 0' })
  totalCopies?: number;

  @ApiPropertyOptional({
    description: 'Price per copy in ₹',
    example: 30,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  @Min(0, { message: 'pricePerCopy cannot be negative' })
  pricePerCopy?: number;

  @ApiPropertyOptional({
    description: 'Page count of the issue',
    example: 48,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsInt({ message: 'pageCount must be an integer' })
  @Min(1, { message: 'pageCount must be greater than 0' })
  pageCount?: number;

  @ApiPropertyOptional({
    description:
      'Lifecycle status transition (Draft -> Published, Published -> Archived)',
    enum: PublishIssueStatus,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  @IsEnum(PublishIssueStatus, {
    message:
      'status must be a valid PublishIssueStatus (Draft, Published, Archived)',
  })
  status?: PublishIssueStatus;
}
