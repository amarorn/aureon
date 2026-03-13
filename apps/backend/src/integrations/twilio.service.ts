import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationProvider } from './entities/integration.entity';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);

  constructor(private readonly integrationService: IntegrationService) {}

  async isConnected(tenantId: string): Promise<boolean> {
    const cfg = await this.getConfig(tenantId);
    return !!(cfg?.accountSid && cfg?.authToken && cfg?.phoneNumber);
  }

  private async getConfig(tenantId: string): Promise<TwilioConfig | null> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.TWILIO,
    );
    if (!integration || integration.status !== 'connected') return null;
    const cfg = integration.config as TwilioConfig | null;
    if (!cfg?.accountSid || !cfg?.authToken) return null;
    return cfg;
  }

  async saveConfig(
    tenantId: string,
    accountSid: string,
    authToken: string,
    phoneNumber: string,
  ): Promise<void> {
    const existing = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.TWILIO,
    );
    const config = { accountSid, authToken, phoneNumber };
    if (existing) {
      await this.integrationService.updateConfig(tenantId, IntegrationProvider.TWILIO, config);
      await this.integrationService.setStatus(tenantId, existing.id, 'connected');
    } else {
      await this.integrationService.create(tenantId, {
        provider: IntegrationProvider.TWILIO,
        config,
      });
      const created = await this.integrationService.findByProvider(
        tenantId,
        IntegrationProvider.TWILIO,
      );
      if (created) {
        await this.integrationService.setStatus(tenantId, created.id, 'connected');
      }
    }
  }

  private authHeader(cfg: TwilioConfig): string {
    return 'Basic ' + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64');
  }

  async createCall(
    tenantId: string,
    params: {
      to: string;
      url: string;
      statusCallback: string;
      record?: boolean;
      transcribe?: boolean;
    },
  ): Promise<{ callSid: string | null; error?: string }> {
    const cfg = await this.getConfig(tenantId);
    if (!cfg) return { callSid: null, error: 'Twilio não configurado' };

    const body = new URLSearchParams({
      To: params.to,
      From: cfg.phoneNumber,
      Url: params.url,
      StatusCallback: params.statusCallback,
      StatusCallbackMethod: 'POST',
      ...(params.record && { Record: 'true' }),
      ...(params.transcribe && { Transcribe: 'true' }),
    });

    const res = await fetch(
      `${TWILIO_BASE}/Accounts/${cfg.accountSid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          Authorization: this.authHeader(cfg),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      this.logger.warn(`Twilio createCall failed: ${err}`);
      return { callSid: null, error: err };
    }

    const data = (await res.json()) as { sid: string };
    this.logger.log(`Twilio call created sid=${data.sid} to=${params.to}`);
    return { callSid: data.sid };
  }

  async sendSms(
    tenantId: string,
    to: string,
    body: string,
  ): Promise<{ messageSid: string | null; error?: string }> {
    const cfg = await this.getConfig(tenantId);
    if (!cfg) return { messageSid: null, error: 'Twilio não configurado' };

    const form = new URLSearchParams({
      To: to,
      From: cfg.phoneNumber,
      Body: body,
    });

    const res = await fetch(
      `${TWILIO_BASE}/Accounts/${cfg.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: this.authHeader(cfg),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      this.logger.warn(`Twilio sendSms failed: ${err}`);
      return { messageSid: null, error: err };
    }

    const data = (await res.json()) as { sid: string };
    this.logger.log(`Twilio SMS sent sid=${data.sid} to=${to}`);
    return { messageSid: data.sid };
  }

  validateWebhookSignature(authToken: string, url: string, params: Record<string, string>, signature: string): boolean {
    const crypto = require('crypto');
    const data = url + Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join('');
    const expected = crypto.createHmac('sha1', authToken).update(data).digest('base64');
    return signature === expected;
  }
}
