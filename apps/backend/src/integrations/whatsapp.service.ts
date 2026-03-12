import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationProvider } from './entities/integration.entity';

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
}

export interface SendMessageDto {
  to: string; // phone number with country code, e.g. 5511999999999
  text: string;
}

export interface SendTemplateDto {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: unknown[];
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v19.0';

  constructor(private readonly integrationService: IntegrationService) {}

  async isConnected(tenantId: string): Promise<boolean> {
    const cfg = await this.getConfig(tenantId);
    return !!(cfg?.phoneNumberId && cfg?.accessToken);
  }

  private async getConfig(tenantId: string): Promise<WhatsAppConfig | null> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.WHATSAPP,
    );
    if (!integration || integration.status !== 'connected') return null;
    const cfg = integration.config as WhatsAppConfig | null;
    if (!cfg?.phoneNumberId || !cfg?.accessToken) return null;
    return cfg;
  }

  async saveConfig(
    tenantId: string,
    phoneNumberId: string,
    accessToken: string,
  ): Promise<void> {
    const existing = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.WHATSAPP,
    );

    if (existing) {
      await this.integrationService.updateConfig(tenantId, IntegrationProvider.WHATSAPP, {
        phoneNumberId,
        accessToken,
      });
      await this.integrationService.setStatus(tenantId, existing.id, 'connected');
    } else {
      await this.integrationService.create(tenantId, {
        provider: IntegrationProvider.WHATSAPP,
        config: { phoneNumberId, accessToken },
      });
      const created = await this.integrationService.findByProvider(
        tenantId,
        IntegrationProvider.WHATSAPP,
      );
      if (created) {
        await this.integrationService.setStatus(tenantId, created.id, 'connected');
      }
    }
  }

  async sendTextMessage(
    tenantId: string,
    dto: SendMessageDto,
  ): Promise<{ messageId: string | null; error?: string }> {
    const cfg = await this.getConfig(tenantId);
    if (!cfg) {
      return { messageId: null, error: 'WhatsApp não configurado para este tenant' };
    }

    const to = dto.to.replace(/\D/g, ''); // strip non-digits

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: dto.text },
    };

    const res = await fetch(
      `${this.baseUrl}/${cfg.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      this.logger.warn(`WhatsApp sendMessage failed to=${to}: ${err}`);
      return { messageId: null, error: err };
    }

    const data = (await res.json()) as {
      messages?: Array<{ id: string }>;
    };
    const messageId = data.messages?.[0]?.id ?? null;
    this.logger.log(`WhatsApp message sent to=${to} messageId=${messageId}`);
    return { messageId };
  }

  async sendTemplate(
    tenantId: string,
    dto: SendTemplateDto,
  ): Promise<{ messageId: string | null; error?: string }> {
    const cfg = await this.getConfig(tenantId);
    if (!cfg) {
      return { messageId: null, error: 'WhatsApp não configurado para este tenant' };
    }

    const to = dto.to.replace(/\D/g, '');

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: dto.templateName,
        language: { code: dto.languageCode ?? 'pt_BR' },
        components: dto.components ?? [],
      },
    };

    const res = await fetch(
      `${this.baseUrl}/${cfg.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      this.logger.warn(`WhatsApp sendTemplate failed to=${to}: ${err}`);
      return { messageId: null, error: err };
    }

    const data = (await res.json()) as {
      messages?: Array<{ id: string }>;
    };
    return { messageId: data.messages?.[0]?.id ?? null };
  }
}
