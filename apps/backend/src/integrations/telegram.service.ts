import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationProvider } from './entities/integration.entity';

const TELEGRAM_API = 'https://api.telegram.org/bot';

interface TelegramConfig {
  botToken: string;
}

export interface SendTelegramMessageDto {
  chatId: string; // numeric chat_id or @username
  text: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly integrationService: IntegrationService) {}

  async isConnected(tenantId: string): Promise<boolean> {
    const cfg = await this.getConfig(tenantId);
    return !!cfg?.botToken;
  }

  private async getConfig(tenantId: string): Promise<TelegramConfig | null> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.TELEGRAM,
    );
    if (!integration || integration.status !== 'connected') return null;
    const cfg = integration.config as TelegramConfig | null;
    if (!cfg?.botToken) return null;
    return cfg;
  }

  async saveConfig(tenantId: string, botToken: string): Promise<void> {
    const existing = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.TELEGRAM,
    );

    if (existing) {
      await this.integrationService.updateConfig(tenantId, IntegrationProvider.TELEGRAM, {
        botToken,
      });
      await this.integrationService.setStatus(tenantId, existing.id, 'connected');
    } else {
      await this.integrationService.create(tenantId, {
        provider: IntegrationProvider.TELEGRAM,
        config: { botToken },
      });
      const created = await this.integrationService.findByProvider(
        tenantId,
        IntegrationProvider.TELEGRAM,
      );
      if (created) {
        await this.integrationService.setStatus(tenantId, created.id, 'connected');
      }
    }
  }

  async sendMessage(
    tenantId: string,
    dto: SendTelegramMessageDto,
  ): Promise<{ messageId: number | null; error?: string }> {
    const cfg = await this.getConfig(tenantId);
    if (!cfg) {
      return { messageId: null, error: 'Telegram não configurado para este tenant' };
    }

    const res = await fetch(`${TELEGRAM_API}${cfg.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: dto.chatId,
        text: dto.text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.warn(`Telegram sendMessage failed chatId=${dto.chatId}: ${err}`);
      return { messageId: null, error: err };
    }

    const data = (await res.json()) as { ok: boolean; result?: { message_id: number } };
    const messageId = data.ok && data.result ? data.result.message_id : null;
    this.logger.log(`Telegram message sent chatId=${dto.chatId} messageId=${messageId}`);
    return { messageId };
  }

  async getBotInfo(tenantId: string): Promise<{ username?: string; error?: string } | null> {
    const cfg = await this.getConfig(tenantId);
    if (!cfg) return null;

    const res = await fetch(`${TELEGRAM_API}${cfg.botToken}/getMe`);
    if (!res.ok) {
      const err = await res.text();
      return { error: err };
    }
    const data = (await res.json()) as { ok: boolean; result?: { username: string } };
    return data.ok && data.result ? { username: data.result.username } : null;
  }
}
