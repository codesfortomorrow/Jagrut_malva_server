import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssignUserDesignationDto {
  @ApiProperty({
    description: 'ID of the user to assign',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({
    description:
      'ID of the hierarchy node where user will hold this responsibility',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nodeId: number;

  @ApiProperty({
    description: 'ID of the designation to assign',
    example: 3,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  designationId: number;

  @ApiProperty({
    description: 'ID of the reporting authority user (optional)',
    example: 10,
    required: false,
    nullable: true,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reportingId?: number | null;
}
