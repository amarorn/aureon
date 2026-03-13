import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from '../integrations/integration.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';

const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3';

interface TikTokCredentials {
  access_token?: string;
  advertiser_ids?: string[];
  app_id?: string;
  expiry_date?: number;
}

interface TikTokConfig {
  advertiserId?: string;
}

export interface TikTokStatus {
  connected: boolean;
  advertiserId: string | null;
  availableAdvertiserIds: string[];
  username?: string;
}

export interface TikTokCampaign {
  campaignId: string;
  campaignName: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
}

export interface TikTokDailyPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
}

export interface TikTokOverview {
  days: number;
  advertiserId: string;
  summary: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversions: number;
  };
  timeseries: TikTokDailyPoint[];
  campaigns: TikTokCampaign[];
  errors: string[];
}

@Injectable()
export class TikTokAdsService {
  private readonly logger = new Logger(TikTokAdsService.name);

  constructor(private readonly integrationService: IntegrationService) {}

  // ── Status ─────────────────────────────────────────────────────────────────

  async getStatus(tenantId: string): Promise<TikTokStatus> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.TIKTOK_ADS,
    );
    if (!integration || integration.status !== 'connected') {
      return { connected: false, advertiserId: null, availableAdvertiserIds: [] };
    }
    const creds = integration.credentials as TikTokCredentials | null;
    const config = integration.config as TikTokConfig | null;
    return {
      connected: true,
      advertiserId: config?.advertiserId ?? null,
      availableAdvertiserIds: creds?.advertiser_ids ?? [],
    };
  }

  async setAdvertiserId(tenantId: string, advertiserId: string): Promise<void> {
    await this.integrationService.create(tenantId, {
      provider: IntegrationProvider.TIKTOK_ADS,
      config: { advertiserId },
    });
  }

  // ── Token ──────────────────────────────────────────────────────────────────

  private async getAccessToken(tenantId: string): Promise<string> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.TIKTOK_ADS,
    );
    if (!integration || integration.status !== 'connected') {
      throw new Error('TikTok Ads não conectado para este tenant.');
    }
    const creds = integration.credentials as TikTokCredentials | null;
    if (!creds?.access_token) throw new Error('TikTok: access_token não encontrado. Reconecte.');
    return creds.access_token;
  }

  private async getAdvertiserId(tenantId: string): Promise<string> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.TIKTOK_ADS,
    );
    const config = integration?.config as TikTokConfig | null;
    const creds = integration?.credentials as TikTokCredentials | null;
    const id = config?.advertiserId ?? creds?.advertiser_ids?.[0];
    if (!id) throw new Error('Nenhum advertiser_id configurado. Configure nas Integrações.');
    return id;
  }

  // ── Reporting ──────────────────────────────────────────────────────────────

  async getOverview(tenantId: string, days = 30): Promise<TikTokOverview> {
    const token = await this.getAccessToken(tenantId);
    const advertiserId = await this.getAdvertiserId(tenantId);
    const errors: string[] = [];

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const [summary, timeseries, campaigns] = await Promise.all([
      this.fetchSummary(token, advertiserId, fmt(startDate), fmt(endDate), errors),
      this.fetchTimeseries(token, advertiserId, fmt(startDate), fmt(endDate), errors),
      this.fetchCampaigns(token, advertiserId, fmt(startDate), fmt(endDate), errors),
    ]);

    return { days, advertiserId, summary, timeseries, campaigns, errors };
  }

  private async fetchSummary(
    token: string,
    advertiserId: string,
    startDate: string,
    endDate: string,
    errors: string[],
  ) {
    const empty = {
      spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, conversions: 0,
    };
    try {
      const data = await this.reportRequest(token, {
        advertiser_id: advertiserId,
        report_type: 'BASIC',
        data_level: 'AUCTION_ADVERTISER',
        dimensions: ['advertiser_id'],
        metrics: ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'conversion'],
        start_date: startDate,
        end_date: endDate,
        page_size: 1,
      });
      const row = data?.list?.[0]?.metrics;
      if (!row) return empty;
      return {
        spend: parseFloat(row.spend ?? '0'),
        impressions: parseInt(row.impressions ?? '0', 10),
        clicks: parseInt(row.clicks ?? '0', 10),
        ctr: parseFloat(row.ctr ?? '0'),
        cpc: parseFloat(row.cpc ?? '0'),
        cpm: parseFloat(row.cpm ?? '0'),
        conversions: parseInt(row.conversion ?? '0', 10),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`summary: ${msg}`);
      return empty;
    }
  }

  private async fetchTimeseries(
    token: string,
    advertiserId: string,
    startDate: string,
    endDate: string,
    errors: string[],
  ): Promise<TikTokDailyPoint[]> {
    try {
      const data = await this.reportRequest(token, {
        advertiser_id: advertiserId,
        report_type: 'BASIC',
        data_level: 'AUCTION_ADVERTISER',
        dimensions: ['stat_time_day'],
        metrics: ['spend', 'impressions', 'clicks'],
        start_date: startDate,
        end_date: endDate,
        page_size: 90,
        order_field: 'stat_time_day',
        order_type: 'ASC',
      });
      return (data?.list ?? []).map((row: TikTokReportRow) => ({
        date: (row.dimensions?.stat_time_day ?? '').slice(0, 10),
        spend: parseFloat(row.metrics?.spend ?? '0'),
        impressions: parseInt(row.metrics?.impressions ?? '0', 10),
        clicks: parseInt(row.metrics?.clicks ?? '0', 10),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`timeseries: ${msg}`);
      return [];
    }
  }

  private async fetchCampaigns(
    token: string,
    advertiserId: string,
    startDate: string,
    endDate: string,
    errors: string[],
  ): Promise<TikTokCampaign[]> {
    try {
      const data = await this.reportRequest(token, {
        advertiser_id: advertiserId,
        report_type: 'BASIC',
        data_level: 'AUCTION_CAMPAIGN',
        dimensions: ['campaign_id'],
        metrics: [
          'campaign_name', 'campaign_status',
          'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'conversion',
        ],
        start_date: startDate,
        end_date: endDate,
        page_size: 20,
        order_field: 'spend',
        order_type: 'DESC',
      });
      return (data?.list ?? []).map((row: TikTokReportRow) => ({
        campaignId: row.dimensions?.campaign_id ?? '',
        campaignName: row.metrics?.campaign_name ?? '(sem nome)',
        status: row.metrics?.campaign_status ?? '',
        spend: parseFloat(row.metrics?.spend ?? '0'),
        impressions: parseInt(row.metrics?.impressions ?? '0', 10),
        clicks: parseInt(row.metrics?.clicks ?? '0', 10),
        ctr: parseFloat(row.metrics?.ctr ?? '0'),
        cpc: parseFloat(row.metrics?.cpc ?? '0'),
        cpm: parseFloat(row.metrics?.cpm ?? '0'),
        conversions: parseInt(row.metrics?.conversion ?? '0', 10),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`campaigns: ${msg}`);
      return [];
    }
  }

  // ── HTTP helpers ───────────────────────────────────────────────────────────

  private async reportRequest(
    token: string,
    body: Record<string, unknown>,
  ): Promise<TikTokReportData | null> {
    const res = await fetch(`${TIKTOK_API}/report/integrated/get/`, {
      method: 'POST',
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`TikTok API ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as TikTokApiResponse;
    if (json.code !== 0) throw new Error(`TikTok API error ${json.code}: ${json.message}`);
    return (json.data as TikTokReportData) ?? null;
  }
}

// ── Internal types ────────────────────────────────────────────────────────────

interface TikTokApiResponse {
  code: number;
  message: string;
  data?: unknown;
}

interface TikTokReportRow {
  dimensions?: Record<string, string>;
  metrics?: Record<string, string>;
}

interface TikTokReportData {
  list?: TikTokReportRow[];
  page_info?: { total_number: number; page: number; page_size: number; total_page: number };
}
