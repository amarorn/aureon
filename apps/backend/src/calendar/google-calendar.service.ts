import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from '../integrations/integration.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expiry_date?: number;
  token_type?: string;
}

interface GoogleEventBody {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: { type: string };
    };
  };
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private readonly integrationService: IntegrationService) {}

  async isConnected(tenantId: string): Promise<boolean> {
    const d = await this.getDiagnostics(tenantId);
    return d.ready;
  }

  /**
   * Safe diagnostics (no secrets). Use to debug why sync skips.
   */
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
      IntegrationProvider.GOOGLE_CALENDAR,
    );
    if (!integration) {
      return {
        ready: false,
        hasIntegration: false,
        status: null,
        hasAccessToken: false,
        hasRefreshToken: false,
        reason:
          'Nenhuma integração google_calendar para este tenant; conecte em /app/integrations',
      };
    }
    const creds = integration.credentials as GoogleTokens | null;
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
          'Sem access_token nem refresh_token salvos; desconecte e conecte de novo (revogue em myaccount.google.com/permissions se precisar)',
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
      IntegrationProvider.GOOGLE_CALENDAR,
    );
    if (!integration) {
      this.logger.warn(
        `getValidToken: no integration row for tenantId=${tenantId} provider=google_calendar`,
      );
      return null;
    }
    if (integration.status !== 'connected') {
      this.logger.warn(
        `getValidToken: integration status="${integration.status}" (expected connected) tenantId=${tenantId}`,
      );
      return null;
    }

    const creds = integration.credentials as GoogleTokens | null;
    if (!creds?.access_token && !creds?.refresh_token) {
      this.logger.warn(
        `getValidToken: credentials without access_token and without refresh_token tenantId=${tenantId}`,
      );
      return null;
    }
    if (!creds?.access_token && creds?.refresh_token) {
      try {
        const refreshed = await this.integrationService.refreshGoogleAccessToken(
          tenantId,
          creds.refresh_token,
        );
        await this.integrationService.updateCredentials(
          tenantId,
          IntegrationProvider.GOOGLE_CALENDAR,
          {
            ...creds,
            access_token: refreshed.access_token,
            expiry_date: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
          },
        );
        return refreshed.access_token;
      } catch (err) {
        this.logger.warn(`getValidToken refresh failed tenantId=${tenantId}: ${err}`);
        return null;
      }
    }
    if (!creds?.access_token) return null;

    const now = Date.now();
    const expiryDate =
      creds.expiry_date ?? now + (creds.expires_in ?? 3600) * 1000;

    // Token still valid (with 60s buffer)
    if (now < expiryDate - 60_000) return creds.access_token;

    // Try to refresh
    if (!creds.refresh_token) return creds.access_token;

    try {
      const refreshed = await this.integrationService.refreshGoogleAccessToken(
        tenantId,
        creds.refresh_token,
      );
      await this.integrationService.updateCredentials(
        tenantId,
        IntegrationProvider.GOOGLE_CALENDAR,
        {
          ...creds,
          access_token: refreshed.access_token,
          expiry_date: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
        },
      );
      return refreshed.access_token;
    } catch (err) {
      this.logger.warn(`Token refresh failed: ${err}`);
      return creds.access_token;
    }
  }

  /**
   * Create or update a Google Calendar event.
   * Returns googleEventId on success; error describes why sync was skipped or failed.
   */
  async syncEvent(
    tenantId: string,
    appointment: {
      title: string;
      description: string | null;
      startAt: Date;
      endAt: Date;
      location: string | null;
      googleEventId?: string | null;
    },
    options?: { addGoogleMeet?: boolean },
  ): Promise<{
    googleEventId: string | null;
    meetingUrl?: string | null;
    error?: string;
  }> {
    const token = await this.getValidToken(tenantId);
    if (!token) {
      const d = await this.getDiagnostics(tenantId);
      const msg = d.reason
        ? `Google Calendar: ${d.reason}`
        : 'Google Calendar not connected or token missing; connect integration and ensure refresh_token was stored';
      this.logger.warn(`syncEvent skipped (${appointment.title}): ${msg}`);
      return { googleEventId: null, error: msg };
    }

    const body: GoogleEventBody = {
      summary: appointment.title,
      start: {
        dateTime: appointment.startAt.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: appointment.endAt.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
    };
    if (appointment.description) body.description = appointment.description;
    if (appointment.location) body.location = appointment.location;

    const addMeet = Boolean(options?.addGoogleMeet) && !appointment.googleEventId;
    if (addMeet) {
      body.conferenceData = {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const baseUrl =
      'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const insertParams = addMeet ? '?conferenceDataVersion=1' : '';

    const res = appointment.googleEventId
      ? await fetch(`${baseUrl}/${appointment.googleEventId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })
      : await fetch(baseUrl + insertParams, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

    if (!res.ok) {
      const errBody = await res.text();
      this.logger.warn(
        `Google Calendar sync failed (${appointment.title}): ${errBody}`,
      );
      return { googleEventId: null, error: errBody || `HTTP ${res.status}` };
    }

    const data = (await res.json()) as {
      id: string;
      hangoutLink?: string;
      conferenceData?: {
        entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
      };
    };
    const id = data.id ?? null;
    if (!id) {
      const msg = 'Google Calendar API returned no event id';
      this.logger.warn(msg);
      return { googleEventId: null, error: msg };
    }
    let meetingUrl: string | null =
      data.hangoutLink ??
      data.conferenceData?.entryPoints?.find(
        (e) => e.entryPointType === 'video' || e.uri?.includes('meet.google'),
      )?.uri ??
      null;
    return { googleEventId: id, meetingUrl };
  }

  /** Delete an event from Google Calendar. */
  async deleteEvent(tenantId: string, googleEventId: string): Promise<void> {
    const token = await this.getValidToken(tenantId);
    if (!token) {
      this.logger.warn(
        `deleteEvent skipped (googleEventId=${googleEventId}): no token`,
      );
      return;
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok && res.status !== 404) {
      this.logger.warn(
        `Google Calendar delete failed (${googleEventId}): ${await res.text()}`,
      );
    }
  }

  /** List events from Google Calendar for a date range. */
  async listEvents(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<GoogleCalendarEvent[]> {
    const token = await this.getValidToken(tenantId);
    if (!token) return [];

    const params = new URLSearchParams({
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
      this.logger.warn(`Google Calendar listEvents failed: ${await res.text()}`);
      return [];
    }

    const data = (await res.json()) as { items?: GoogleCalendarEvent[] };
    return data.items ?? [];
  }
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  status?: string;
}
