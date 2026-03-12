import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { ContactService } from '../crm/contact.service';
import { IntegrationProvider } from './entities/integration.entity';

interface LinkedInTokens {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expiry_date?: number;
}

const LINKEDIN_REST_VERSION = '202411';

type LeadTypeParam = 'SPONSORED' | 'ORGANIZATION_PRODUCT' | 'COMPANY' | 'EVENT';

export interface LeadFormResponseElement {
  id?: string;
  submittedAt?: number;
  formResponse?: {
    answers?: Array<{
      questionId?: number;
      answerDetails?: {
        textQuestionAnswer?: { answer?: string };
        emailQuestionAnswer?: { answer?: string };
        phoneNumberQuestionAnswer?: { answer?: string };
      };
    }>;
  };
}

@Injectable()
export class LinkedInService {
  private readonly logger = new Logger(LinkedInService.name);

  constructor(
    private readonly integrationService: IntegrationService,
    private readonly contactService: ContactService,
  ) {}

  async isConnected(tenantId: string): Promise<boolean> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.LINKEDIN,
    );
    if (!integration || integration.status !== 'connected') return false;
    const creds = integration.credentials as LinkedInTokens | null;
    return Boolean(creds?.access_token);
  }

  private async getValidToken(tenantId: string): Promise<string | null> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.LINKEDIN,
    );
    if (!integration?.credentials) return null;
    const creds = integration.credentials as LinkedInTokens;
    if (!creds.access_token) return null;
    const expiry = creds.expiry_date ?? 0;
    if (Date.now() < expiry - 60_000) return creds.access_token;
    return creds.access_token;
  }

  private restHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': LINKEDIN_REST_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    };
  }

  async fetchUserInfo(tenantId: string): Promise<Record<string, unknown> | null> {
    const token = await this.getValidToken(tenantId);
    if (!token) return null;
    const res = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      this.logger.warn(`LinkedIn userinfo failed: ${await res.text()}`);
      return null;
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  /**
   * Salva URN do owner (sponsoredAccount ou organization) e leadType para Lead Sync.
   */
  async saveLeadGenConfig(
    tenantId: string,
    config: {
      ownerUrn: string;
      leadType?: LeadTypeParam;
      versionedLeadGenFormUrn?: string;
    },
  ): Promise<void> {
    await this.integrationService.create(tenantId, {
      provider: IntegrationProvider.LINKEDIN,
      config: {
        leadGenOwnerUrn: config.ownerUrn,
        leadGenLeadType: config.leadType ?? 'SPONSORED',
        versionedLeadGenFormUrn: config.versionedLeadGenFormUrn,
      },
    });
  }

  async getLeadGenConfig(tenantId: string): Promise<{
    ownerUrn: string | null;
    leadType: LeadTypeParam;
    versionedLeadGenFormUrn: string | null;
  }> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.LINKEDIN,
    );
    const c = integration?.config as Record<string, string> | null;
    return {
      ownerUrn: c?.leadGenOwnerUrn ?? null,
      leadType: (c?.leadGenLeadType as LeadTypeParam) ?? 'SPONSORED',
      versionedLeadGenFormUrn: c?.versionedLeadGenFormUrn ?? null,
    };
  }

  /**
   * Lista respostas de Lead Gen Form (Lead Sync API).
   * ownerUrn exemplo: urn:li:sponsoredAccount:522529623 ou urn:li:organization:5509810
   */
  async listLeadFormResponses(
    tenantId: string,
    params: {
      ownerUrn: string;
      leadType: LeadTypeParam;
      versionedLeadGenFormUrn?: string;
      count?: number;
      start?: number;
      limitedToTestLeads?: boolean;
    },
  ): Promise<{ elements: LeadFormResponseElement[]; error?: string }> {
    const token = await this.getValidToken(tenantId);
    if (!token) return { elements: [], error: 'not_connected' };

    const urnEncoded = encodeURIComponent(params.ownerUrn);
    const ownerKey = params.ownerUrn.includes('sponsoredAccount')
      ? 'sponsoredAccount'
      : 'organization';
    const parts = [
      `q=owner`,
      `owner=(${ownerKey}:${urnEncoded})`,
      `leadType=(leadType:${params.leadType})`,
      `limitedToTestLeads=${params.limitedToTestLeads ?? false}`,
    ];
    if (params.versionedLeadGenFormUrn) {
      parts.push(
        `versionedLeadGenFormUrn=${encodeURIComponent(params.versionedLeadGenFormUrn)}`,
      );
    }
    if (params.count != null) parts.push(`count=${params.count}`);
    if (params.start != null) parts.push(`start=${params.start}`);

    const url = `https://api.linkedin.com/rest/leadFormResponses?${parts.join('&')}`;
    const res = await fetch(url, { headers: this.restHeaders(token) });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`listLeadFormResponses failed: ${text}`);
      return { elements: [], error: text || `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { elements?: LeadFormResponseElement[] };
    return { elements: data.elements ?? [] };
  }

  /**
   * Extrai texto de cada answer; identifica e-mail por regex; primeiro texto longo como nome fallback.
   */
  extractFromAnswers(
    answers: Array<{
      answerDetails?: {
        textQuestionAnswer?: { answer?: string };
        emailQuestionAnswer?: { answer?: string };
        phoneNumberQuestionAnswer?: { answer?: string };
      };
    }>,
  ): {
    email: string | null;
    phone: string | null;
    name: string | null;
    rawTexts: string[];
  } {
    const rawTexts: string[] = [];
    let email: string | null = null;
    let phone: string | null = null;
    if (!answers?.length) return { email, phone, name: null, rawTexts };

    for (const a of answers) {
      const d = a.answerDetails;
      const text =
        d?.textQuestionAnswer?.answer ??
        d?.emailQuestionAnswer?.answer ??
        d?.phoneNumberQuestionAnswer?.answer;
      if (typeof text === 'string' && text.trim()) {
        rawTexts.push(text.trim());
        if (!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())) {
          email = text.trim();
        }
        if (!phone && /^[\d\s+()-]{8,}$/.test(text.trim())) {
          phone = text.trim();
        }
      }
    }
    const name =
      rawTexts.find((t) => !t.includes('@') && t.length > 2 && t.length < 80) ??
      null;
    return { email, phone, name, rawTexts };
  }

  async syncLeadsToContacts(tenantId: string): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
    contacts?: { id: string; name: string }[];
  }> {
    const errors: string[] = [];
    const contacts: { id: string; name: string }[] = [];
    let imported = 0;
    let skipped = 0;

    const userinfo = await this.fetchUserInfo(tenantId);
    if (!userinfo) {
      errors.push('Token inválido ou userinfo indisponível (escopos openid profile email).');
      return { imported, skipped, errors };
    }

    const email = typeof userinfo.email === 'string' ? userinfo.email : null;
    const name =
      typeof userinfo.name === 'string'
        ? userinfo.name
        : [userinfo.given_name, userinfo.family_name]
            .filter(Boolean)
            .join(' ') || 'LinkedIn';

    if (!email) {
      errors.push('Email não retornado — inclua escopo email no app LinkedIn.');
      return { imported, skipped, errors };
    }

    const all = await this.contactService.findAll(tenantId);
    const exists = all.some(
      (c) => c.email?.toLowerCase() === email.toLowerCase(),
    );
    if (exists) {
      skipped = 1;
      return { imported, skipped, errors, contacts };
    }

    const contact = await this.contactService.create(tenantId, {
      name,
      email,
      source: 'LinkedIn',
      notes: 'Importado via OAuth LinkedIn (userinfo).',
    });
    imported = 1;
    contacts.push({ id: contact.id, name: contact.name });
    return { imported, skipped, errors, contacts };
  }

  /**
   * Importa leads das respostas do formulário em lote → Contact (dedupe por e-mail).
   */
  async syncLeadGenBatch(
    tenantId: string,
    options?: {
      ownerUrn?: string;
      leadType?: LeadTypeParam;
      versionedLeadGenFormUrn?: string;
      maxResponses?: number;
    },
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

    const cfg = await this.getLeadGenConfig(tenantId);
    const ownerUrn = options?.ownerUrn ?? cfg.ownerUrn;
    if (!ownerUrn) {
      errors.push(
        'Configure leadGenOwnerUrn via PUT .../linkedin/leadgen-config (ex.: urn:li:sponsoredAccount:ID).',
      );
      return { imported, skipped, errors, contacts, fetched: 0 };
    }

    const leadType = options?.leadType ?? cfg.leadType;
    const formUrn = options?.versionedLeadGenFormUrn ?? cfg.versionedLeadGenFormUrn;
    const max = Math.min(100, Math.max(1, options?.maxResponses ?? 50));

    const { elements, error } = await this.listLeadFormResponses(tenantId, {
      ownerUrn,
      leadType,
      ...(formUrn ? { versionedLeadGenFormUrn: formUrn } : {}),
      count: max,
      start: 0,
    });

    if (error) {
      errors.push(error);
      return { imported, skipped, errors, contacts, fetched: 0 };
    }

    const existing = await this.contactService.findAll(tenantId);
    const existingEmails = new Set(
      existing.map((c) => c.email?.toLowerCase()).filter(Boolean) as string[],
    );

    for (const el of elements) {
      const answers = el.formResponse?.answers;
      const extracted = this.extractFromAnswers(answers ?? []);
      if (!extracted.email) {
        skipped++;
        continue;
      }
      const lower = extracted.email.toLowerCase();
      if (existingEmails.has(lower)) {
        skipped++;
        continue;
      }

      const displayName =
        extracted.name ?? extracted.email.split('@')[0] ?? 'Lead LinkedIn';
      try {
        const contact = await this.contactService.create(tenantId, {
          name: displayName,
          email: extracted.email,
          phone: extracted.phone ?? undefined,
          source: 'LinkedIn Lead Gen',
          notes: `Importado Lead Sync. responseId=${el.id ?? 'n/a'} submittedAt=${el.submittedAt ?? 'n/a'}`,
        });
        existingEmails.add(lower);
        imported++;
        contacts.push({
          id: contact.id,
          name: contact.name,
          email: contact.email ?? undefined,
        });
      } catch (e) {
        errors.push(`${extracted.email}: ${e}`);
      }
    }

    return {
      imported,
      skipped,
      errors,
      contacts,
      fetched: elements.length,
    };
  }
}
