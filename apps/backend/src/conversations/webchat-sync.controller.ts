import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { SyncWebchatTranscriptDto } from './dto/sync-webchat-transcript.dto';
import { WebchatSyncService } from './webchat-sync.service';

@Controller('conversations/webchat')
@UseGuards(TenantGuard)
export class WebchatSyncController {
  constructor(private readonly webchatSyncService: WebchatSyncService) {}

  @Post('sync')
  sync(
    @TenantId() tenantId: string,
    @Body() dto: SyncWebchatTranscriptDto,
  ) {
    return this.webchatSyncService.sync(tenantId, dto);
  }
}
