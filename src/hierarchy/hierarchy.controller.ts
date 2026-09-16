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
  JwtAuthGuard,
  PrivilegeGuard,
  RequirePrivilege,
} from '@Common';
import { HierarchyStatus } from '../generated/prisma/client';
import { HierarchyService } from './hierarchy.service';
import {
  CreateHierarchyNodeDto,
  GetHierarchyNodesDto,
  UpdateHierarchyNodeDto,
} from './dto';

@ApiTags('Hierarchy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard, PrivilegeGuard)
@Controller('hierarchy')
export class HierarchyController extends BaseController {
  constructor(private readonly hierarchyService: HierarchyService) {
    super();
  }

  @RequirePrivilege('hierarchy.view')
  @Get('tree')
  @ApiOperation({
    summary:
      'Get the full organization hierarchy as a nested tree (Sangh → Gram Mohalla)',
  })
  getTree() {
    return this.hierarchyService.getTree();
  }

  @RequirePrivilege('hierarchy.view')
  @Get()
  @ApiOperation({
    summary:
      'List all hierarchy nodes (flat, paginated) with optional level/status/parent filters',
  })
  findAll(@Query() filter: GetHierarchyNodesDto) {
    return this.hierarchyService.findAll(filter);
  }

  @RequirePrivilege('hierarchy.view')
  @Get(':id')
  @ApiOperation({ summary: 'Get a single hierarchy node by ID' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.findOne(id);
  }

  @RequirePrivilege('hierarchy.view')
  @Get(':id/children')
  @ApiOperation({ summary: 'Get all direct children of a hierarchy node' })
  @ApiParam({ name: 'id', type: Number })
  getChildren(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.getChildren(id);
  }

  @RequirePrivilege('hierarchy.create')
  @Post()
  @ApiOperation({
    summary:
      'Create a new hierarchy node. Strict level rules apply: Sangh → Jila → Khand Nagar → Mandal Basti → Gram Mohalla',
  })
  create(@Body() dto: CreateHierarchyNodeDto) {
    return this.hierarchyService.create(dto);
  }

  @RequirePrivilege('hierarchy.edit')
  @Put(':id')
  @ApiOperation({
    summary:
      'Update a hierarchy node name and/or description. Level and parent are immutable.',
  })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHierarchyNodeDto,
  ) {
    return this.hierarchyService.update(id, dto);
  }

  @RequirePrivilege('hierarchy.edit')
  @Patch(':id/:status')
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'status', enum: HierarchyStatus })
  @ApiOperation({ summary: 'Activate or deactivate a hierarchy node' })
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status', new ParseEnumPipe(HierarchyStatus))
    status: HierarchyStatus,
  ) {
    return this.hierarchyService.setStatus(id, status);
  }

  @RequirePrivilege('hierarchy.delete')
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a leaf hierarchy node (node must have no children)',
  })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.remove(id);
  }
}
