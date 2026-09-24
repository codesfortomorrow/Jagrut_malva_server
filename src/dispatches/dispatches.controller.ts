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
import { DispatchesService } from './dispatches.service';
import {
  CreateDispatchEntryRequestDto,
  ForwardDispatchRequestDto,
  GetDispatchesRequestDto,
  InTransitDispatchRequestDto,
  ReceiveDispatchRequestDto,
  UpdateDispatchEntryRequestDto,
} from './dto';

@ApiTags('Dispatches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard, PrivilegeGuard)
@Controller('dispatches')
export class DispatchesController extends BaseController {
  constructor(private readonly dispatchesService: DispatchesService) {
    super();
  }

  @RequirePrivilege('dispatches.create')
  @Post()
  @ApiOperation({ summary: 'Create a new dispatch entry' })
  create(
    @Body() dto: CreateDispatchEntryRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const ctx = this.getContext(req);
    return this.dispatchesService.create(dto, ctx.user?.id);
  }

  @RequirePrivilege('dispatch.view', 'dispatches.view')
  @Get()
  @ApiOperation({ summary: 'List dispatches with pagination and filters' })
  findAll(
    @Query() query: GetDispatchesRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const ctx = this.getContext(req);
    return this.dispatchesService.findAll(query, ctx.user);
  }

  @RequirePrivilege('dispatch.view', 'dispatches.view')
  @Get('my-context')
  @ApiOperation({
    summary: 'Get dispatch context and allowed destination points',
  })
  getMyContext(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return this.dispatchesService.getMyDispatchContext(ctx.user);
  }

  // NOTE: Must be defined before ':id' route to avoid route collision
  @RequirePrivilege('dispatch.view', 'dispatches.view')
  @Get('issue/:issueId/chain')
  @ApiOperation({ summary: 'Get chain of custody for a published issue' })
  @ApiParam({ name: 'issueId', description: 'PublishIssue ID' })
  getChainOfCustody(@Param('issueId', ParseIntPipe) issueId: number) {
    return this.dispatchesService.getChainOfCustody(issueId);
  }

  @RequirePrivilege('dispatch.view', 'dispatches.view')
  @Get(':id')
  @ApiOperation({ summary: 'Get dispatch details by ID' })
  @ApiParam({ name: 'id', description: 'Dispatch ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dispatchesService.findOne(id);
  }

  @RequirePrivilege('dispatches.edit')
  @Patch(':id')
  @ApiOperation({ summary: 'Update dispatch tracking link or dispatch date' })
  @ApiParam({ name: 'id', description: 'Dispatch ID' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDispatchEntryRequestDto,
  ) {
    return this.dispatchesService.update(id, dto);
  }

  @RequirePrivilege('dispatches.in_transit', 'dispatches.edit')
  @Patch(':id/in-transit')
  @ApiOperation({ summary: 'Transition dispatch from Dispatched to InTransit' })
  @ApiParam({ name: 'id', description: 'Dispatch ID' })
  setInTransit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: InTransitDispatchRequestDto,
  ) {
    return this.dispatchesService.setInTransit(id, dto);
  }

  @RequirePrivilege('dispatches.receive')
  @Patch(':id/receive')
  @ApiOperation({
    summary: 'Receive and verify consignment at destination point',
  })
  @ApiParam({ name: 'id', description: 'Dispatch ID' })
  receive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReceiveDispatchRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const ctx = this.getContext(req);
    return this.dispatchesService.receive(id, dto, ctx.user.id);
  }

  @RequirePrivilege(
    'dispatches.forward',
    'dispatches.create',
    'dispatches.edit',
  )
  @Post(':id/forward')
  @ApiOperation({ summary: 'Forward received consignment to downstream point' })
  @ApiParam({ name: 'id', description: 'Dispatch ID' })
  forward(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ForwardDispatchRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const ctx = this.getContext(req);
    return this.dispatchesService.forward(id, dto, ctx.user?.id);
  }

  @RequirePrivilege('dispatches.cancel', 'dispatches.delete', 'dispatches.edit')
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an unreceived or in-transit dispatch' })
  @ApiParam({ name: 'id', description: 'Dispatch ID' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.dispatchesService.cancel(id);
  }

  @RequirePrivilege('dispatches.edit')
  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Mark completed after downstream distribution step is finished',
  })
  @ApiParam({ name: 'id', description: 'Dispatch ID' })
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.dispatchesService.complete(id);
  }
}
