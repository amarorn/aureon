import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationProvider } from './entities/integration.entity';

interface ZoomTokens {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expiry_date?: number;
}

@Injectable()
export class ZoomService {
  private readonly logger = new Logger(ZoomService.name);

  constructor(private readonly integrationService: IntegrationService) {}

  async isConnected(tenantId: string): Promise<boolean> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.ZOOM,
    );
    if (!integration || integration.status !== 'connected') return false;
    const creds = integration.credentials as ZoomTokens | null;
    return Boolean(creds?.access_token);
  }

  private async getToken(tenantId: string): Promise<string | null> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.ZOOM,
    );
    const creds = integration?.credentials as ZoomTokens | null;
    return creds?.access_token ?? null;
  }

  /**
   * Cria reunião agendada; retorna join_url para meetingUrl / proposta.
   */
  async createMeeting(
    tenantId: string,
    params: {
      topic: string;
      startAt: Date;
      endAt: Date;
      agenda?: string;
    },
  ): Promise<{ join_url: string; start_url: string; id: string } | null> {
    const token = await this.getToken(tenantId);
    if (!token) return null;
    const durationMin = Math.max(
      1,
      Math.round((params.endAt.getTime() - params.startAt.getTime()) / 60000),
    );
    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: params.topic,
        type: 2,
        start_time: params.startAt.toISOString(),
        duration: durationMin,
        timezone: 'America/Sao_Paulo',
        agenda: params.agenda,
        settings: {
          join_before_host: true,
        },
      }),
    });
    if (!res.ok) {
      this.logger.warn(`Zoom createMeeting failed: ${await res.text()}`);
      return null;
    }
    const data = (await res.json()) as {
      join_url: string;
      start_url: string;
      id: string;
    };
    return data;
  }
}
