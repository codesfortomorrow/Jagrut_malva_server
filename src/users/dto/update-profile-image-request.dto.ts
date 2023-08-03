import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateProfileImageDto {
  @IsString()
  @IsNotEmpty()
  profileImage: string;
}
