import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AssignRoleRequestDto {
  @ApiProperty({
    description: 'ID of the role to assign to the user',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  roleId: number;
}
