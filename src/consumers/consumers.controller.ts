import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
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
  AuthenticatedRequest,
  BaseController,
  JwtAuthGuard,
  PrivilegeGuard,
  RequirePrivilege,
} from '@Common';
import { ConsumerStatus } from '../generated/prisma/client';
import { ConsumersService } from './consumers.service';
import {
  CreateConsumerRequestDto,
  GetConsumersRequestDto,
  UpdateConsumerRequestDto,
} from './dto';

@ApiTags('Consumers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard, PrivilegeGuard)
@Controller('consumers')
export class ConsumersController extends BaseController {
  constructor(private readonly consumersService: ConsumersService) {
    super();
  }

  @RequirePrivilege('consumers.create')
  @Post()
  @ApiOperation({ summary: 'Register a new consumer / subscriber' })
  create(
    @Body() dto: CreateConsumerRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getContext(req).user?.id;
    return this.consumersService.create(dto, userId);
  }

  @RequirePrivilege('consumers.view')
  @Get()
  @ApiOperation({
    summary:
      'List registered consumers with pagination, search, and hierarchy filters',
  })
  findAll(@Query() query: GetConsumersRequestDto) {
    return this.consumersService.findAll(query);
  }

  @RequirePrivilege('consumers.view')
  @Get(':id')
  @ApiOperation({ summary: 'Get consumer profile details by ID' })
  @ApiParam({ name: 'id', description: 'Consumer ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.consumersService.findOne(id);
  }

  @RequirePrivilege('consumers.edit')
  @Put(':id')
  @ApiOperation({
    summary: 'Update consumer personal, contact, address, or hierarchy details',
  })
  @ApiParam({ name: 'id', description: 'Consumer ID' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConsumerRequestDto,
  ) {
    return this.consumersService.update(id, dto);
  }

  @RequirePrivilege('consumers.status')
  @Patch(':id/:status')
  @ApiOperation({ summary: 'Activate or deactivate consumer record' })
  @ApiParam({ name: 'id', description: 'Consumer ID' })
  @ApiParam({ name: 'status', enum: ConsumerStatus })
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status', new ParseEnumPipe(ConsumerStatus)) status: ConsumerStatus,
  ) {
    return this.consumersService.setStatus(id, status);
  }
}
