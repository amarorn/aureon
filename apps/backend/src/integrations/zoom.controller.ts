import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ZoomService } from './zoom.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';

@Controller('integrations/zoom')
@UseGuards(TenantGuard, FeaturesGuard)
@RequireFeature('integrations.core')
export class ZoomController {
  constructor(private readonly zoom: ZoomService) {}

  @Get('status')
  async status(@TenantId() tenantId: string) {
    const connected = await this.zoom.isConnected(tenantId);
    return { connected };
  }

  @Post('meetings')
  async createMeeting(
    @TenantId() tenantId: string,
    @Body()
    body: {
      topic: string;
      startAt: string;
      endAt: string;
      agenda?: string;
    },
  ) {
    const result = await this.zoom.createMeeting(tenantId, {
      topic: body.topic,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      agenda: body.agenda,
    });
    if (!result) return { ok: false, error: 'not_connected_or_failed' };
    return {
      ok: true,
      join_url: result.join_url,
      start_url: result.start_url,
      id: result.id,
    };
  }
}
