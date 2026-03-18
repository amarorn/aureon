import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { ContactService } from '../crm/contact.service';
import { IntegrationProvider } from './entities/integration.entity';

interface RdStationTokens {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expiry_date?: number;
}

export interface RdSegmentation {
  id: string;
  name: string;
}

@Injectable()
export class RdStationService {
  private readonly logger = new Logger(RdStationService.name);
  private readonly baseUrl = 'https://api.rd.services';

  constructor(
    private readonly integrationService: IntegrationService,
    private readonly contactService: ContactService,
  ) {}

  async isConnected(tenantId: string): Promise<boolean> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.RD_STATION,
    );
    if (!integration || integration.status !== 'connected') return false;
    const creds = integration.credentials as RdStationTokens | null;
    return Boolean(creds?.access_token);
  }

  private async getIntegration(tenantId: string) {
    return this.integrationService.findByProvider(tenantId, IntegrationProvider.RD_STATION);
  }

  private async getValidToken(tenantId: string): Promise<string | null> {
    const integration = await this.getIntegration(tenantId);
    if (!integration?.credentials) return null;
    const creds = integration.credentials as RdStationTokens;
    if (!creds.access_token) return null;

    if ((creds.expiry_date ?? 0) > Date.now() + 60_000) {
      return creds.access_token;
    }

    if (!creds.refresh_token) return creds.access_token;

    try {
      const refreshed = await this.integrationService.refreshRdStationAccessToken(
        tenantId,
        creds.refresh_token,
      );
      const nextCreds: RdStationTokens = {
        ...creds,
        ...refreshed,
        expiry_date:
          Date.now() + ((refreshed.expires_in as number | undefined) ?? 86400) * 1000,
      };
      await this.integrationService.updateCredentials(
        tenantId,
        IntegrationProvider.RD_STATION,
        nextCreds as Record<string, unknown>,
      );
      return nextCreds.access_token ?? creds.access_token;
    } catch (error) {
      this.logger.warn(
        `RD Station token refresh failed tenant=${tenantId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return creds.access_token;
    }
  }

  async listSegmentations(
    tenantId: string,
    page?: number,
    limit?: number,
  ): Promise<{ items: RdSegmentation[]; raw?: unknown; error?: string }> {
    const token = await this.getValidToken(tenantId);
    if (!token) return { items: [], error: 'not_connected' };

    const params = new URLSearchParams();
    if (page != null) params.set('page', String(page));
    if (limit != null) params.set('limit', String(limit));
    const url = `${this.baseUrl}/platform/segmentations${params.size ? `?${params}` : ''}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`RD Station segmentations failed: ${text}`);
      return { items: [], error: text || `HTTP ${res.status}` };
    }

    const data = (await res.json()) as Record<string, unknown>;
    const candidates = [
      data.segmentations,
      data.items,
      data.data,
      Array.isArray(data) ? data : null,
    ];
    const rawItems = candidates.find(Array.isArray) as Array<Record<string, unknown>> | undefined;

    const items =
      rawItems?.map((item) => ({
        id: String(item.id ?? item.uuid ?? ''),
        name: String(item.name ?? item.title ?? 'Segmentacao'),
      })).filter((item) => item.id) ?? [];

    return { items, raw: data };
  }

  async listSegmentationContacts(
    tenantId: string,
    segmentationId: string,
    page?: number,
    limit?: number,
  ): Promise<{ items: Record<string, unknown>[]; raw?: unknown; error?: string }> {
    const token = await this.getValidToken(tenantId);
    if (!token) return { items: [], error: 'not_connected' };

    const params = new URLSearchParams();
    if (page != null) params.set('page', String(page));
    if (limit != null) params.set('limit', String(limit));
    const url = `${this.baseUrl}/platform/segmentations/${encodeURIComponent(
      segmentationId,
    )}/contacts${params.size ? `?${params}` : ''}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`RD Station segmentation contacts failed: ${text}`);
      return { items: [], error: text || `HTTP ${res.status}` };
    }

    const data = (await res.json()) as Record<string, unknown>;
    const candidates = [
      data.contacts,
      data.items,
      data.data,
      Array.isArray(data) ? data : null,
    ];
    const items = (candidates.find(Array.isArray) as Record<string, unknown>[] | undefined) ?? [];
    return { items, raw: data };
  }

  async syncSegmentationToContacts(
    tenantId: string,
    segmentationId: string,
    limit?: number,
    page?: number,
  ): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
    contacts: { id: string; name: string; email?: string }[];
    fetched: number;
  }> {
    const errors: string[] = [];
    const contacts: { id: string; name: string; email?: string }[] = [];
    let imported = 0;
    let skipped = 0;

    const { items, error } = await this.listSegmentationContacts(
      tenantId,
      segmentationId,
      page,
      limit,
    );
    if (error) {
      errors.push(error);
      return { imported, skipped, errors, contacts, fetched: 0 };
    }

    const existing = await this.contactService.findAll(tenantId);
    const existingEmails = new Set(
      existing.map((c) => c.email?.toLowerCase()).filter(Boolean) as string[],
    );

    for (const item of items) {
      const mapped = this.extractContact(item);
      if (!mapped.email) {
        skipped += 1;
        continue;
      }
      if (existingEmails.has(mapped.email.toLowerCase())) {
        skipped += 1;
        continue;
      }

      try {
        const contact = await this.contactService.create(tenantId, {
          name: mapped.name,
          email: mapped.email,
          phone: mapped.phone || undefined,
          source: 'RD Station',
          notes: mapped.notes,
        });
        existingEmails.add(mapped.email.toLowerCase());
        imported += 1;
        contacts.push({ id: contact.id, name: contact.name, email: contact.email || undefined });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'import_failed');
      }
    }

    return { imported, skipped, errors, contacts, fetched: items.length };
  }

  private extractContact(item: Record<string, unknown>): {
    name: string;
    email: string | null;
    phone: string | null;
    notes: string;
  } {
    const emails =
      (Array.isArray(item.emails) ? item.emails : [])
        .map((entry) => {
          if (typeof entry === 'string') return entry;
          if (entry && typeof entry === 'object' && 'email' in entry) {
            return typeof entry.email === 'string' ? entry.email : '';
          }
          return '';
        })
        .filter(Boolean) as string[];

    const email = (
      (typeof item.email === 'string' && item.email) ||
      emails[0] ||
      (typeof item.personal_email === 'string' && item.personal_email) ||
      null
    )?.trim() || null;

    const phone =
      (typeof item.personal_phone === 'string' && item.personal_phone) ||
      (typeof item.mobile_phone === 'string' && item.mobile_phone) ||
      (typeof item.phone === 'string' && item.phone) ||
      null;

    const name =
      (typeof item.name === 'string' && item.name.trim()) ||
      (typeof item.first_name === 'string' && item.first_name.trim()) ||
      email ||
      'Lead RD Station';

    const id =
      (typeof item.uuid === 'string' && item.uuid) ||
      (typeof item.id === 'string' && item.id) ||
      '';

    return {
      name,
      email,
      phone: phone?.trim() || null,
      notes: id ? `Importado do RD Station. lead_id=${id}` : 'Importado do RD Station.',
    };
  }
}
