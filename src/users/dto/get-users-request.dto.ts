import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginatedDto } from '@Common';

export class GetUsersRequestDto extends PaginatedDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
