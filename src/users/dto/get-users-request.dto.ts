import { IsOptional, IsString } from 'class-validator';
import { PaginatedDto } from '@Common';

export class GetUsersRequestDto extends PaginatedDto {
  @IsOptional()
  @IsString()
  search?: string;
}
