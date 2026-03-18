import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationService } from '../integrations/integration.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expiry_date?: number;
}

@Injectable()
export class GoogleAnalyticsService {
  private readonly logger = new Logger(GoogleAnalyticsService.name);

  constructor(
    private readonly integrationService: IntegrationService,
    private readonly config: ConfigService,
  ) {}

  async isConnected(tenantId: string): Promise<boolean> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.GOOGLE_ANALYTICS,
    );
    if (!integration || integration.status !== 'connected') return false;
    const creds = integration.credentials as GoogleTokens | null;
    return Boolean(creds?.access_token || creds?.refresh_token);
  }

  private async getValidToken(tenantId: string): Promise<string | null> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.GOOGLE_ANALYTICS,
    );
    if (!integration || integration.status !== 'connected') return null;
    const creds = integration.credentials as GoogleTokens | null;
    if (!creds?.access_token && !creds?.refresh_token) return null;

    if (!creds.access_token && creds.refresh_token) {
      try {
        const refreshed = await this.integrationService.refreshGoogleAccessToken(
          tenantId,
          creds.refresh_token,
        );
        await this.integrationService.updateCredentials(
          tenantId,
          IntegrationProvider.GOOGLE_ANALYTICS,
          {
            ...creds,
            access_token: refreshed.access_token,
            expiry_date: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
          },
        );
        return refreshed.access_token;
      } catch (e) {
        this.logger.warn(`GA token refresh failed: ${e}`);
        return null;
      }
    }
    if (!creds.access_token) return null;

    const now = Date.now();
    const expiry =
      creds.expiry_date ?? now + (creds.expires_in ?? 3600) * 1000;
    if (now < expiry - 60_000) return creds.access_token;
    if (!creds.refresh_token) return creds.access_token;

    try {
      const refreshed = await this.integrationService.refreshGoogleAccessToken(
        tenantId,
        creds.refresh_token,
      );
      await this.integrationService.updateCredentials(
        tenantId,
        IntegrationProvider.GOOGLE_ANALYTICS,
        {
          ...creds,
          access_token: refreshed.access_token,
          expiry_date: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
        },
      );
      return refreshed.access_token;
    } catch (e) {
      this.logger.warn(`GA token refresh failed: ${e}`);
      return creds.access_token;
    }
  }

  /**
   * Lista contas e propriedades GA4 (Admin API).
   */
  async listAccountSummaries(tenantId: string): Promise<unknown> {
    const token = await this.getValidToken(tenantId);
    if (!token) return { error: 'not_connected' };

    const res = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`GA accountSummaries failed: ${text}`);
      return { error: text || `HTTP ${res.status}` };
    }
    return res.json();
  }

  private dateRange(days: number): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - Math.min(90, Math.max(1, days)));
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  private normalizePropertyId(propertyId: string): string {
    return propertyId.startsWith('properties/')
      ? propertyId
      : `properties/${propertyId}`;
  }

  private async runReportRaw(
    token: string,
    propertyId: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
    const pid = this.normalizePropertyId(propertyId);
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/${pid}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`GA runReport failed: ${text}`);
      return { ok: false, error: text || `HTTP ${res.status}` };
    }
    return { ok: true, data: await res.json() };
  }

  /**
   * Relatório simples: sessões e usuários (compatível com frontend antigo).
   */
  async runReport(
    tenantId: string,
    propertyId: string,
    days = 7,
  ): Promise<unknown> {
    const token = await this.getValidToken(tenantId);
    if (!token) return { error: 'not_connected' };
    const result = await this.runReportRaw(token, propertyId, {
      dateRanges: [this.dateRange(days)],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    });
    if (!result.ok) return { error: result.error };
    return result.data;
  }

  /**
   * Resumo agregado do período: várias métricas em uma linha.
   */
  async runReportSummary(
    tenantId: string,
    propertyId: string,
    days: number,
  ): Promise<
    | {
        sessions: number;
        totalUsers: number;
        newUsers: number;
        screenPageViews: number;
        eventCount: number;
        averageSessionDuration: number;
        engagementRate: number;
      }
    | { error: string }
  > {
    const token = await this.getValidToken(tenantId);
    if (!token) return { error: 'not_connected' };
    let result = await this.runReportRaw(token, propertyId, {
      dateRanges: [this.dateRange(days)],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'screenPageViews' },
        { name: 'eventCount' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' },
      ],
    });
    if (!result.ok) {
      result = await this.runReportRaw(token, propertyId, {
        dateRanges: [this.dateRange(days)],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
          { name: 'eventCount' },
        ],
      });
    }
    if (!result.ok) return { error: result.error };
    const data = result.data as {
      rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
    };
    const mv = data.rows?.[0]?.metricValues;
    if (!mv || mv.length < 5) return { error: 'no_rows' };
    const num = (i: number) =>
      parseFloat(mv[i]?.value ?? '0') || 0;
    return {
      sessions: Math.round(num(0)),
      totalUsers: Math.round(num(1)),
      newUsers: Math.round(num(2)),
      screenPageViews: Math.round(num(3)),
      eventCount: Math.round(num(4)),
      averageSessionDuration: mv.length > 5 ? num(5) : 0,
      engagementRate: mv.length > 6 ? num(6) : 0,
    };
  }

  /**
   * Série diária: date + sessions, users, pageViews, events.
   */
  async runReportTimeseries(
    tenantId: string,
    propertyId: string,
    days = 30,
  ): Promise<
    | {
        points: Array<{
          date: string;
          sessions: number;
          users: number;
          screenPageViews: number;
          eventCount: number;
        }>;
      }
    | { error: string }
  > {
    const token = await this.getValidToken(tenantId);
    if (!token) return { error: 'not_connected' };
    const d = Math.min(90, Math.max(1, days));
    const result = await this.runReportRaw(token, propertyId, {
      dateRanges: [this.dateRange(d)],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'eventCount' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });
    if (!result.ok) return { error: result.error };
    const data = result.data as {
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    };
    const points =
      data.rows?.map((row) => ({
        date: row.dimensionValues?.[0]?.value ?? '',
        sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10) || 0,
        users: parseInt(row.metricValues?.[1]?.value ?? '0', 10) || 0,
        screenPageViews:
          parseInt(row.metricValues?.[2]?.value ?? '0', 10) || 0,
        eventCount: parseInt(row.metricValues?.[3]?.value ?? '0', 10) || 0,
      })) ?? [];
    return { points };
  }

  /**
   * Tráfego por canal (agrupamento padrão de sessão).
   */
  async runReportByChannel(
    tenantId: string,
    propertyId: string,
    days: number,
  ): Promise<
    | { rows: Array<{ channel: string; sessions: number; users: number }> }
    | { error: string }
  > {
    const token = await this.getValidToken(tenantId);
    if (!token) return { error: 'not_connected' };
    const result = await this.runReportRaw(token, propertyId, {
      dateRanges: [this.dateRange(days)],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 15,
    });
    if (!result.ok) return { error: result.error };
    const data = result.data as {
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    };
    const rows =
      data.rows?.map((row) => ({
        channel: row.dimensionValues?.[0]?.value ?? '(not set)',
        sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10) || 0,
        users: parseInt(row.metricValues?.[1]?.value ?? '0', 10) || 0,
      })) ?? [];
    return { rows };
  }

  /**
   * Páginas com mais visualizações (pagePath).
   */
  async runReportTopPages(
    tenantId: string,
    propertyId: string,
    days: number,
    limit = 12,
  ): Promise<
    | { rows: Array<{ pagePath: string; views: number; sessions: number }> }
    | { error: string }
  > {
    const token = await this.getValidToken(tenantId);
    if (!token) return { error: 'not_connected' };
    const result = await this.runReportRaw(token, propertyId, {
      dateRanges: [this.dateRange(days)],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit,
    });
    if (!result.ok) return { error: result.error };
    const data = result.data as {
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    };
    const rows =
      data.rows?.map((row) => ({
        pagePath: row.dimensionValues?.[0]?.value ?? '',
        views: parseInt(row.metricValues?.[0]?.value ?? '0', 10) || 0,
        sessions: parseInt(row.metricValues?.[1]?.value ?? '0', 10) || 0,
      })) ?? [];
    return { rows };
  }

  /**
   * Sessões por país.
   */
  async runReportByCountry(
    tenantId: string,
    propertyId: string,
    days: number,
    limit = 12,
  ): Promise<
    | { rows: Array<{ country: string; sessions: number }> }
    | { error: string }
  > {
    const token = await this.getValidToken(tenantId);
    if (!token) return { error: 'not_connected' };
    const result = await this.runReportRaw(token, propertyId, {
      dateRanges: [this.dateRange(days)],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit,
    });
    if (!result.ok) return { error: result.error };
    const data = result.data as {
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    };
    const rows =
      data.rows?.map((row) => ({
        country: row.dimensionValues?.[0]?.value ?? '',
        sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10) || 0,
      })) ?? [];
    return { rows };
  }

  /**
   * Sessões por país com limite alto para mapa (coroplético/scatter).
   */
  async runReportByCountryMap(
    tenantId: string,
    propertyId: string,
    days: number,
    limit = 200,
  ): Promise<
    | { rows: Array<{ country: string; sessions: number }> }
    | { error: string }
  > {
    return this.runReportByCountry(tenantId, propertyId, days, limit);
  }

  /**
   * Estado/região + país (dimensão region no GA4 = state/province).
   */
  async runReportByRegion(
    tenantId: string,
    propertyId: string,
    days: number,
    limit = 40,
  ): Promise<
    | {
        rows: Array<{
          region: string;
          country: string;
          sessions: number;
        }>;
      }
    | { error: string }
  > {
    const token = await this.getValidToken(tenantId);
    if (!token) return { error: 'not_connected' };
    const result = await this.runReportRaw(token, propertyId, {
      dateRanges: [this.dateRange(days)],
      dimensions: [{ name: 'region' }, { name: 'country' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit,
    });
    if (!result.ok) return { error: result.error };
    const data = result.data as {
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    };
    const rows =
      data.rows?.map((row) => ({
        region: row.dimensionValues?.[0]?.value ?? '',
        country: row.dimensionValues?.[1]?.value ?? '',
        sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10) || 0,
      })) ?? [];
    return { rows };
  }

  /**
   * Cidade + região (estado) + país.
   */
  async runReportByCity(
    tenantId: string,
    propertyId: string,
    days: number,
    limit = 40,
  ): Promise<
    | {
        rows: Array<{
          city: string;
          region: string;
          country: string;
          sessions: number;
        }>;
      }
    | { error: string }
  > {
    const token = await this.getValidToken(tenantId);
    if (!token) return { error: 'not_connected' };
    let result = await this.runReportRaw(token, propertyId, {
      dateRanges: [this.dateRange(days)],
      dimensions: [
        { name: 'city' },
        { name: 'region' },
        { name: 'country' },
      ],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit,
    });
    if (!result.ok) {
      result = await this.runReportRaw(token, propertyId, {
        dateRanges: [this.dateRange(days)],
        dimensions: [{ name: 'city' }, { name: 'country' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit,
      });
      if (!result.ok) return { error: result.error };
      const data2 = result.data as {
        rows?: Array<{
          dimensionValues?: Array<{ value?: string }>;
          metricValues?: Array<{ value?: string }>;
        }>;
      };
      const rows2 =
        data2.rows?.map((row) => ({
          city: row.dimensionValues?.[0]?.value ?? '',
          region: '',
          country: row.dimensionValues?.[1]?.value ?? '',
          sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10) || 0,
        })) ?? [];
      return { rows: rows2 };
    }
    const data = result.data as {
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    };
    const rows =
      data.rows?.map((row) => ({
        city: row.dimensionValues?.[0]?.value ?? '',
        region: row.dimensionValues?.[1]?.value ?? '',
        country: row.dimensionValues?.[2]?.value ?? '',
        sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10) || 0,
      })) ?? [];
    return { rows };
  }

  /**
   * Agrega overview em paralelo para uma única chamada do frontend.
   */
  async getOverview(
    tenantId: string,
    propertyId: string,
    days: number,
  ): Promise<{
    days: number;
    summary?: Awaited<ReturnType<GoogleAnalyticsService['runReportSummary']>>;
    timeseries?: Awaited<ReturnType<GoogleAnalyticsService['runReportTimeseries']>>;
    channels?: Awaited<ReturnType<GoogleAnalyticsService['runReportByChannel']>>;
    topPages?: Awaited<ReturnType<GoogleAnalyticsService['runReportTopPages']>>;
    countries?: Awaited<ReturnType<GoogleAnalyticsService['runReportByCountry']>>;
    geoMap?: Awaited<ReturnType<GoogleAnalyticsService['runReportByCountryMap']>>;
    regions?: Awaited<ReturnType<GoogleAnalyticsService['runReportByRegion']>>;
    cities?: Awaited<ReturnType<GoogleAnalyticsService['runReportByCity']>>;
    errors?: string[];
  }> {
    const d = Math.min(90, Math.max(1, days));
    const errors: string[] = [];
    const [
      summary,
      timeseries,
      channels,
      topPages,
      countries,
      geoMap,
      regions,
      cities,
    ] = await Promise.all([
      this.runReportSummary(tenantId, propertyId, d),
      this.runReportTimeseries(tenantId, propertyId, d),
      this.runReportByChannel(tenantId, propertyId, d),
      this.runReportTopPages(tenantId, propertyId, d),
      this.runReportByCountry(tenantId, propertyId, d),
      this.runReportByCountryMap(tenantId, propertyId, d, 200),
      this.runReportByRegion(tenantId, propertyId, d, 40),
      this.runReportByCity(tenantId, propertyId, d, 40),
    ]);
    if ('error' in summary) errors.push(`summary: ${summary.error}`);
    if ('error' in timeseries) errors.push(`timeseries: ${timeseries.error}`);
    if ('error' in channels) errors.push(`channels: ${channels.error}`);
    if ('error' in topPages) errors.push(`topPages: ${topPages.error}`);
    if ('error' in countries) errors.push(`countries: ${countries.error}`);
    if ('error' in geoMap) errors.push(`geoMap: ${geoMap.error}`);
    if ('error' in regions) errors.push(`regions: ${regions.error}`);
    if ('error' in cities) errors.push(`cities: ${cities.error}`);
    return {
      days: d,
      ...('error' in summary ? {} : { summary }),
      ...('error' in timeseries ? {} : { timeseries }),
      ...('error' in channels ? {} : { channels }),
      ...('error' in topPages ? {} : { topPages }),
      ...('error' in countries ? {} : { countries }),
      ...('error' in geoMap ? {} : { geoMap }),
      ...('error' in regions ? {} : { regions }),
      ...('error' in cities ? {} : { cities }),
      ...(errors.length ? { errors } : {}),
    };
  }

  async getConfig(tenantId: string): Promise<{ propertyId: string | null }> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.GOOGLE_ANALYTICS,
    );
    const config = integration?.config as { propertyId?: string } | null;
    return { propertyId: config?.propertyId ?? null };
  }

  async setPropertyId(tenantId: string, propertyId: string): Promise<void> {
    await this.integrationService.create(tenantId, {
      provider: IntegrationProvider.GOOGLE_ANALYTICS,
      config: {
        propertyId: propertyId.startsWith('properties/')
          ? propertyId
          : `properties/${propertyId}`,
      },
    });
  }
}
