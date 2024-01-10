import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginatedDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @IsInt()
  @Max(1000)
  take?: number;
}
