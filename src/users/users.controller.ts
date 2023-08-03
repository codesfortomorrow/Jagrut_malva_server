import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, BaseController, JwtAuthGuard } from '@Common';
import { UsersService } from './users.service';
import {
  ChangePasswordRequestDto,
  UpdateProfileDetailsRequestDto,
  UpdateProfileImageDto,
} from './dto';

@Controller('users')
export class UsersController extends BaseController {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return await this.usersService.getProfile(ctx.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfileDetails(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateProfileDetailsRequestDto,
  ) {
    const ctx = this.getContext(req);
    await this.usersService.updateProfileDetails(
      ctx.user.id,
      data.username,
      data.firstname,
      data.lastname,
      data.email,
      data.mobile,
    );
    return { status: 'success' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/profile-image')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateProfileImageDto,
  ) {
    const ctx = this.getContext(req);
    return this.usersService.updateProfileImage(ctx.user.id, data.profileImage);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() data: ChangePasswordRequestDto,
  ) {
    const ctx = this.getContext(req);
    await this.usersService.changePassword(
      ctx.user.id,
      data.oldPassword,
      data.newPassword,
    );
    return { status: 'success' };
  }
}
