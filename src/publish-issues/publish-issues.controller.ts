import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
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
  ApiTags,
} from '@nestjs/swagger';
import {
  AccessGuard,
  AuthenticatedRequest,
  BaseController,
  File,
  JwtAuthGuard,
  PrivilegeGuard,
  RequirePrivilege,
} from '@Common';
import { PublishIssueStatus } from '../generated/prisma/client';
import { PublishIssuesService } from './publish-issues.service';
import {
  CreatePublishIssueRequestDto,
  GetPublishIssuesRequestDto,
  UpdatePublishIssueRequestDto,
} from './dto';

@ApiTags('Publish Issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard, PrivilegeGuard)
@Controller('publish-issues')
export class PublishIssuesController extends BaseController {
  constructor(private readonly publishIssuesService: PublishIssuesService) {
    super();
  }

  @RequirePrivilege('publish_issues.create')
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create a new publish issue' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['issueNo', 'publishDate', 'totalCopies'],
      properties: {
        issueNo: { type: 'string', example: 'JM-2026-01' },
        title: {
          type: 'string',
          example: 'Jagrat Malwa Patrika',
        },
        publishDate: {
          type: 'string',
          format: 'date-time',
          example: '2026-10-01T00:00:00.000Z',
        },
        totalCopies: { type: 'integer', example: 10000 },
        status: {
          type: 'string',
          enum: Object.values(PublishIssueStatus),
          default: 'Draft',
        },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  create(
    @Body() dto: CreatePublishIssueRequestDto,
    @UploadedFile() file?: File,
    @Req() req?: AuthenticatedRequest,
  ) {
    const userId = req ? this.getContext(req).user?.id : undefined;
    return this.publishIssuesService.create(dto, file, userId);
  }

  @RequirePrivilege('publish_issues.view')
  @Get()
  @ApiOperation({ summary: 'List publish issues with pagination and filters' })
  findAll(@Query() query: GetPublishIssuesRequestDto) {
    return this.publishIssuesService.findAll(query);
  }

  @RequirePrivilege('publish_issues.view')
  @Get(':id')
  @ApiOperation({ summary: 'Get publish issue details by ID' })
  @ApiParam({ name: 'id', description: 'Publish Issue ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.publishIssuesService.findOne(id);
  }

  @RequirePrivilege('publish_issues.edit')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Update publish issue metadata and lifecycle status',
  })
  @ApiParam({ name: 'id', description: 'Publish Issue ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        issueNo: { type: 'string', example: 'JM-2026-01' },
        title: {
          type: 'string',
          example: 'Jagrat Malwa Patrika',
        },
        publishDate: {
          type: 'string',
          format: 'date-time',
          example: '2026-10-01T00:00:00.000Z',
        },
        totalCopies: { type: 'integer', example: 10000 },
        status: { type: 'string', enum: Object.values(PublishIssueStatus) },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePublishIssueRequestDto,
    @UploadedFile() file?: File,
    @Req() req?: AuthenticatedRequest,
  ) {
    const userId = req ? this.getContext(req).user?.id : undefined;
    return this.publishIssuesService.update(id, dto, file, userId);
  }
}
