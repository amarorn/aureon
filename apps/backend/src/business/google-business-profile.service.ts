import { Injectable } from '@nestjs/common';
import { IntegrationService } from '../integrations/integration.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';

interface GoogleTokens {
  access_token?: string;
  refresh_token?: string;
}

@Injectable()
export class GoogleBusinessProfileService {
  constructor(private readonly integrationService: IntegrationService) {}

  async getStatus(tenantId: string): Promise<{
    connected: boolean;
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
  }> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.GOOGLE_BUSINESS_PROFILE,
    );
    if (!integration || integration.status !== 'connected') {
      return {
        connected: false,
        hasAccessToken: false,
        hasRefreshToken: false,
      };
    }
    const creds = integration.credentials as GoogleTokens | null;
    return {
      connected: true,
      hasAccessToken: Boolean(creds?.access_token),
      hasRefreshToken: Boolean(creds?.refresh_token),
    };
  }
}
