import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Integration, IntegrationProvider } from './entities/integration.entity';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { TenantService } from '../tenant/tenant.service';
import type { TenantOAuthConfig, TenantOAuthProviderConfig } from '../tenant/tenant-oauth-config.types';

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
  [IntegrationProvider.GOOGLE_CALENDAR]: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  [IntegrationProvider.GMAIL]: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
};

const MICROSOFT_OAUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const OUTLOOK_SCOPES = 'Mail.Read Mail.Send offline_access User.Read';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepo: Repository<Integration>,
    private readonly config: ConfigService,
    private readonly tenantService: TenantService,
  ) {}

  private async loadTenantOAuth(tenantId: string): Promise<TenantOAuthConfig | null> {
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant?.oauthConfig || typeof tenant.oauthConfig !== 'object') return null;
    return tenant.oauthConfig as TenantOAuthConfig;
  }

  private pickGoogleCreds(
    oauth: TenantOAuthConfig | null,
    provider: IntegrationProvider,
  ): { clientId: string; clientSecret: string } | null {
    const key = provider as keyof TenantOAuthConfig;
    const block = oauth?.[key] ?? oauth?.google;
    if (!block || typeof block !== 'object') return null;
    const b = block as TenantOAuthProviderConfig;
    const clientId = b.clientId?.trim();
    const clientSecret = b.clientSecret?.trim();
    if (clientId && clientSecret) return { clientId, clientSecret };
    return null;
  }

  private pickFacebookCreds(oauth: TenantOAuthConfig | null): { appId: string; appSecret: string } | null {
    const b = oauth?.facebook_ads;
    if (!b || typeof b !== 'object') return null;
    const appId = (b as TenantOAuthProviderConfig).appId?.trim() || (b as TenantOAuthProviderConfig).clientId?.trim();
    const appSecret =
      (b as TenantOAuthProviderConfig).appSecret?.trim() ||
      (b as TenantOAuthProviderConfig).clientSecret?.trim();
    if (appId && appSecret) return { appId, appSecret };
    return null;
  }

  private pickLinkedInCreds(oauth: TenantOAuthConfig | null): { clientId: string; clientSecret: string } | null {
    const b = oauth?.linkedin;
    if (!b || typeof b !== 'object') return null;
    const clientId = (b as TenantOAuthProviderConfig).clientId?.trim();
    const clientSecret = (b as TenantOAuthProviderConfig).clientSecret?.trim();
    if (clientId && clientSecret) return { clientId, clientSecret };
    return null;
  }

  private pickZoomCreds(oauth: TenantOAuthConfig | null): { clientId: string; clientSecret: string } | null {
    const b = oauth?.zoom;
    if (!b || typeof b !== 'object') return null;
    const clientId = (b as TenantOAuthProviderConfig).clientId?.trim();
    const clientSecret = (b as TenantOAuthProviderConfig).clientSecret?.trim();
    if (clientId && clientSecret) return { clientId, clientSecret };
    return null;
  }

  private pickOutlookCreds(oauth: TenantOAuthConfig | null): { clientId: string; clientSecret: string } | null {
    const b = oauth?.outlook;
    if (!b || typeof b !== 'object') return null;
    const clientId = (b as TenantOAuthProviderConfig).clientId?.trim();
    const clientSecret = (b as TenantOAuthProviderConfig).clientSecret?.trim();
    if (clientId && clientSecret) return { clientId, clientSecret };
    return null;
  }

  async updateTenantOAuthConfig(
    tenantId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const tenant = await this.tenantService.updateOAuthConfig(tenantId, patch);
    if (!tenant) throw new NotFoundException('Tenant not found');
  }

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

  async getOAuthUrl(
    provider: IntegrationProvider,
    tenantId: string,
    redirectUri: string,
  ): Promise<string> {
    const oauth = await this.loadTenantOAuth(tenantId);

    let clientId: string | undefined;
    if (provider === IntegrationProvider.FACEBOOK_ADS) {
      clientId =
        this.pickFacebookCreds(oauth)?.appId ||
        this.config.get('INTEGRATION_FACEBOOK_ADS_APP_ID');
    } else if (
      provider === IntegrationProvider.GOOGLE_ANALYTICS ||
      provider === IntegrationProvider.GOOGLE_BUSINESS_PROFILE ||
      provider === IntegrationProvider.GOOGLE_ADS ||
      provider === IntegrationProvider.GOOGLE_CALENDAR ||
      provider === IntegrationProvider.GMAIL
    ) {
      clientId =
        this.pickGoogleCreds(oauth, provider)?.clientId ||
        this.getGoogleClientId(provider);
    } else if (provider === IntegrationProvider.LINKEDIN) {
      clientId =
        this.pickLinkedInCreds(oauth)?.clientId ||
        this.config.get('INTEGRATION_LINKEDIN_CLIENT_ID');
    } else if (provider === IntegrationProvider.ZOOM) {
      clientId =
        this.pickZoomCreds(oauth)?.clientId ||
        this.config.get('INTEGRATION_ZOOM_CLIENT_ID');
    } else if (provider === IntegrationProvider.OUTLOOK) {
      clientId =
        this.pickOutlookCreds(oauth)?.clientId ||
        this.config.get('INTEGRATION_OUTLOOK_CLIENT_ID');
    }
    if (!clientId) {
      throw new BadRequestException(
        `Integração ${provider} não configurada (client ID ausente). Configure as variáveis de ambiente.`,
      );
    }

    if (
      provider === IntegrationProvider.GOOGLE_ANALYTICS ||
      provider === IntegrationProvider.GOOGLE_BUSINESS_PROFILE ||
      provider === IntegrationProvider.GOOGLE_ADS ||
      provider === IntegrationProvider.GOOGLE_CALENDAR ||
      provider === IntegrationProvider.GMAIL
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

    if (provider === IntegrationProvider.LINKEDIN) {
      if (!clientId) {
        throw new BadRequestException(
          'LinkedIn não configurado para este tenant (oauthConfig.linkedin ou INTEGRATION_LINKEDIN_CLIENT_ID).',
        );
      }
      const state = Buffer.from(JSON.stringify({ tenantId, provider })).toString('base64url');
      const baseScopes = ['openid', 'profile', 'email'];
      if (this.config.get('INTEGRATION_LINKEDIN_LEADGEN_SCOPES') === 'true') {
        baseScopes.push('r_marketing_leadgen_automation');
      }
      const scopes = baseScopes.join(' ');
      return (
        'https://www.linkedin.com/oauth/v2/authorization?' +
        new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          redirect_uri: redirectUri,
          state,
          scope: scopes,
        }).toString()
      );
    }

    if (provider === IntegrationProvider.ZOOM) {
      if (!clientId) {
        throw new BadRequestException(
          'Zoom não configurado para este tenant (oauthConfig.zoom ou INTEGRATION_ZOOM_CLIENT_ID).',
        );
      }
      const state = Buffer.from(JSON.stringify({ tenantId, provider })).toString('base64url');
      return (
        'https://zoom.us/oauth/authorize?' +
        new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          redirect_uri: redirectUri,
          state,
        }).toString()
      );
    }

    if (provider === IntegrationProvider.OUTLOOK) {
      if (!clientId) {
        throw new BadRequestException(
          'Outlook não configurado para este tenant (oauthConfig.outlook ou INTEGRATION_OUTLOOK_CLIENT_ID).',
        );
      }
      const state = Buffer.from(JSON.stringify({ tenantId, provider })).toString('base64url');
      return (
        MICROSOFT_OAUTH_URL + '?' +
        new URLSearchParams({
          client_id: clientId,
          response_type: 'code',
          redirect_uri: redirectUri,
          response_mode: 'query',
          scope: OUTLOOK_SCOPES,
          state,
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
      provider === IntegrationProvider.GOOGLE_ADS ||
      provider === IntegrationProvider.GOOGLE_CALENDAR ||
      provider === IntegrationProvider.GMAIL
    ) {
      tokens = await this.exchangeGoogleCode(tenantId, provider, code, redirectUri);
    } else if (provider === IntegrationProvider.FACEBOOK_ADS) {
      tokens = await this.exchangeFacebookCode(tenantId, code, redirectUri);
    } else if (provider === IntegrationProvider.LINKEDIN) {
      tokens = await this.exchangeLinkedInCode(tenantId, code, redirectUri);
    } else if (provider === IntegrationProvider.ZOOM) {
      tokens = await this.exchangeZoomCode(tenantId, code, redirectUri);
    } else if (provider === IntegrationProvider.OUTLOOK) {
      tokens = await this.exchangeOutlookCode(tenantId, code, redirectUri);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    let integration = await this.findByProvider(tenantId, provider);
    const prev = integration?.credentials as Record<string, unknown> | null;
    if (
      prev &&
      typeof prev.refresh_token === 'string' &&
      tokens &&
      typeof tokens === 'object' &&
      !tokens.refresh_token
    ) {
      tokens = { ...tokens, refresh_token: prev.refresh_token };
    }

    const expiresIn = tokens.expires_in;
    if (typeof expiresIn === 'number' && !tokens.expiry_date) {
      tokens = {
        ...tokens,
        expiry_date: Date.now() + expiresIn * 1000,
      };
    }

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
    const saved = await this.integrationRepo.save(integration);
    this.logger.log(
      `OAuth callback saved provider=${provider} tenantId=${tenantId} integrationId=${saved.id}`,
    );
    return saved;
  }

  private async exchangeGoogleCode(
    tenantId: string,
    provider: IntegrationProvider,
    code: string,
    redirectUri: string,
  ): Promise<Record<string, unknown>> {
    const oauth = await this.loadTenantOAuth(tenantId);
    const picked = this.pickGoogleCreds(oauth, provider);
    const clientId = picked?.clientId || this.getGoogleClientId(provider);
    const clientSecret =
      picked?.clientSecret || this.config.get('INTEGRATION_GOOGLE_CLIENT_SECRET');

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
    tenantId: string,
    code: string,
    redirectUri: string,
  ): Promise<Record<string, unknown>> {
    const oauth = await this.loadTenantOAuth(tenantId);
    const picked = this.pickFacebookCreds(oauth);
    const appId = picked?.appId || this.config.get('INTEGRATION_FACEBOOK_ADS_APP_ID');
    const appSecret =
      picked?.appSecret || this.config.get('INTEGRATION_FACEBOOK_ADS_APP_SECRET');

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

  private async exchangeLinkedInCode(
    tenantId: string,
    code: string,
    redirectUri: string,
  ): Promise<Record<string, unknown>> {
    const oauth = await this.loadTenantOAuth(tenantId);
    const picked = this.pickLinkedInCreds(oauth);
    const clientId = picked?.clientId || this.config.get('INTEGRATION_LINKEDIN_CLIENT_ID');
    const clientSecret =
      picked?.clientSecret || this.config.get('INTEGRATION_LINKEDIN_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new Error('LinkedIn OAuth not configured');
    }
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`LinkedIn token exchange failed: ${err}`);
    }
    const json = (await res.json()) as Record<string, unknown>;
    const expiresIn = json.expires_in;
    if (typeof expiresIn === 'number') {
      json.expiry_date = Date.now() + expiresIn * 1000;
    }
    return json;
  }

  private async exchangeZoomCode(
    tenantId: string,
    code: string,
    redirectUri: string,
  ): Promise<Record<string, unknown>> {
    const oauth = await this.loadTenantOAuth(tenantId);
    const picked = this.pickZoomCreds(oauth);
    const clientId = picked?.clientId || this.config.get('INTEGRATION_ZOOM_CLIENT_ID');
    const clientSecret =
      picked?.clientSecret || this.config.get('INTEGRATION_ZOOM_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new Error('Zoom OAuth not configured');
    }
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Zoom token exchange failed: ${err}`);
    }
    const json = (await res.json()) as Record<string, unknown>;
    const expiresIn = json.expires_in;
    if (typeof expiresIn === 'number') {
      json.expiry_date = Date.now() + expiresIn * 1000;
    }
    return json;
  }

  private async exchangeOutlookCode(
    tenantId: string,
    code: string,
    redirectUri: string,
  ): Promise<Record<string, unknown>> {
    const oauth = await this.loadTenantOAuth(tenantId);
    const picked = this.pickOutlookCreds(oauth);
    const clientId = picked?.clientId || this.config.get('INTEGRATION_OUTLOOK_CLIENT_ID');
    const clientSecret =
      picked?.clientSecret || this.config.get('INTEGRATION_OUTLOOK_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new Error('Outlook OAuth not configured');
    }
    const res = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        scope: OUTLOOK_SCOPES,
      }).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Outlook token exchange failed: ${err}`);
    }
    const json = (await res.json()) as Record<string, unknown>;
    const expiresIn = json.expires_in;
    if (typeof expiresIn === 'number') {
      json.expiry_date = Date.now() + expiresIn * 1000;
    }
    return json;
  }

  async refreshOutlookAccessToken(
    tenantId: string,
    refreshToken: string,
  ): Promise<{ access_token: string; expires_in?: number }> {
    const oauth = await this.loadTenantOAuth(tenantId);
    const picked = this.pickOutlookCreds(oauth);
    const clientId = picked?.clientId || this.config.get('INTEGRATION_OUTLOOK_CLIENT_ID');
    const clientSecret =
      picked?.clientSecret || this.config.get('INTEGRATION_OUTLOOK_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new Error('Outlook OAuth not configured for refresh');
    }
    const res = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        scope: OUTLOOK_SCOPES,
      }).toString(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ access_token: string; expires_in?: number }>;
  }

  /**
   * Refresh Google access_token usando credenciais do tenant ou env.
   */
  async refreshGoogleAccessToken(
    tenantId: string,
    refreshToken: string,
  ): Promise<{ access_token: string; expires_in?: number }> {
    const oauth = await this.loadTenantOAuth(tenantId);
    const picked =
      this.pickGoogleCreds(oauth, IntegrationProvider.GOOGLE_CALENDAR) ||
      this.pickGoogleCreds(oauth, IntegrationProvider.GOOGLE_ANALYTICS);
    const clientId =
      picked?.clientId || this.config.get('INTEGRATION_GOOGLE_CLIENT_ID');
    const clientSecret =
      picked?.clientSecret || this.config.get('INTEGRATION_GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth not configured for refresh');
    }
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }).toString(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ access_token: string; expires_in?: number }>;
  }

  async updateCredentials(
    tenantId: string,
    provider: IntegrationProvider,
    credentials: Record<string, unknown>,
  ): Promise<void> {
    const integration = await this.findByProvider(tenantId, provider);
    if (!integration) return;
    integration.credentials = credentials;
    await this.integrationRepo.save(integration);
  }

  async updateConfig(
    tenantId: string,
    provider: IntegrationProvider,
    config: Record<string, unknown>,
  ): Promise<void> {
    const integration = await this.findByProvider(tenantId, provider);
    if (!integration) return;
    integration.config = config;
    await this.integrationRepo.save(integration);
  }

  async setStatus(tenantId: string, id: string, status: string): Promise<void> {
    await this.integrationRepo.update({ id, tenantId }, { status });
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
