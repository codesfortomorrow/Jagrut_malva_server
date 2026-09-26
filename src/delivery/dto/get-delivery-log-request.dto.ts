import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { SearchablePaginatedDto } from '@Common';
import { DeliveryLogStatus } from '../../generated/prisma/enums';

export class GetDeliveryLogsRequestDto extends SearchablePaginatedDto {
  @ApiPropertyOptional({
    description: 'Filter by a specific dispatch entry (a received consignment)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'dispatchEntryId must be an integer' })
  @Min(1, { message: 'dispatchEntryId must be a positive integer' })
  dispatchEntryId?: number;

  @ApiPropertyOptional({
    description: 'Filter by Publish Issue ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'issueId must be an integer' })
  @Min(1, { message: 'issueId must be a positive integer' })
  issueId?: number;

  @ApiPropertyOptional({
    description:
      'Filter by the Gram (hierarchy node) the dispatch was delivered to',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'gramId must be an integer' })
  @Min(1, { message: 'gramId must be a positive integer' })
  gramId?: number;

  @ApiPropertyOptional({
    description: 'Filter by delivery outcome',
    enum: DeliveryLogStatus,
  })
  @IsOptional()
  @IsEnum(DeliveryLogStatus, {
    message: 'status must be a valid DeliveryLogStatus',
  })
  status?: DeliveryLogStatus;
}
