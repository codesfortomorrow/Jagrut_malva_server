import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
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
import { DashboardService } from './dashboard.service';
import { DashboardSummaryResponseDto } from './dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard, PrivilegeGuard)
@Controller('dashboard')
export class DashboardController extends BaseController {
  constructor(private readonly dashboardService: DashboardService) {
    super();
  }

  @RequirePrivilege('dashboard.view')
  @Get()
  @ApiOperation({
    summary:
      'Get contextual dashboard summary for the logged-in admin (node-level or central)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics, current edition, and dispatch status',
    type: DashboardSummaryResponseDto,
  })
  getDashboard(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return this.dashboardService.getSummary(ctx.user);
  }

  @RequirePrivilege('dashboard.view')
  @Get('summary')
  @ApiOperation({
    summary:
      'Alias for GET /dashboard — returns the same contextual dashboard summary',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics, current edition, and dispatch status',
    type: DashboardSummaryResponseDto,
  })
  getDashboardSummary(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return this.dashboardService.getSummary(ctx.user);
  }
}
