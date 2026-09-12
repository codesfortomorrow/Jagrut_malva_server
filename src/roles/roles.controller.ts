import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
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
  BaseController,
  JwtAuthGuard,
  PrivilegeGuard,
  RequirePrivilege,
} from '@Common';
import { RolesService } from './roles.service';
import {
  CreateRoleRequestDto,
  GetRolesRequestDto,
  UpdateRoleRequestDto,
  AssignPrivilegeRequestDto,
} from './dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard, PrivilegeGuard)
@Controller('roles')
export class RolesController extends BaseController {
  constructor(private readonly rolesService: RolesService) {
    super();
  }

  // CREATE
  @RequirePrivilege('role_management')
  @Post()
  @ApiOperation({ summary: 'Create a new custom role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Role with this name already exists',
  })
  create(@Body() dto: CreateRoleRequestDto) {
    return this.rolesService.create(dto);
  }

  // FIND ALL
  @Get()
  @ApiOperation({ summary: 'List roles with search and pagination' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  findAll(@Query() query: GetRolesRequestDto) {
    return this.rolesService.findAll(query);
  }

  // FIND ONE
  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Role details' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  // UPDATE
  @RequirePrivilege('role_management')
  @Patch(':id')
  @ApiOperation({ summary: 'Update role details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'System role name cannot be modified or duplicate role name',
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleRequestDto,
  ) {
    return this.rolesService.update(id, dto);
  }

  // REMOVE
  @RequirePrivilege('role_management')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a custom unassigned role' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Cannot delete system role or role with assigned users/privileges',
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }

  // GET ALL PRIVILEGES ASSIGNED TO A ROLE
  @Get(':roleId/privileges')
  @ApiOperation({ summary: 'Get all privileges assigned to a role' })
  @ApiParam({ name: 'roleId', type: Number, description: 'Role ID' })
  @ApiResponse({
    status: 200,
    description: 'List of privileges assigned to the role',
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  getRolePrivileges(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.rolesService.getRolePrivileges(roleId);
  }

  // ASSIGN A PRIVILEGE TO A ROLE
  @RequirePrivilege('role_management')
  @Post(':roleId/privileges')
  @ApiOperation({ summary: 'Assign a privilege to a role' })
  @ApiParam({ name: 'roleId', type: Number, description: 'Role ID' })
  @ApiResponse({
    status: 201,
    description: 'Privilege assigned to role successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Privilege is already assigned to this role',
  })
  @ApiResponse({ status: 404, description: 'Role or privilege not found' })
  assignPrivilege(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: AssignPrivilegeRequestDto,
  ) {
    return this.rolesService.assignPrivilege(roleId, dto.privilegeId);
  }

  // REMOVE A PRIVILEGE FROM A ROLE
  @RequirePrivilege('role_management')
  @Delete(':roleId/privileges/:privilegeId')
  @ApiOperation({ summary: 'Remove a privilege from a role' })
  @ApiParam({ name: 'roleId', type: Number, description: 'Role ID' })
  @ApiParam({ name: 'privilegeId', type: Number, description: 'Privilege ID' })
  @ApiResponse({
    status: 200,
    description: 'Privilege removed from role successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Role, privilege, or mapping not found',
  })
  removePrivilege(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('privilegeId', ParseIntPipe) privilegeId: number,
  ) {
    return this.rolesService.removePrivilege(roleId, privilegeId);
  }
}
