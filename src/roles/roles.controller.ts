import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  AccessGuard,
  BaseController,
  JwtAuthGuard,
  PrivilegeGuard,
  RequirePrivilege,
} from '@Common';
import { RoleStatus } from '../generated/prisma/client';
import { RolesService } from './roles.service';
import {
  CreateRoleRequestDto,
  GetRolesRequestDto,
  UpdateRoleRequestDto,
} from './dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard, PrivilegeGuard)
@Controller()
export class RolesController extends BaseController {
  constructor(private readonly rolesService: RolesService) {
    super();
  }

  // ── Privilege Catalog ──────────────────────────────────────────────────────

  @RequirePrivilege('roles.manage')
  @Get('roles/privileges')
  @ApiOperation({
    summary: 'Get the full privilege catalog grouped by module',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filter by module name, privilege key, or description',
  })
  getPrivilegeCatalog(@Query('search') search?: string) {
    return this.rolesService.getPrivilegeCatalog(search);
  }

  // ── Roles ──────────────────────────────────────────────────────────────────

  @RequirePrivilege('roles.manage')
  @Get('roles')
  @ApiOperation({ summary: 'List roles with optional search and pagination' })
  listRoles(@Query() query: GetRolesRequestDto) {
    return this.rolesService.listRoles(query);
  }

  @RequirePrivilege('roles.manage')
  @Get('roles/:id')
  @ApiOperation({ summary: 'Get a single role by ID' })
  @ApiParam({ name: 'id', type: Number })
  getRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getRole(id);
  }

  @RequirePrivilege('roles.manage')
  @Post('roles')
  @ApiOperation({
    summary: 'Create a new custom role with privilege keys',
  })
  createRole(@Body() dto: CreateRoleRequestDto) {
    return this.rolesService.createRole(dto);
  }

  @RequirePrivilege('roles.manage')
  @Put('roles/:id')
  @ApiOperation({
    summary:
      'Update a role name, description, and/or privilege set (full replace)',
  })
  @ApiParam({ name: 'id', type: Number })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleRequestDto,
  ) {
    return this.rolesService.updateRole(id, dto);
  }

  @RequirePrivilege('roles.manage')
  @ApiParam({ name: 'status', enum: RoleStatus })
  @Patch('roles/:id/:status')
  @ApiOperation({ summary: 'Activate or deactivate a custom role' })
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status', new ParseEnumPipe(RoleStatus)) status: RoleStatus,
  ) {
    return this.rolesService.setStatus(id, status);
  }

  @RequirePrivilege('roles.manage')
  @Delete('roles/:id')
  @ApiOperation({
    summary: 'Delete a custom role (must have no assigned users)',
  })
  @ApiParam({ name: 'id', type: Number })
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.deleteRole(id);
  }
}
