import { Response } from 'express';
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
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
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
import { HierarchyService, HierarchyImportResult } from './hierarchy.service';
import {
  CreateHierarchyNodeDto,
  GetHierarchyNodesDto,
  UpdateHierarchyNodeDto,
} from './dto';

@ApiTags('Hierarchy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard, PrivilegeGuard)
@DisableCache()
@Controller('hierarchy')
export class HierarchyController extends BaseController {
  constructor(private readonly hierarchyService: HierarchyService) {
    super();
  }

  @RequirePrivilege('hierarchy.create')
  @Post()
  @ApiOperation({
    summary:
      'Create a new hierarchy node. Strict level rules apply: Prant → Vibhag → Jila → Khand Nagar → Mandal Basti → Gram Mohalla',
  })
  create(@Body() dto: CreateHierarchyNodeDto) {
    return this.hierarchyService.create(dto);
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
  @Get('tree')
  @ApiOperation({
    summary:
      'Get the full organization hierarchy as a nested tree (Prant → Gram Mohalla)',
  })
  getTree() {
    return this.hierarchyService.getTree();
  }

  @RequirePrivilege('hierarchy.view')
  @Get('export')
  @ApiOperation({
    summary:
      'Export the complete configured Geo Hierarchy as a CSV file in Pre-order DFS format',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV file download containing the full Geo Hierarchy',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          example:
            'Node_ID,Node_Name,Level,Status,Parent_ID,Parent_Name,Hierarchy_Path,Description\r\n1,Malwa,Prant,Active,,,Malwa,Root Prant',
        },
      },
    },
  })
  async exportCsv(@Res() res: Response) {
    const csv = await this.hierarchyService.exportHierarchyCsv();
    const filename = `geo_hierarchy_export_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  }

  @RequirePrivilege('hierarchy.create')
  @Post('import')
  @ApiOperation({
    summary:
      'Import complete Geo Hierarchy structure through a single CSV file with two-phase validation',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file containing Geo Hierarchy records (max 10MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Geo Hierarchy imported successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed: invalid file, structural mismatch, duplicate node, or invalid parent',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.toLowerCase().endsWith('.csv')
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Only CSV files (.csv) are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<HierarchyImportResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('CSV file is required.');
    }
    return await this.hierarchyService.importHierarchyCsv(file.buffer);
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

  @RequirePrivilege('hierarchy.view')
  @Get(':id/reporting-candidates')
  @ApiOperation({
    summary: 'Get reporting authority candidates for a hierarchy node',
  })
  @ApiParam({ name: 'id', type: Number })
  getReportingCandidates(@Param('id', ParseIntPipe) id: number) {
    return this.hierarchyService.getReportingCandidates(id);
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
