import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NewSubscriptionRequestDto } from './dto';
import { SubscriptionService } from './subscription.service';
import { AuthenticatedRequest, BaseController, JwtAuthGuard } from '@Common';

@Controller('subscription')
export class SubscriptionController extends BaseController {
  constructor(private readonly subscriptionService: SubscriptionService) {
    super();
  }

  @Post(':userId')
  async subscribe(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() data: NewSubscriptionRequestDto,
  ) {
    return this.subscriptionService.subscribe(userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMySubscription(@Req() req: AuthenticatedRequest) {
    const userId = this.getContext(req).user?.id;
    return this.subscriptionService.getSubscription(userId);
  }
}
