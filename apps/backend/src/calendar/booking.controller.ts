import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { BookingService, BookingProvider } from './booking.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';

@Controller('integrations')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly booking: BookingService) {}

  // ── Calendly ───────────────────────────────────────────────────────────────

  @Get('calendly/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('calendar.core')
  calendlyStatus(@TenantId() tenantId: string) {
    return this.booking.getStatus(tenantId, 'calendly');
  }

  @Post('calendly/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('calendar.core')
  async calendlyConfig(
    @TenantId() tenantId: string,
    @Body() body: { apiKey: string; bookingUrl: string },
  ) {
    if (!body?.apiKey || !body?.bookingUrl) {
      return { ok: false, error: 'apiKey e bookingUrl são obrigatórios' };
    }
    return this.booking.saveConfig(tenantId, 'calendly', body);
  }

  // ── Cal.com ────────────────────────────────────────────────────────────────

  @Get('calcom/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('calendar.core')
  calcomStatus(@TenantId() tenantId: string) {
    return this.booking.getStatus(tenantId, 'cal_com');
  }

  @Post('calcom/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('calendar.core')
  async calcomConfig(
    @TenantId() tenantId: string,
    @Body() body: { apiKey: string; bookingUrl: string; baseUrl?: string },
  ) {
    if (!body?.apiKey || !body?.bookingUrl) {
      return { ok: false, error: 'apiKey e bookingUrl são obrigatórios' };
    }
    return this.booking.saveConfig(tenantId, 'cal_com', body);
  }

  // ── Shared endpoints ───────────────────────────────────────────────────────

  @Get('booking/link')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('calendar.core')
  getBookingLink(
    @TenantId() tenantId: string,
    @Query('provider') provider?: string,
    @Query('contactId') contactId?: string,
  ) {
    const p = provider === 'calendly' || provider === 'cal_com'
      ? (provider as BookingProvider)
      : undefined;
    return this.booking.getBookingLink(tenantId, { provider: p, contactId });
  }

  @Post('booking/sync')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('calendar.core')
  @HttpCode(HttpStatus.OK)
  sync(
    @TenantId() tenantId: string,
    @Query('provider') provider?: string,
  ) {
    const p = provider === 'calendly' || provider === 'cal_com'
      ? (provider as BookingProvider)
      : undefined;
    return this.booking.syncEvents(tenantId, p);
  }

  // ── Webhooks (no auth guard — called by external services) ─────────────────

  @Post('booking/webhook/calendly')
  @HttpCode(HttpStatus.OK)
  async calendlyWebhook(
    @Query('tenantId') tenantId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    if (!tenantId) return { ok: false, error: 'tenantId query param required' };
    try {
      await this.booking.processCalendlyWebhook(tenantId, payload);
    } catch (err) {
      this.logger.error(`Calendly webhook error: ${err instanceof Error ? err.message : err}`);
    }
    return { ok: true };
  }

  @Post('booking/webhook/calcom')
  @HttpCode(HttpStatus.OK)
  async calcomWebhook(
    @Query('tenantId') tenantId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    if (!tenantId) return { ok: false, error: 'tenantId query param required' };
    try {
      await this.booking.processCalComWebhook(tenantId, payload);
    } catch (err) {
      this.logger.error(`Cal.com webhook error: ${err instanceof Error ? err.message : err}`);
    }
    return { ok: true };
  }
}
