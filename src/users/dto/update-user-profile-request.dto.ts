import { IsOptional, IsStrongPassword } from 'class-validator';
import { UpdateProfileDetailsRequestDto } from './update-profile-request.dto';

export class UpdateUserProfileRequestDto extends UpdateProfileDetailsRequestDto {
  @IsOptional()
  @IsStrongPassword()
  password?: string;
}
