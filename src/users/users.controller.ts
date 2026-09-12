import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  BaseController,
  JwtAuthGuard,
  RolesGuard,
  UserType,
  Roles,
  AccessGuard,
} from '@Common';
import { UsersService } from './users.service';
import {
  AssignRoleRequestDto,
  ChangePasswordRequestDto,
  GetUsersRequestDto,
  UpdateProfileDetailsRequestDto,
  UpdateProfileImageRequestDto,
  UpdateUserProfileRequestDto,
} from './dto';
import { UserStatus } from '../generated/prisma/client';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('users')
export class UsersController extends BaseController {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Get()
  async getUsers(@Query() query: GetUsersRequestDto) {
    return await this.usersService.getAll({
      search: query.search,
      skip: query.skip,
      take: query.take,
    });
  }

  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return await this.usersService.getProfile(ctx.user.id);
  }

  @Patch('me')
  async updateProfileDetails(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateProfileDetailsRequestDto,
  ) {
    if (data.mobile && (!data.dialCode || !data.country)) {
      throw new BadRequestException();
    }
    const ctx = this.getContext(req);
    await this.usersService.updateProfileDetails({
      userId: ctx.user.id,
      username: data.username,
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      dialCode: data.dialCode,
      mobile: data.mobile,
      country: data.country,
    });
    return { status: 'success' };
  }

  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Get(':userId')
  async getUserProfile(@Param('userId', ParseIntPipe) userId: number) {
    return await this.usersService.getProfile(userId);
  }

  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Patch(':userId')
  async updateUserProfileDetails(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() data: UpdateUserProfileRequestDto,
  ) {
    return await this.usersService.updateProfileDetailsByAdministrator({
      userId,
      username: data.username,
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      dialCode: data.dialCode,
      mobile: data.mobile,
      country: data.country,
      password: data.password,
    });
  }

  @Post('me/profile-image')
  updateProfileImage(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateProfileImageRequestDto,
  ) {
    const ctx = this.getContext(req);
    return this.usersService.updateProfileImage(ctx.user.id, data.profileImage);
  }

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

  @ApiParam({ name: 'status', enum: UserStatus })
  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Post(':userId/:status')
  async setUserStatus(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('status', new ParseEnumPipe(UserStatus)) status: UserStatus,
  ) {
    await this.usersService.setStatus(userId, status);
    return { status: 'success' };
  }

  // GET ROLES ASSIGNED TO A USER
  @Get(':userId/roles')
  @ApiOperation({ summary: 'Get all roles assigned to a user' })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'List of roles assigned to the user',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserRoles(@Param('userId', ParseIntPipe) userId: number) {
    return this.usersService.getUserRoles(userId);
  }

  // ASSIGN A ROLE TO A USER
  @Post(':userId/roles')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID' })
  @ApiResponse({
    status: 201,
    description: 'Role assigned to user successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Role is already assigned to this user',
  })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  assignRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AssignRoleRequestDto,
  ) {
    return this.usersService.assignRole(userId, dto.roleId);
  }

  // REMOVE A ROLE FROM A USER
  @Delete(':userId/roles/:roleId')
  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID' })
  @ApiParam({ name: 'roleId', type: Number, description: 'Role ID' })
  @ApiResponse({
    status: 200,
    description: 'Role removed from user successfully',
  })
  @ApiResponse({ status: 404, description: 'User, role, or mapping not found' })
  removeRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.usersService.removeRole(userId, roleId);
  }

  // GET EFFECTIVE PRIVILEGES OF A USER
  @Get(':userId/privileges')
  @ApiOperation({
    summary: 'Get effective privileges derived from all assigned roles',
  })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Deduplicated list of effective privileges',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getEffectivePrivileges(@Param('userId', ParseIntPipe) userId: number) {
    return this.usersService.getEffectivePrivileges(userId);
  }
}
