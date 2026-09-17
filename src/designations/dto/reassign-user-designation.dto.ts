import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ReassignUserDesignationDto {
  @ApiProperty({
    description: 'ID of the specific active assignment to reassign from',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignmentId: number;

  @ApiProperty({
    description: 'ID of the new user to become responsible',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  newUserId: number;
}
