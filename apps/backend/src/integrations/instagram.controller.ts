import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { InstagramService } from './instagram.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';

@Controller('integrations/instagram')
export class InstagramController {
  private readonly logger = new Logger(InstagramController.name);

  constructor(private readonly instagramService: InstagramService) {}

  // ── Status ─────────────────────────────────────────────────────────────────

  @Get('status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('inbox.core')
  async status(@TenantId() tenantId: string) {
    const connected = await this.instagramService.isConnected(tenantId);
    const info = connected ? await this.instagramService.getAccountInfo(tenantId) : null;
    return { connected, ...info };
  }

  // ── Config ─────────────────────────────────────────────────────────────────

  @Post('config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('inbox.core')
  async saveConfig(
    @TenantId() tenantId: string,
    @Body() body: { igUserId: string; pageAccessToken: string },
  ) {
    const result = await this.instagramService.saveConfig(
      tenantId,
      body.igUserId,
      body.pageAccessToken,
    );
    return { ok: true, ...result };
  }

  // ── Webhook — Meta verification challenge (GET) ────────────────────────────

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.instagramService.verifyWebhook(mode, token, challenge);
    if (result !== null) {
      return res.status(200).send(result);
    }
    this.logger.warn('Instagram webhook verification failed — token mismatch');
    return res.status(403).send('Forbidden');
  }

  // ── Webhook — receive DM events (POST) ────────────────────────────────────
  // Meta sends events to this endpoint. Tenant is identified by a query param
  // (?tenantId=xxx) that you configure in the Meta Webhooks dashboard.
  // Alternatively configure one webhook per tenant app.

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Query('tenantId') tenantId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    if (!tenantId) {
      this.logger.warn('Instagram webhook POST received without tenantId query param');
      return { ok: false, error: 'tenantId query param required' };
    }
    try {
      await this.instagramService.processWebhookEvent(tenantId, payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Instagram webhook processing error: ${msg}`);
    }
    // Always return 200 to Meta to prevent retries
    return { ok: true };
  }

  // ── Manual sync ────────────────────────────────────────────────────────────

  @Post('sync')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('inbox.core')
  @HttpCode(HttpStatus.OK)
  async sync(@TenantId() tenantId: string) {
    return this.instagramService.syncConversations(tenantId);
  }

  // ── Send DM ────────────────────────────────────────────────────────────────

  @Post('send')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('inbox.core')
  async send(
    @TenantId() tenantId: string,
    @Body() body: { recipientIgsid: string; text: string },
  ) {
    return this.instagramService.sendDm(tenantId, body.recipientIgsid, body.text);
  }
}
