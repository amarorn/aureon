import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { GoogleAdsService } from './google-ads.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';

@Controller('ads/google')
@UseGuards(TenantGuard, FeaturesGuard)
@RequireFeature('ads.google')
export class GoogleAdsController {
  constructor(private readonly ads: GoogleAdsService) {}

  @Get('status')
  status(@TenantId() tenantId: string) {
    return this.ads.getStatus(tenantId);
  }

  /** ID da conta Google Ads (só números, ex.: 1234567890). Necessário para chamadas à API. */
  @Put('config')
  setConfig(
    @TenantId() tenantId: string,
    @Body() body: { customerId: string },
  ) {
    if (!body?.customerId) return { ok: false, error: 'customerId required' };
    return this.ads.setCustomerId(tenantId, body.customerId).then(() => ({
      ok: true,
    }));
  }
}
