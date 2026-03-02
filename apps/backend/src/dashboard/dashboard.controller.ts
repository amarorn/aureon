import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService, DashboardFilters } from './dashboard.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('dashboard')
@UseGuards(TenantGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  getMetrics(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('userId') userId?: string,
  ) {
    const filters: DashboardFilters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (pipelineId) filters.pipelineId = pipelineId;
    if (userId) filters.userId = userId;
    return this.dashboardService.getMetrics(tenantId, filters);
  }
}
