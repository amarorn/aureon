import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from '../integrations/integration.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const TIMEZONE = 'America/Sao_Paulo';

interface OutlookTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expiry_date?: number;
}

interface GraphEventBody {
  subject: string;
  body?: { contentType: string; content: string };
  location?: { displayName: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
}

@Injectable()
export class OutlookCalendarService {
  private readonly logger = new Logger(OutlookCalendarService.name);

  constructor(private readonly integrationService: IntegrationService) {}

  async isConnected(tenantId: string): Promise<boolean> {
    const d = await this.getDiagnostics(tenantId);
    return d.ready;
  }

  async getDiagnostics(tenantId: string): Promise<{
    ready: boolean;
    hasIntegration: boolean;
    status: string | null;
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    reason: string | null;
  }> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.OUTLOOK,
    );
    if (!integration) {
      return {
        ready: false,
        hasIntegration: false,
        status: null,
        hasAccessToken: false,
        hasRefreshToken: false,
        reason:
          'Nenhuma integração Outlook para este tenant; conecte em /app/integrations',
      };
    }
    const creds = integration.credentials as OutlookTokens | null;
    const hasAccessToken = Boolean(creds?.access_token);
    const hasRefreshToken = Boolean(creds?.refresh_token);
    if (integration.status !== 'connected') {
      return {
        ready: false,
        hasIntegration: true,
        status: integration.status,
        hasAccessToken,
        hasRefreshToken,
        reason: `Integração existe mas status="${integration.status}"; conecte de novo`,
      };
    }
    if (!hasAccessToken && !hasRefreshToken) {
      return {
        ready: false,
        hasIntegration: true,
        status: integration.status,
        hasAccessToken: false,
        hasRefreshToken: false,
        reason:
          'Sem access_token nem refresh_token; desconecte e conecte Outlook de novo',
      };
    }
    if (!hasAccessToken && hasRefreshToken) {
      return {
        ready: true,
        hasIntegration: true,
        status: integration.status,
        hasAccessToken: false,
        hasRefreshToken: true,
        reason: null,
      };
    }
    return {
      ready: true,
      hasIntegration: true,
      status: integration.status,
      hasAccessToken: true,
      hasRefreshToken,
      reason: null,
    };
  }

  private async getValidToken(tenantId: string): Promise<string | null> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.OUTLOOK,
    );
    if (!integration || integration.status !== 'connected') return null;

    const creds = integration.credentials as OutlookTokens | null;
    if (!creds?.access_token && !creds?.refresh_token) return null;

    if (!creds.access_token && creds.refresh_token) {
      try {
        const refreshed =
          await this.integrationService.refreshOutlookAccessToken(
            tenantId,
            creds.refresh_token,
          );
        await this.integrationService.updateCredentials(
          tenantId,
          IntegrationProvider.OUTLOOK,
          {
            ...creds,
            access_token: refreshed.access_token,
            expiry_date:
              Date.now() + (refreshed.expires_in ?? 3600) * 1000,
          },
        );
        return refreshed.access_token;
      } catch (err) {
        this.logger.warn(`getValidToken refresh failed tenantId=${tenantId}: ${err}`);
        return null;
      }
    }
    if (!creds.access_token) return null;

    const now = Date.now();
    const expiryDate =
      creds.expiry_date ?? now + (creds.expires_in ?? 3600) * 1000;
    if (now < expiryDate - 60_000) return creds.access_token;
    if (!creds.refresh_token) return creds.access_token;

    try {
      const refreshed =
        await this.integrationService.refreshOutlookAccessToken(
          tenantId,
          creds.refresh_token,
        );
      await this.integrationService.updateCredentials(
        tenantId,
        IntegrationProvider.OUTLOOK,
        {
          ...creds,
          access_token: refreshed.access_token,
          expiry_date:
            Date.now() + (refreshed.expires_in ?? 3600) * 1000,
        },
      );
      return refreshed.access_token;
    } catch (err) {
      this.logger.warn(`Outlook token refresh failed: ${err}`);
      return creds.access_token;
    }
  }

  async syncEvent(
    tenantId: string,
    appointment: {
      title: string;
      description: string | null;
      startAt: Date;
      endAt: Date;
      location: string | null;
      outlookEventId?: string | null;
    },
    options?: { addTeamsMeeting?: boolean },
  ): Promise<{
    outlookEventId: string | null;
    meetingUrl?: string | null;
    error?: string;
  }> {
    const token = await this.getValidToken(tenantId);
    if (!token) {
      const d = await this.getDiagnostics(tenantId);
      const msg =
        d.reason ||
        'Outlook não conectado; conecte a integração em /app/integrations';
      this.logger.warn(`syncEvent skipped (${appointment.title}): ${msg}`);
      return { outlookEventId: null, error: msg };
    }

    const body: GraphEventBody = {
      subject: appointment.title,
      start: {
        dateTime: appointment.startAt.toISOString(),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: appointment.endAt.toISOString(),
        timeZone: TIMEZONE,
      },
    };
    if (appointment.description) {
      body.body = {
        contentType: 'HTML',
        content: appointment.description.replace(/\n/g, '<br>'),
      };
    }
    if (appointment.location) {
      body.location = { displayName: appointment.location };
    }
    const addTeams =
      Boolean(options?.addTeamsMeeting) && !appointment.outlookEventId;
    if (addTeams) {
      body.isOnlineMeeting = true;
      body.onlineMeetingProvider = 'teamsForBusiness';
    }

    const url = appointment.outlookEventId
      ? `${GRAPH_BASE}/me/events/${appointment.outlookEventId}`
      : `${GRAPH_BASE}/me/calendar/events`;
    const method = appointment.outlookEventId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      this.logger.warn(
        `Outlook Calendar sync failed (${appointment.title}): ${errBody}`,
      );
      return { outlookEventId: null, error: errBody || `HTTP ${res.status}` };
    }

    const data = (await res.json()) as {
      id: string;
      onlineMeetingUrl?: string | null;
      webLink?: string;
    };
    const id = data.id ?? null;
    if (!id) {
      return {
        outlookEventId: null,
        error: 'Microsoft Graph não retornou id do evento',
      };
    }
    const meetingUrl =
      data.onlineMeetingUrl ?? (addTeams ? data.webLink : null) ?? null;
    return { outlookEventId: id, meetingUrl };
  }

  async deleteEvent(tenantId: string, outlookEventId: string): Promise<void> {
    const token = await this.getValidToken(tenantId);
    if (!token) return;

    const res = await fetch(
      `${GRAPH_BASE}/me/events/${outlookEventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok && res.status !== 404) {
      this.logger.warn(
        `Outlook delete event failed (${outlookEventId}): ${await res.text()}`,
      );
    }
  }

  async listEvents(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<OutlookCalendarEvent[]> {
    const token = await this.getValidToken(tenantId);
    if (!token) return [];

    const params = new URLSearchParams({
      startDateTime: new Date(startDate).toISOString(),
      endDateTime: new Date(endDate).toISOString(),
      $top: '250',
    });

    const res = await fetch(
      `${GRAPH_BASE}/me/calendar/calendarView?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
      this.logger.warn(`Outlook listEvents failed: ${await res.text()}`);
      return [];
    }

    const data = (await res.json()) as { value?: OutlookCalendarEvent[] };
    return data.value ?? [];
  }
}

export interface OutlookCalendarEvent {
  id: string;
  subject?: string;
  body?: { content?: string };
  location?: { displayName?: string };
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  webLink?: string;
  isCancelled?: boolean;
}
