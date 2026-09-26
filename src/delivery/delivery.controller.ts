import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { DeliveryService } from './delivery.service';
import { GetDeliveryLogsRequestDto, MarkDeliveryLogRequestDto } from './dto';

@ApiTags('Delivery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard, PrivilegeGuard)
@Controller('delivery')
export class DeliveryController extends BaseController {
  constructor(private readonly deliveryLogsService: DeliveryService) {
    super();
  }

  @Get()
  @ApiOperation({
    summary: 'List delivery logs, optionally filtered',
  })
  findAll(@Query() query: GetDeliveryLogsRequestDto) {
    return this.deliveryLogsService.findAll(query);
  }

  @Get('dispatch/:dispatchEntryId')
  @ApiOperation({
    summary:
      'Get the delivery board (logs + summary) for one received dispatch',
  })
  @ApiParam({
    name: 'dispatchEntryId',
    type: Number,
    example: 1,
  })
  findAllForDispatch(
    @Param('dispatchEntryId', ParseIntPipe) dispatchEntryId: number,
  ) {
    return this.deliveryLogsService.findAllForDispatch(dispatchEntryId);
  }

  @RequirePrivilege('user.confirm_delivery')
  @Patch(':id')
  @ApiOperation({
    summary: "Mark a consumer's parcel as Delivered or Failed",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  markDelivered(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkDeliveryLogRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const ctx = this.getContext(req);

    return this.deliveryLogsService.markDelivered(id, dto, ctx.user);
  }
}
