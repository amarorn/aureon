import { Controller, Get, Put, Query, Body, UseGuards } from '@nestjs/common';
import { TikTokAdsService } from './tiktok-ads.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('ads/tiktok')
@UseGuards(TenantGuard)
export class TikTokAdsController {
  constructor(private readonly ads: TikTokAdsService) {}

  @Get('status')
  status(@TenantId() tenantId: string) {
    return this.ads.getStatus(tenantId);
  }

  @Put('config')
  setConfig(
    @TenantId() tenantId: string,
    @Body() body: { advertiserId: string },
  ) {
    if (!body?.advertiserId) return { ok: false, error: 'advertiserId required' };
    return this.ads.setAdvertiserId(tenantId, body.advertiserId).then(() => ({ ok: true }));
  }

  @Get('overview')
  overview(
    @TenantId() tenantId: string,
    @Query('days') days?: string,
  ) {
    return this.ads.getOverview(tenantId, days ? parseInt(days, 10) : 30);
  }
}
