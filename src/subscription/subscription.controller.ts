import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import { NewSubscriptionRequestDto } from './dto/new-subscription-request.dto';
import { SubscriptionService } from './subscription.service';
import { AuthenticatedRequest, BaseController } from '@Common';

@Controller('subscription')
export class SubscriptionController extends BaseController {
  constructor(private readonly subscriptionService: SubscriptionService) {
    super();
  }

  @Post(':consumerId')
  async subscribe(
    @Param('consumerId', ParseIntPipe) consumerId: number,
    @Body() data: NewSubscriptionRequestDto,
  ) {
    return this.subscriptionService.subscribe(consumerId, data);
  }

  @Get('me')
  async getMySubscription(@Req() req: AuthenticatedRequest) {
    const consumerId = this.getContext(req).user?.id;
    return this.subscriptionService.getSubscription(consumerId);
  }
}
