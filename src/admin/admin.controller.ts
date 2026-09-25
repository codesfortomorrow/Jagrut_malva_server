import {
  Body,
  Controller,
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
  AccessGuard,
  AuthenticatedRequest,
  BaseController,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserType,
} from '@Common';
import { AdminService } from './admin.service';
import { AdminStatus } from '../generated/prisma/enums';
import {
  AuthenticateRequestDto,
  ChangePasswordRequestDto,
  CreateAdminRequestDto,
  GetAdminUsersRequestDto,
  UpdateAdminUserRequestDto,
  UpdateProfileDetailsRequestDto,
  UpdateProfileImageRequestDto,
} from './dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserType.Admin)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('admin')
export class AdminController extends BaseController {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return await this.adminService.getProfile(ctx.user.id);
  }

  // @Patch("me/update-profile")
  // async updateProfileDetails(
  //   @Req() req: AuthenticatedRequest,
  //   @Body() data: UpdateProfileDetailsRequestDto,
  // ) {
  //   const ctx = this.getContext(req);
  //   await this.adminService.updateProfileDetails(ctx.user.id, {
  //     firstname: data.firstname,
  //     lastname: data.lastname,
  //     email: data.email,
  //     mobile: data.mobile,
  //     roleId: data.roleId
  //   });
  //   return { status: 'success' };
  // }

  @Post('profile-image')
  updateProfileImage(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateProfileImageRequestDto,
  ) {
    const ctx = this.getContext(req);
    return this.adminService.updateProfileImage(ctx.user.id, data.profileImage);
  }

  @Post('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() data: ChangePasswordRequestDto,
  ) {
    const ctx = this.getContext(req);
    await this.adminService.changePassword(
      ctx.user.id,
      data.oldPassword,
      data.newPassword,
    );
    return { status: 'success' };
  }

  @Post('authenticate')
  async authenticate(
    @Req() req: AuthenticatedRequest,
    @Body() data: AuthenticateRequestDto,
  ) {
    const ctx = this.getContext(req);
    await this.adminService.authenticate(ctx.user.id, data.password);
    return { status: 'success' };
  }

  @Post('create-user')
  @ApiOperation({
    summary:
      'Create a new user with role and organizational assignments in a single transaction',
  })
  @ApiResponse({
    status: 201,
    description: 'User created and onboarded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or duplicate email/mobile',
  })
  async register(
    @Req() req: AuthenticatedRequest,
    @Body() data: CreateAdminRequestDto,
  ) {
    const response = await this.adminService.create({
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      password: data.password,
      mobile: data.mobile,
      country: data.country,
      roleId: data.roleId,
      assignments: data.assignments,
    });

    return response;
  }

  @Get('users')
  @ApiOperation({
    summary:
      'Retrieve paginated list of users created through admin user creation',
  })
  @ApiResponse({
    status: 200,
    description:
      'Paginated list of users with assigned role and hierarchy assignments',
  })
  async getUsers(@Query() query: GetAdminUsersRequestDto) {
    return await this.adminService.findAllUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({
    summary:
      'Retrieve details of a specific user by ID with roles and assignments',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Admin User ID' })
  @ApiResponse({
    status: 200,
    description: 'User details with assigned role and hierarchy assignments',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return await this.adminService.findUserById(id);
  }

  @Patch('users/update-details/:id')
  @ApiOperation({
    summary:
      'Update details, role, or hierarchy assignments of an admin user by ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Admin User ID' })
  @ApiResponse({
    status: 200,
    description: 'Admin user details updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or duplicate email/mobile',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateAdminUserRequestDto,
  ) {
    return await this.adminService.updateUser(id, data);
  }

  @ApiParam({ name: 'userId', type: Number, description: 'Admin User ID' })
  @ApiParam({ name: 'status', enum: AdminStatus })
  @ApiOperation({
    summary: 'Update status of an Admin user (Active / Blocked)',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin user status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status value or user ID',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Post(':userId/:status')
  async setUserStatus(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('status', new ParseEnumPipe(AdminStatus)) status: AdminStatus,
  ) {
    await this.adminService.setStatus(userId, status);
    return { status: 'success' };
  }
}
