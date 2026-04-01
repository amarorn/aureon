import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RdStationService } from './rd-station.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';

@Controller('integrations/rd-station')
@UseGuards(TenantGuard, FeaturesGuard)
@RequireFeature('integrations.core')
export class RdStationController {
  constructor(private readonly rdStation: RdStationService) {}

  @Get('status')
  async status(@TenantId() tenantId: string) {
    const connected = await this.rdStation.isConnected(tenantId);
    return { connected };
  }

  @Get('segmentations')
  async listSegmentations(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rdStation.listSegmentations(
      tenantId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post('sync-segmentation')
  async syncSegmentation(
    @TenantId() tenantId: string,
    @Body()
    body: {
      segmentationId: string;
      limit?: number;
      page?: number;
    },
  ) {
    if (!body?.segmentationId) {
      return { ok: false, error: 'segmentationId required' };
    }
    return this.rdStation.syncSegmentationToContacts(
      tenantId,
      body.segmentationId,
      body.limit,
      body.page,
    );
  }
}
