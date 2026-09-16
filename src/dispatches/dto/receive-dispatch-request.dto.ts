import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class ReceiveDispatchRequestDto {
  @ApiProperty({
    description: 'Number of copies physically received (must be >= 0)',
    example: 490,
  })
  @Type(() => Number)
  @IsInt({ message: 'receivedQuantity must be an integer' })
  @Min(0, { message: 'receivedQuantity cannot be negative' })
  @IsNotEmpty({ message: 'receivedQuantity is required' })
  receivedQuantity: number;
}
