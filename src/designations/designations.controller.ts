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
  ApiTags,
} from '@nestjs/swagger';
import {
  AccessGuard,
  BaseController,
  DisableCache,
  JwtAuthGuard,
  PrivilegeGuard,
  RequirePrivilege,
} from '@Common';
import { HierarchyStatus } from '../generated/prisma/client';
import { DesignationsService } from './designations.service';
import {
  AssignUserDesignationDto,
  CreateDesignationDto,
  GetDesignationsDto,
  GetUserDesignationsDto,
  ReassignUserDesignationDto,
  UpdateDesignationDto,
} from './dto';

@ApiTags('Designations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard, PrivilegeGuard)
@DisableCache()
@Controller('designations')
export class DesignationsController extends BaseController {
  constructor(private readonly designationsService: DesignationsService) {
    super();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DESIGNATION MASTER DATA (Core CRUD)
  // ─────────────────────────────────────────────────────────────────────────────

  @RequirePrivilege('designation.create')
  @Post()
  @ApiOperation({
    summary:
      'Create a new designation associated with a specific hierarchy level',
  })
  create(@Body() dto: CreateDesignationDto) {
    return this.designationsService.create(dto);
  }

  @RequirePrivilege('designation.view')
  @Get()
  @ApiOperation({
    summary:
      'List all designations (paginated) with optional level/status/search filters',
  })
  findAll(@Query() filter: GetDesignationsDto) {
    return this.designationsService.findAll(filter);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. USER-DESIGNATION ASSIGNMENTS
  // Declared before parameterized ':id' routes to prevent route collisions
  // ─────────────────────────────────────────────────────────────────────────────

  @RequirePrivilege('designation.assign')
  @Post('assignments')
  @ApiOperation({
    summary:
      'Assign a user to a designation at a specific hierarchy node (validates level match and active status)',
  })
  assignUser(@Body() dto: AssignUserDesignationDto) {
    return this.designationsService.assignUser(dto);
  }

  @RequirePrivilege('designation.view')
  @Get('assignments')
  @ApiOperation({
    summary:
      'List user-designation assignments with pagination, search, and filters (supports active and historical)',
  })
  findAllAssignments(@Query() filter: GetUserDesignationsDto) {
    return this.designationsService.findAllAssignments(filter);
  }

  @RequirePrivilege('designation.assign')
  @Post('assignments/reassign')
  @ApiOperation({
    summary:
      'Reassign organizational responsibility (closes existing active assignment and creates new active assignment without destroying history)',
  })
  reassign(@Body() dto: ReassignUserDesignationDto) {
    return this.designationsService.reassign(dto);
  }

  @RequirePrivilege('designation.view')
  @Get('assignments/:assignmentId')
  @ApiOperation({ summary: 'Get a specific user-designation assignment by ID' })
  @ApiParam({ name: 'assignmentId', type: Number })
  findAssignmentById(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
  ) {
    return this.designationsService.findAssignmentById(assignmentId);
  }

  @RequirePrivilege('designation.assign')
  @Patch('assignments/:assignmentId/unassign')
  @ApiOperation({
    summary:
      'Unassign a user from a designation/node (sets isActive=false, unassignedAt=now, preserves historical record)',
  })
  @ApiParam({ name: 'assignmentId', type: Number })
  unassign(@Param('assignmentId', ParseIntPipe) assignmentId: number) {
    return this.designationsService.unassign(assignmentId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. DESIGNATION MASTER DETAILS & MODIFICATIONS (By ID)
  // ─────────────────────────────────────────────────────────────────────────────

  @RequirePrivilege('designation.view')
  @Get(':id')
  @ApiOperation({ summary: 'Get a single designation by ID' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.designationsService.findOne(id);
  }

  @RequirePrivilege('designation.edit')
  @Put(':id')
  @ApiOperation({
    summary: 'Update designation name or description (level is immutable)',
  })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDesignationDto,
  ) {
    return this.designationsService.update(id, dto);
  }

  @RequirePrivilege('designation.edit')
  @Patch(':id/:status')
  @ApiOperation({ summary: 'Activate or deactivate a designation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'status', enum: HierarchyStatus })
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status', new ParseEnumPipe(HierarchyStatus))
    status: HierarchyStatus,
  ) {
    return this.designationsService.setStatus(id, status);
  }

  @RequirePrivilege('designation.delete')
  @Delete(':id')
  @ApiOperation({
    summary:
      'Delete a designation (only allowed if no active or historical assignments exist)',
  })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.designationsService.remove(id);
  }
}
