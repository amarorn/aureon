import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GoogleAnalyticsService } from './google-analytics.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';

@Controller('analytics/google')
@UseGuards(TenantGuard, FeaturesGuard)
@RequireFeature('analytics.google')
export class GoogleAnalyticsController {
  constructor(private readonly ga: GoogleAnalyticsService) {}

  @Get('status')
  async status(@TenantId() tenantId: string) {
    const connected = await this.ga.isConnected(tenantId);
    const config = await this.ga.getConfig(tenantId);
    return { connected, propertyId: config.propertyId };
  }

  /** Lista contas/propriedades após OAuth (Admin API). */
  @Get('account-summaries')
  accountSummaries(@TenantId() tenantId: string) {
    return this.ga.listAccountSummaries(tenantId);
  }

  /** Define propriedade GA4 usada nos relatórios (salvo em integration.config). */
  @Put('config')
  setConfig(
    @TenantId() tenantId: string,
    @Body() body: { propertyId: string },
  ) {
    if (!body?.propertyId) return { ok: false, error: 'propertyId required' };
    return this.ga.setPropertyId(tenantId, body.propertyId).then(() => ({
      ok: true,
    }));
  }

  /** Série diária para gráficos (sessões e usuários por dia). */
  @Get('timeseries')
  timeseries(
    @TenantId() tenantId: string,
    @Query('days') days?: string,
  ) {
    return this.ga.getConfig(tenantId).then(({ propertyId }) => {
      if (!propertyId)
        return { error: 'Configure propertyId via PUT .../config' };
      return this.ga.runReportTimeseries(
        tenantId,
        propertyId,
        Math.min(90, Math.max(1, parseInt(days || '30', 10) || 30)),
      );
    });
  }

  /** Overview agregado: summary, timeseries estendido, canais, páginas, países. */
  @Get('overview')
  async overview(
    @TenantId() tenantId: string,
    @Query('days') days?: string,
  ): Promise<unknown> {
    const { propertyId } = await this.ga.getConfig(tenantId);
    if (!propertyId)
      return { error: 'Configure propertyId via PUT .../config' };
    return this.ga.getOverview(
      tenantId,
      propertyId,
      Math.min(90, Math.max(1, parseInt(days || '30', 10) || 30)),
    );
  }

  /** Relatório rápido: sessões e usuários no período. */
  @Get('report')
  report(
    @TenantId() tenantId: string,
    @Query('days') days?: string,
  ) {
    return this.ga.getConfig(tenantId).then(({ propertyId }) => {
      if (!propertyId)
        return { error: 'Configure propertyId via PUT .../config' };
      return this.ga.runReport(
        tenantId,
        propertyId,
        Math.min(90, Math.max(1, parseInt(days || '7', 10) || 7)),
      );
    });
  }
}
