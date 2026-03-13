import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { GmailService } from './gmail.service';
import { OutlookService } from './outlook.service';

interface SendEmailDto {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  provider?: 'gmail' | 'outlook';
  /** Gmail: reply in same thread */
  replyToMessageId?: string;
  threadId?: string;
}

@Controller('email-inbox')
@UseGuards(TenantGuard)
export class EmailInboxController {
  constructor(
    private readonly gmail: GmailService,
    private readonly outlook: OutlookService,
  ) {}

  // ── Status ─────────────────────────────────────────────────────────────────

  @Get('gmail/status')
  async gmailStatus(@TenantId() tenantId: string) {
    const connected = await this.gmail.isConnected(tenantId);
    const email = connected ? await this.gmail.getEmailAddress(tenantId) : null;
    return { connected, email };
  }

  @Get('outlook/status')
  async outlookStatus(@TenantId() tenantId: string) {
    const connected = await this.outlook.isConnected(tenantId);
    const email = connected ? await this.outlook.getEmailAddress(tenantId) : null;
    return { connected, email };
  }

  @Get('accounts')
  async listAccounts(@TenantId() tenantId: string) {
    const [gmailConnected, outlookConnected] = await Promise.all([
      this.gmail.isConnected(tenantId),
      this.outlook.isConnected(tenantId),
    ]);
    const accounts = [];
    if (gmailConnected) {
      const email = await this.gmail.getEmailAddress(tenantId);
      accounts.push({ provider: 'gmail', email });
    }
    if (outlookConnected) {
      const email = await this.outlook.getEmailAddress(tenantId);
      accounts.push({ provider: 'outlook', email });
    }
    return accounts;
  }

  // ── Sync ───────────────────────────────────────────────────────────────────

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async sync(
    @TenantId() tenantId: string,
    @Query('provider') provider?: 'gmail' | 'outlook',
    @Query('max') max?: string,
  ) {
    const maxMessages = max ? parseInt(max, 10) : 50;
    const results: Record<string, unknown> = {};

    if (!provider || provider === 'gmail') {
      if (await this.gmail.isConnected(tenantId)) {
        results.gmail = await this.gmail.syncInbox(tenantId, maxMessages);
      }
    }
    if (!provider || provider === 'outlook') {
      if (await this.outlook.isConnected(tenantId)) {
        results.outlook = await this.outlook.syncInbox(tenantId, maxMessages);
      }
    }

    return results;
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  @Post('send')
  async send(@TenantId() tenantId: string, @Body() dto: SendEmailDto) {
    // Auto-detect provider if not specified
    let provider = dto.provider;
    if (!provider) {
      provider = (await this.gmail.isConnected(tenantId)) ? 'gmail' : 'outlook';
    }

    if (provider === 'gmail') {
      const result = await this.gmail.sendEmail(tenantId, dto.to, dto.subject, dto.body, {
        cc: dto.cc,
        replyToMessageId: dto.replyToMessageId,
        threadId: dto.threadId,
      });
      return { ok: true, provider: 'gmail', ...result };
    } else {
      await this.outlook.sendEmail(tenantId, dto.to, dto.subject, dto.body, { cc: dto.cc });
      return { ok: true, provider: 'outlook' };
    }
  }
}
