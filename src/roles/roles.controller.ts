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
@Controller('roles')
export class RolesController extends BaseController {
  constructor(private readonly rolesService: RolesService) {
    super();
  }

  @RequirePrivilege('roles.create')
  @Post()
  @ApiOperation({
    summary: 'Create a new custom role with privilege keys',
  })
  createRole(@Body() dto: CreateRoleRequestDto) {
    return this.rolesService.createRole(dto);
  }

  @RequirePrivilege('roles.view')
  @Get()
  @ApiOperation({ summary: 'List roles with optional search and pagination' })
  listRoles(@Query() query: GetRolesRequestDto) {
    return this.rolesService.listRoles(query);
  }

  // ── Privilege Catalog ──────────────────────────────────────────────────────

  @RequirePrivilege('privileges.view', 'roles.view')
  @Get('privileges')
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

  // ── Role Detail & Operations (By ID) ────────────────────────────────────────

  @RequirePrivilege('roles.view')
  @Get(':id')
  @ApiOperation({ summary: 'Get a single role by ID' })
  @ApiParam({ name: 'id', type: Number })
  getRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getRole(id);
  }

  @RequirePrivilege('roles.edit')
  @Put(':id')
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

  @RequirePrivilege('roles.edit')
  @ApiParam({ name: 'status', enum: RoleStatus })
  @Patch(':id/:status')
  @ApiOperation({ summary: 'Activate or deactivate a custom role' })
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status', new ParseEnumPipe(RoleStatus)) status: RoleStatus,
  ) {
    return this.rolesService.setStatus(id, status);
  }

  @RequirePrivilege('roles.delete')
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a custom role (must have no assigned users)',
  })
  @ApiParam({ name: 'id', type: Number })
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.deleteRole(id);
  }
}
