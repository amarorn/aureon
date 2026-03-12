import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationService } from '../integrations/integration.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';

interface GoogleTokens {
  access_token?: string;
  refresh_token?: string;
}

@Injectable()
export class GoogleAdsService {
  private readonly logger = new Logger(GoogleAdsService.name);

  constructor(
    private readonly integrationService: IntegrationService,
    private readonly config: ConfigService,
  ) {}

  async getStatus(tenantId: string): Promise<{
    connected: boolean;
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    customerId: string | null;
    developerTokenConfigured: boolean;
  }> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.GOOGLE_ADS,
    );
    if (!integration || integration.status !== 'connected') {
      return {
        connected: false,
        hasAccessToken: false,
        hasRefreshToken: false,
        customerId: null,
        developerTokenConfigured: false,
      };
    }
    const creds = integration.credentials as GoogleTokens | null;
    const config = integration.config as { customerId?: string } | null;
    const developerToken = this.config.get<string>('GOOGLE_ADS_DEVELOPER_TOKEN');
    return {
      connected: true,
      hasAccessToken: Boolean(creds?.access_token),
      hasRefreshToken: Boolean(creds?.refresh_token),
      customerId: config?.customerId ?? null,
      developerTokenConfigured: Boolean(developerToken),
    };
  }

  async setCustomerId(tenantId: string, customerId: string): Promise<void> {
    const normalized = customerId.replace(/\D/g, '');
    if (!normalized) return;
    await this.integrationService.create(tenantId, {
      provider: IntegrationProvider.GOOGLE_ADS,
      config: { customerId: normalized },
    });
  }
}
