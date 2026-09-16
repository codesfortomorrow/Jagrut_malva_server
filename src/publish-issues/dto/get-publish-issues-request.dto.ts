import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { SearchablePaginatedDto } from '@Common';
import { PublishIssueStatus } from '../../generated/prisma/client';

export class GetPublishIssuesRequestDto extends SearchablePaginatedDto {
  @ApiPropertyOptional({
    description: 'Filter issues by lifecycle status',
    enum: PublishIssueStatus,
  })
  @IsOptional()
  @IsEnum(PublishIssueStatus, {
    message:
      'status must be a valid PublishIssueStatus (Draft, Published, Archived)',
  })
  status?: PublishIssueStatus;

  @ApiPropertyOptional({
    description: 'Filter issues published on or after this date',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate({ message: 'startDate must be a valid date' })
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter issues published on or before this date',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate({ message: 'endDate must be a valid date' })
  endDate?: Date;
}
