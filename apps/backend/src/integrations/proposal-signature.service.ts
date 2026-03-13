import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationProvider } from './entities/integration.entity';
import { IntegrationService } from './integration.service';

type SignatureProvider =
  | IntegrationProvider.CLICKSIGN
  | IntegrationProvider.DOCUSIGN;

export type ProposalSignatureStatus =
  | 'not_sent'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined'
  | 'canceled'
  | 'failed';

interface ClickSignConfig {
  accessToken: string;
  baseUrl?: string | null;
}

interface DocuSignConfig {
  accessToken: string;
  accountId: string;
  basePath: string;
  returnUrl?: string | null;
}

export interface SignatureProposalInput {
  proposalId: string;
  title: string;
  notes?: string | null;
  total: number;
  validUntil?: Date | null;
  signerName: string;
  signerEmail: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export interface SignatureDispatchResult {
  provider: SignatureProvider;
  requestId: string;
  signatureUrl: string | null;
  status: ProposalSignatureStatus;
  payload?: Record<string, unknown> | null;
}

export interface SignatureStatusResult {
  provider: SignatureProvider;
  requestId: string;
  status: ProposalSignatureStatus;
  signatureUrl: string | null;
  payload?: Record<string, unknown> | null;
}

@Injectable()
export class ProposalSignatureService {
  private readonly logger = new Logger(ProposalSignatureService.name);

  constructor(
    private readonly integrationService: IntegrationService,
    private readonly config: ConfigService,
  ) {}

  async isConnected(
    tenantId: string,
    provider: SignatureProvider,
  ): Promise<boolean> {
    const cfg = await this.getProviderConfig(tenantId, provider);
    return !!cfg;
  }

  async saveClickSignConfig(
    tenantId: string,
    input: ClickSignConfig,
  ): Promise<void> {
    const accessToken = input.accessToken?.trim();
    if (!accessToken) {
      throw new BadRequestException('accessToken é obrigatório para ClickSign');
    }

    await this.upsertProvider(tenantId, IntegrationProvider.CLICKSIGN, {
      accessToken,
      baseUrl: this.normalizeClickSignBaseUrl(input.baseUrl) || null,
    });
  }

  async saveDocuSignConfig(
    tenantId: string,
    input: DocuSignConfig,
  ): Promise<void> {
    const accessToken = input.accessToken?.trim();
    const accountId = input.accountId?.trim();
    const basePath = input.basePath?.trim();
    if (!accessToken || !accountId || !basePath) {
      throw new BadRequestException(
        'accessToken, accountId e basePath são obrigatórios para DocuSign',
      );
    }

    await this.upsertProvider(tenantId, IntegrationProvider.DOCUSIGN, {
      accessToken,
      accountId,
      basePath: this.normalizeDocuSignBasePath(basePath),
      returnUrl: input.returnUrl?.trim() || null,
    });
  }

  async sendProposalForSignature(
    tenantId: string,
    proposal: SignatureProposalInput,
    provider?: SignatureProvider,
  ): Promise<SignatureDispatchResult> {
    const resolvedProvider = await this.resolveProvider(tenantId, provider);
    if (!resolvedProvider) {
      throw new BadRequestException(
        'Nenhum provedor de assinatura configurado. Configure ClickSign ou DocuSign em Integrações.',
      );
    }

    if (resolvedProvider === IntegrationProvider.CLICKSIGN) {
      return this.sendWithClickSign(tenantId, proposal);
    }

    return this.sendWithDocuSign(tenantId, proposal);
  }

  async refreshSignatureStatus(
    tenantId: string,
    provider: SignatureProvider,
    requestId: string,
    signatureUrl?: string | null,
  ): Promise<SignatureStatusResult> {
    if (provider === IntegrationProvider.CLICKSIGN) {
      return this.refreshClickSignStatus(tenantId, requestId, signatureUrl);
    }

    return this.refreshDocuSignStatus(tenantId, requestId, signatureUrl);
  }

  private async resolveProvider(
    tenantId: string,
    preferred?: SignatureProvider,
  ): Promise<SignatureProvider | null> {
    if (preferred && (await this.isConnected(tenantId, preferred))) {
      return preferred;
    }

    const envPreferred = this.config
      .get<string>('SIGNATURE_PROVIDER', '')
      .trim()
      .toLowerCase();

    const providers: SignatureProvider[] =
      envPreferred === IntegrationProvider.DOCUSIGN
        ? [IntegrationProvider.DOCUSIGN, IntegrationProvider.CLICKSIGN]
        : [IntegrationProvider.CLICKSIGN, IntegrationProvider.DOCUSIGN];

    for (const provider of providers) {
      if (await this.isConnected(tenantId, provider)) {
        return provider;
      }
    }

    return null;
  }

  private async upsertProvider(
    tenantId: string,
    provider: SignatureProvider,
    config: Record<string, string | null>,
  ): Promise<void> {
    const existing = await this.integrationService.findByProvider(tenantId, provider);
    if (existing) {
      await this.integrationService.updateConfig(tenantId, provider, config);
      await this.integrationService.setStatus(tenantId, existing.id, 'connected');
      return;
    }

    await this.integrationService.create(tenantId, { provider, config });
    const created = await this.integrationService.findByProvider(tenantId, provider);
    if (created) {
      await this.integrationService.setStatus(tenantId, created.id, 'connected');
    }
  }

  private async getProviderConfig(
    tenantId: string,
    provider: SignatureProvider,
  ): Promise<ClickSignConfig | DocuSignConfig | null> {
    const integration = await this.integrationService.findByProvider(tenantId, provider);
    if (integration?.status === 'connected' && integration.config) {
      return integration.config as unknown as ClickSignConfig | DocuSignConfig;
    }

    if (provider === IntegrationProvider.CLICKSIGN) {
      const accessToken = this.config
        .get<string>('INTEGRATION_CLICKSIGN_ACCESS_TOKEN', '')
        .trim();
      if (!accessToken) return null;
      return {
        accessToken,
        baseUrl: this.normalizeClickSignBaseUrl(
          this.config.get<string>('INTEGRATION_CLICKSIGN_BASE_URL', ''),
        ),
      };
    }

    const accessToken = this.config
      .get<string>('INTEGRATION_DOCUSIGN_ACCESS_TOKEN', '')
      .trim();
    const accountId = this.config
      .get<string>('INTEGRATION_DOCUSIGN_ACCOUNT_ID', '')
      .trim();
    const basePath = this.config
      .get<string>('INTEGRATION_DOCUSIGN_BASE_PATH', '')
      .trim();
    if (!accessToken || !accountId || !basePath) return null;
    return {
      accessToken,
      accountId,
      basePath: this.normalizeDocuSignBasePath(basePath),
      returnUrl:
        this.config.get<string>('INTEGRATION_DOCUSIGN_RETURN_URL', '').trim() || null,
    };
  }

  private normalizeClickSignBaseUrl(baseUrl?: string | null): string {
    const value = baseUrl?.trim();
    return value || 'https://sandbox.clicksign.com';
  }

  private normalizeDocuSignBasePath(basePath: string): string {
    const trimmed = basePath.trim().replace(/\/+$/, '');
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private buildProposalPlainText(proposal: SignatureProposalInput): string {
    const lines = [
      `Proposta: ${proposal.title}`,
      `Cliente: ${proposal.signerName}`,
      `Email: ${proposal.signerEmail}`,
      proposal.validUntil
        ? `Validade: ${proposal.validUntil.toISOString().slice(0, 10)}`
        : null,
      '',
      'Itens:',
      ...proposal.items.map(
        (item, index) =>
          `${index + 1}. ${item.description} | ${item.quantity} x ${this.formatCurrency(
            item.unitPrice,
          )} = ${this.formatCurrency(item.total)}`,
      ),
      '',
      `Total: ${this.formatCurrency(proposal.total)}`,
      proposal.notes ? '' : null,
      proposal.notes ? `Observações:\n${proposal.notes}` : null,
    ];

    return lines.filter((line): line is string => Boolean(line)).join('\n');
  }

  private buildProposalHtml(proposal: SignatureProposalInput): string {
    const itemsHtml = proposal.items
      .map(
        (item) => `
          <tr>
            <td style="padding:8px;border:1px solid #d7d7d7;">${this.escapeHtml(
              item.description,
            )}</td>
            <td style="padding:8px;border:1px solid #d7d7d7;text-align:center;">${
              item.quantity
            }</td>
            <td style="padding:8px;border:1px solid #d7d7d7;text-align:right;">${this.escapeHtml(
              this.formatCurrency(item.unitPrice),
            )}</td>
            <td style="padding:8px;border:1px solid #d7d7d7;text-align:right;">${this.escapeHtml(
              this.formatCurrency(item.total),
            )}</td>
          </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="font-family:Arial,sans-serif;color:#111827;">
    <h1>${this.escapeHtml(proposal.title)}</h1>
    <p><strong>Cliente:</strong> ${this.escapeHtml(proposal.signerName)} (${this.escapeHtml(
      proposal.signerEmail,
    )})</p>
    ${
      proposal.validUntil
        ? `<p><strong>Validade:</strong> ${proposal.validUntil
            .toISOString()
            .slice(0, 10)}</p>`
        : ''
    }
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #d7d7d7;text-align:left;">Item</th>
          <th style="padding:8px;border:1px solid #d7d7d7;">Qtd</th>
          <th style="padding:8px;border:1px solid #d7d7d7;text-align:right;">Unitário</th>
          <th style="padding:8px;border:1px solid #d7d7d7;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <p style="margin-top:16px;"><strong>Total:</strong> ${this.escapeHtml(
      this.formatCurrency(proposal.total),
    )}</p>
    ${
      proposal.notes
        ? `<p><strong>Observações:</strong><br/>${this.escapeHtml(proposal.notes).replace(
            /\n/g,
            '<br/>',
          )}</p>`
        : ''
    }
    <p style="margin-top:24px;">Assinatura do cliente:</p>
    <p>\\s1\\</p>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getJsonApiId(payload: unknown): string | null {
    if (
      payload &&
      typeof payload === 'object' &&
      'data' in payload &&
      payload.data &&
      typeof payload.data === 'object' &&
      'id' in payload.data &&
      typeof payload.data.id === 'string'
    ) {
      return payload.data.id;
    }
    return null;
  }

  private getJsonApiStatus(payload: unknown): string | null {
    if (
      payload &&
      typeof payload === 'object' &&
      'data' in payload &&
      payload.data &&
      typeof payload.data === 'object' &&
      'attributes' in payload.data &&
      payload.data.attributes &&
      typeof payload.data.attributes === 'object' &&
      'status' in payload.data.attributes &&
      typeof payload.data.attributes.status === 'string'
    ) {
      return payload.data.attributes.status;
    }
    return null;
  }

  private async clickSignRequest<T>(
    cfg: ClickSignConfig,
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const res = await fetch(`${this.normalizeClickSignBaseUrl(cfg.baseUrl)}${path}`, {
      ...init,
      headers: {
        Authorization: cfg.accessToken,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new InternalServerErrorException(`ClickSign: ${errorText}`);
    }
    return res.json() as Promise<T>;
  }

  private async sendWithClickSign(
    tenantId: string,
    proposal: SignatureProposalInput,
  ): Promise<SignatureDispatchResult> {
    const cfg = (await this.getProviderConfig(
      tenantId,
      IntegrationProvider.CLICKSIGN,
    )) as ClickSignConfig | null;
    if (!cfg?.accessToken) {
      throw new BadRequestException('ClickSign não configurado para este tenant');
    }

    const envelope = await this.clickSignRequest<Record<string, unknown>>(cfg, '/api/v3/envelopes', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'envelopes',
          attributes: {
            name: proposal.title,
            locale: 'pt-BR',
          },
        },
      }),
    });
    const envelopeId = this.getJsonApiId(envelope);
    if (!envelopeId) {
      throw new InternalServerErrorException('ClickSign: envelope não retornou id');
    }

    const document = await this.clickSignRequest<Record<string, unknown>>(
      cfg,
      `/api/v3/envelopes/${envelopeId}/documents`,
      {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'documents',
            attributes: {
              filename: `proposta-${proposal.proposalId}.txt`,
              content_base64: Buffer.from(
                this.buildProposalPlainText(proposal),
                'utf8',
              ).toString('base64'),
            },
          },
        }),
      },
    );
    const documentId = this.getJsonApiId(document);
    if (!documentId) {
      throw new InternalServerErrorException('ClickSign: documento não retornou id');
    }

    const signer = await this.clickSignRequest<Record<string, unknown>>(
      cfg,
      `/api/v3/envelopes/${envelopeId}/signers`,
      {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'signers',
            attributes: {
              name: proposal.signerName,
              email: proposal.signerEmail,
              communicate_by: 'email',
            },
          },
        }),
      },
    );
    const signerId = this.getJsonApiId(signer);
    if (!signerId) {
      throw new InternalServerErrorException('ClickSign: signatário não retornou id');
    }

    await this.clickSignRequest(
      cfg,
      `/api/v3/envelopes/${envelopeId}/requirements`,
      {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'requirements',
            attributes: {
              action: 'sign',
              auth: 'email',
              signer_id: signerId,
              document_id: documentId,
            },
          },
        }),
      },
    );

    await this.clickSignRequest(
      cfg,
      `/api/v3/envelopes/${envelopeId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            type: 'envelopes',
            id: envelopeId,
            attributes: {
              status: 'running',
            },
          },
        }),
      },
    );

    try {
      await this.clickSignRequest(
        cfg,
        `/api/v3/envelopes/${envelopeId}/notifications`,
        {
          method: 'POST',
          body: JSON.stringify({
            data: {
              type: 'notifications',
              attributes: {
                message: proposal.title,
              },
            },
          }),
        },
      );
    } catch (error) {
      this.logger.warn(
        `ClickSign notification failed envelope=${envelopeId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }

    return {
      provider: IntegrationProvider.CLICKSIGN,
      requestId: envelopeId,
      signatureUrl: null,
      status: 'sent',
      payload: { envelopeId, documentId, signerId },
    };
  }

  private async refreshClickSignStatus(
    tenantId: string,
    requestId: string,
    signatureUrl?: string | null,
  ): Promise<SignatureStatusResult> {
    const cfg = (await this.getProviderConfig(
      tenantId,
      IntegrationProvider.CLICKSIGN,
    )) as ClickSignConfig | null;
    if (!cfg?.accessToken) {
      throw new BadRequestException('ClickSign não configurado para este tenant');
    }

    const envelope = await this.clickSignRequest<Record<string, unknown>>(
      cfg,
      `/api/v3/envelopes/${requestId}`,
      { method: 'GET' },
    );
    const rawStatus = this.getJsonApiStatus(envelope);
    const status = this.mapClickSignStatus(rawStatus);

    return {
      provider: IntegrationProvider.CLICKSIGN,
      requestId,
      signatureUrl: signatureUrl ?? null,
      status,
      payload: envelope,
    };
  }

  private mapClickSignStatus(status: string | null): ProposalSignatureStatus {
    switch (status) {
      case 'running':
        return 'sent';
      case 'closed':
        return 'signed';
      case 'canceled':
        return 'canceled';
      case 'draft':
        return 'not_sent';
      default:
        return 'sent';
    }
  }

  private async docuSignRequest<T>(
    cfg: DocuSignConfig,
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const res = await fetch(`${this.normalizeDocuSignBasePath(cfg.basePath)}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new InternalServerErrorException(`DocuSign: ${errorText}`);
    }

    return res.json() as Promise<T>;
  }

  private async sendWithDocuSign(
    tenantId: string,
    proposal: SignatureProposalInput,
  ): Promise<SignatureDispatchResult> {
    const cfg = (await this.getProviderConfig(
      tenantId,
      IntegrationProvider.DOCUSIGN,
    )) as DocuSignConfig | null;
    if (!cfg?.accessToken || !cfg.accountId || !cfg.basePath) {
      throw new BadRequestException('DocuSign não configurado para este tenant');
    }

    const clientUserId = `proposal-${proposal.proposalId}`;
    const envelope = await this.docuSignRequest<Record<string, unknown>>(
      cfg,
      `/restapi/v2.1/accounts/${cfg.accountId}/envelopes`,
      {
        method: 'POST',
        body: JSON.stringify({
          emailSubject: `Assinatura da proposta: ${proposal.title}`,
          status: 'sent',
          documents: [
            {
              documentBase64: Buffer.from(
                this.buildProposalHtml(proposal),
                'utf8',
              ).toString('base64'),
              name: `${proposal.title}.html`,
              fileExtension: 'html',
              documentId: '1',
            },
          ],
          recipients: {
            signers: [
              {
                email: proposal.signerEmail,
                name: proposal.signerName,
                recipientId: '1',
                routingOrder: '1',
                clientUserId,
                tabs: {
                  signHereTabs: [
                    {
                      anchorString: '\\s1\\',
                      anchorUnits: 'pixels',
                      anchorXOffset: '0',
                      anchorYOffset: '0',
                    },
                  ],
                },
              },
            ],
          },
        }),
      },
    );

    const envelopeId =
      typeof envelope.envelopeId === 'string' ? envelope.envelopeId : null;
    if (!envelopeId) {
      throw new InternalServerErrorException('DocuSign: envelope não retornou id');
    }

    const recipientView = await this.docuSignRequest<Record<string, unknown>>(
      cfg,
      `/restapi/v2.1/accounts/${cfg.accountId}/envelopes/${envelopeId}/views/recipient`,
      {
        method: 'POST',
        body: JSON.stringify({
          authenticationMethod: 'none',
          clientUserId,
          email: proposal.signerEmail,
          userName: proposal.signerName,
          returnUrl:
            cfg.returnUrl?.trim() ||
            `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')}/app/proposals/${proposal.proposalId}`,
        }),
      },
    );

    return {
      provider: IntegrationProvider.DOCUSIGN,
      requestId: envelopeId,
      signatureUrl:
        typeof recipientView.url === 'string' ? recipientView.url : null,
      status: 'sent',
      payload: envelope,
    };
  }

  private async refreshDocuSignStatus(
    tenantId: string,
    requestId: string,
    signatureUrl?: string | null,
  ): Promise<SignatureStatusResult> {
    const cfg = (await this.getProviderConfig(
      tenantId,
      IntegrationProvider.DOCUSIGN,
    )) as DocuSignConfig | null;
    if (!cfg?.accessToken || !cfg.accountId || !cfg.basePath) {
      throw new BadRequestException('DocuSign não configurado para este tenant');
    }

    const envelope = await this.docuSignRequest<Record<string, unknown>>(
      cfg,
      `/restapi/v2.1/accounts/${cfg.accountId}/envelopes/${requestId}`,
      { method: 'GET' },
    );

    return {
      provider: IntegrationProvider.DOCUSIGN,
      requestId,
      signatureUrl: signatureUrl ?? null,
      status: this.mapDocuSignStatus(
        typeof envelope.status === 'string' ? envelope.status : null,
      ),
      payload: envelope,
    };
  }

  private mapDocuSignStatus(status: string | null): ProposalSignatureStatus {
    switch (status) {
      case 'created':
        return 'not_sent';
      case 'sent':
        return 'sent';
      case 'delivered':
        return 'viewed';
      case 'completed':
        return 'signed';
      case 'declined':
        return 'declined';
      case 'voided':
        return 'canceled';
      default:
        return 'sent';
    }
  }
}
