import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Integration, IntegrationProvider } from './entities/integration.entity';
import { CreateIntegrationDto } from './dto/create-integration.dto';

const GOOGLE_SCOPES: Record<string, string[]> = {
  [IntegrationProvider.GOOGLE_ANALYTICS]: [
    'https://www.googleapis.com/auth/analytics.readonly',
  ],
  [IntegrationProvider.GOOGLE_BUSINESS_PROFILE]: [
    'https://www.googleapis.com/auth/business.manage',
  ],
  [IntegrationProvider.GOOGLE_ADS]: [
    'https://www.googleapis.com/auth/adwords',
  ],
};

@Injectable()
export class IntegrationService {
  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepo: Repository<Integration>,
    private readonly config: ConfigService,
  ) {}

  async create(tenantId: string, dto: CreateIntegrationDto): Promise<Integration> {
    let integration = await this.integrationRepo.findOne({
      where: { tenantId, provider: dto.provider },
    });
    if (integration) {
      integration.config = dto.config ?? integration.config;
      return this.integrationRepo.save(integration);
    }
    integration = this.integrationRepo.create({
      tenantId,
      provider: dto.provider,
      status: 'disconnected',
      config: dto.config,
    });
    return this.integrationRepo.save(integration);
  }

  async findAll(tenantId: string): Promise<Integration[]> {
    return this.integrationRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Integration> {
    const integration = await this.integrationRepo.findOne({
      where: { id, tenantId },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return integration;
  }

  async findByProvider(
    tenantId: string,
    provider: IntegrationProvider,
  ): Promise<Integration | null> {
    return this.integrationRepo.findOne({
      where: { tenantId, provider },
    });
  }

  private getGoogleClientId(provider: IntegrationProvider): string {
    const id = this.config.get(`INTEGRATION_${provider.toUpperCase()}_CLIENT_ID`);
    return id || this.config.get('INTEGRATION_GOOGLE_CLIENT_ID') || '';
  }

  getOAuthUrl(
    provider: IntegrationProvider,
    tenantId: string,
    redirectUri: string,
  ): string {
    const clientId =
      provider === IntegrationProvider.FACEBOOK_ADS
        ? this.config.get('INTEGRATION_FACEBOOK_ADS_APP_ID')
        : this.getGoogleClientId(provider);
    if (!clientId) {
      throw new BadRequestException(
        `Integração ${provider} não configurada (client ID ausente). Configure as variáveis de ambiente.`,
      );
    }

    if (
      provider === IntegrationProvider.GOOGLE_ANALYTICS ||
      provider === IntegrationProvider.GOOGLE_BUSINESS_PROFILE ||
      provider === IntegrationProvider.GOOGLE_ADS
    ) {
      const scopes = GOOGLE_SCOPES[provider]?.join(' ') || '';
      const state = Buffer.from(JSON.stringify({ tenantId, provider })).toString('base64url');
      return (
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: scopes,
          state,
          access_type: 'offline',
          prompt: 'consent',
        }).toString()
      );
    }

    if (provider === IntegrationProvider.FACEBOOK_ADS) {
      const state = Buffer.from(JSON.stringify({ tenantId, provider })).toString('base64url');
      return (
        'https://www.facebook.com/v18.0/dialog/oauth?' +
        new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          state,
          scope: 'ads_management,ads_read',
        }).toString()
      );
    }

    throw new Error(`Unknown provider: ${provider}`);
  }

  async handleOAuthCallback(
    provider: IntegrationProvider,
    tenantId: string,
    code: string,
    redirectUri: string,
  ): Promise<Integration> {
    let tokens: Record<string, unknown>;

    if (
      provider === IntegrationProvider.GOOGLE_ANALYTICS ||
      provider === IntegrationProvider.GOOGLE_BUSINESS_PROFILE ||
      provider === IntegrationProvider.GOOGLE_ADS
    ) {
      tokens = await this.exchangeGoogleCode(provider, code, redirectUri);
    } else if (provider === IntegrationProvider.FACEBOOK_ADS) {
      tokens = await this.exchangeFacebookCode(code, redirectUri);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    let integration = await this.findByProvider(tenantId, provider);
    if (!integration) {
      integration = this.integrationRepo.create({
        tenantId,
        provider,
        status: 'connected',
        credentials: tokens,
      });
    } else {
      integration.status = 'connected';
      integration.credentials = tokens;
    }
    return this.integrationRepo.save(integration);
  }

  private async exchangeGoogleCode(
    provider: IntegrationProvider,
    code: string,
    redirectUri: string,
  ): Promise<Record<string, unknown>> {
    const clientId = this.getGoogleClientId(provider);
    const clientSecret = this.config.get('INTEGRATION_GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth not configured');
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google token exchange failed: ${err}`);
    }
    return res.json();
  }

  private async exchangeFacebookCode(
    code: string,
    redirectUri: string,
  ): Promise<Record<string, unknown>> {
    const appId = this.config.get('INTEGRATION_FACEBOOK_ADS_APP_ID');
    const appSecret = this.config.get('INTEGRATION_FACEBOOK_ADS_APP_SECRET');

    if (!appId || !appSecret) {
      throw new Error('Facebook OAuth not configured');
    }

    const res = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        }).toString(),
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Facebook token exchange failed: ${err}`);
    }
    return res.json();
  }

  async disconnect(tenantId: string, id: string): Promise<Integration> {
    const integration = await this.findOne(tenantId, id);
    integration.status = 'disconnected';
    integration.credentials = null;
    return this.integrationRepo.save(integration);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.integrationRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Integration not found');
  }
}
