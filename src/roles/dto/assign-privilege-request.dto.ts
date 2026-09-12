import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AssignPrivilegeRequestDto {
  @ApiProperty({
    description: 'ID of the privilege to assign to the role',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  privilegeId: number;
}
