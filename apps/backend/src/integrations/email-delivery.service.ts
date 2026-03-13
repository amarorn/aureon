import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SESv2Client,
  SendEmailCommand,
  type Body,
  type Content,
  type Destination,
  type Message,
} from '@aws-sdk/client-sesv2';
import { IntegrationProvider } from './entities/integration.entity';
import { IntegrationService } from './integration.service';

type EmailProvider = IntegrationProvider.SENDGRID | IntegrationProvider.AMAZON_SES;

interface SendGridConfig {
  apiKey: string;
  fromEmail?: string | null;
  fromName?: string | null;
  replyToEmail?: string | null;
}

interface AmazonSesConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  fromEmail?: string | null;
  fromName?: string | null;
  replyToEmail?: string | null;
  configurationSetName?: string | null;
}

export interface EmailDeliveryPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string | null;
  fromName?: string | null;
  replyToEmail?: string | null;
}

export interface EmailDeliveryResult {
  provider: EmailProvider;
  messageId: string | null;
}

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  constructor(
    private readonly integrationService: IntegrationService,
    private readonly config: ConfigService,
  ) {}

  async isConnected(tenantId: string, provider: EmailProvider): Promise<boolean> {
    const cfg = await this.getProviderConfig(tenantId, provider);
    return !!cfg;
  }

  async saveSendGridConfig(tenantId: string, input: SendGridConfig): Promise<void> {
    const apiKey = input.apiKey?.trim();
    if (!apiKey) {
      throw new BadRequestException('apiKey é obrigatório para SendGrid');
    }

    await this.upsertProvider(tenantId, IntegrationProvider.SENDGRID, {
      apiKey,
      fromEmail: input.fromEmail?.trim() || null,
      fromName: input.fromName?.trim() || null,
      replyToEmail: input.replyToEmail?.trim() || null,
    });
  }

  async saveAmazonSesConfig(tenantId: string, input: AmazonSesConfig): Promise<void> {
    const accessKeyId = input.accessKeyId?.trim();
    const secretAccessKey = input.secretAccessKey?.trim();
    const region = input.region?.trim();
    if (!accessKeyId || !secretAccessKey || !region) {
      throw new BadRequestException(
        'accessKeyId, secretAccessKey e region são obrigatórios para Amazon SES',
      );
    }

    await this.upsertProvider(tenantId, IntegrationProvider.AMAZON_SES, {
      accessKeyId,
      secretAccessKey,
      region,
      fromEmail: input.fromEmail?.trim() || null,
      fromName: input.fromName?.trim() || null,
      replyToEmail: input.replyToEmail?.trim() || null,
      configurationSetName: input.configurationSetName?.trim() || null,
    });
  }

  async send(
    tenantId: string,
    payload: EmailDeliveryPayload,
  ): Promise<EmailDeliveryResult> {
    const provider = await this.resolveProvider(tenantId);
    if (!provider) {
      throw new BadRequestException(
        'Nenhum provedor de email configurado. Configure SendGrid ou Amazon SES em Integrações.',
      );
    }

    if (provider === IntegrationProvider.SENDGRID) {
      return this.sendWithSendGrid(tenantId, payload);
    }

    return this.sendWithAmazonSes(tenantId, payload);
  }

  private async resolveProvider(tenantId: string): Promise<EmailProvider | null> {
    const preferred = this.config
      .get<string>('EMAIL_DELIVERY_PROVIDER', '')
      .trim()
      .toLowerCase();

    const ordered: EmailProvider[] =
      preferred === IntegrationProvider.AMAZON_SES
        ? [IntegrationProvider.AMAZON_SES, IntegrationProvider.SENDGRID]
        : [IntegrationProvider.SENDGRID, IntegrationProvider.AMAZON_SES];

    for (const provider of ordered) {
      if (await this.isConnected(tenantId, provider)) {
        return provider;
      }
    }
    return null;
  }

  private async upsertProvider(
    tenantId: string,
    provider: EmailProvider,
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
    provider: EmailProvider,
  ): Promise<SendGridConfig | AmazonSesConfig | null> {
    const integration = await this.integrationService.findByProvider(tenantId, provider);
    if (integration?.status === 'connected' && integration.config) {
      return integration.config as unknown as SendGridConfig | AmazonSesConfig;
    }

    if (provider === IntegrationProvider.SENDGRID) {
      return this.getEnvSendGridConfig();
    }

    return this.getEnvAmazonSesConfig();
  }

  private getEnvSendGridConfig(): SendGridConfig | null {
    const apiKey = this.config.get<string>('INTEGRATION_SENDGRID_API_KEY', '').trim();
    if (!apiKey) return null;
    return {
      apiKey,
      fromEmail: this.config.get<string>('INTEGRATION_SENDGRID_FROM_EMAIL', '').trim() || null,
      fromName: this.config.get<string>('INTEGRATION_SENDGRID_FROM_NAME', '').trim() || null,
      replyToEmail:
        this.config.get<string>('INTEGRATION_SENDGRID_REPLY_TO_EMAIL', '').trim() || null,
    };
  }

  private getEnvAmazonSesConfig(): AmazonSesConfig | null {
    const accessKeyId = this.config
      .get<string>('INTEGRATION_AMAZON_SES_ACCESS_KEY_ID', '')
      .trim();
    const secretAccessKey = this.config
      .get<string>('INTEGRATION_AMAZON_SES_SECRET_ACCESS_KEY', '')
      .trim();
    const region = this.config.get<string>('INTEGRATION_AMAZON_SES_REGION', '').trim();
    if (!accessKeyId || !secretAccessKey || !region) return null;

    return {
      accessKeyId,
      secretAccessKey,
      region,
      fromEmail:
        this.config.get<string>('INTEGRATION_AMAZON_SES_FROM_EMAIL', '').trim() || null,
      fromName:
        this.config.get<string>('INTEGRATION_AMAZON_SES_FROM_NAME', '').trim() || null,
      replyToEmail:
        this.config.get<string>('INTEGRATION_AMAZON_SES_REPLY_TO_EMAIL', '').trim() || null,
      configurationSetName:
        this.config
          .get<string>('INTEGRATION_AMAZON_SES_CONFIGURATION_SET', '')
          .trim() || null,
    };
  }

  private formatFromAddress(fromEmail?: string | null, fromName?: string | null): string | null {
    const email = fromEmail?.trim();
    if (!email) return null;
    const name = fromName?.trim();
    return name ? `${name} <${email}>` : email;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async sendWithSendGrid(
    tenantId: string,
    payload: EmailDeliveryPayload,
  ): Promise<EmailDeliveryResult> {
    const cfg = (await this.getProviderConfig(
      tenantId,
      IntegrationProvider.SENDGRID,
    )) as SendGridConfig | null;
    if (!cfg?.apiKey) {
      throw new BadRequestException('SendGrid não configurado para este tenant');
    }

    const fromEmail = payload.fromEmail?.trim() || cfg.fromEmail?.trim();
    if (!fromEmail) {
      throw new BadRequestException('fromEmail é obrigatório para enviar via SendGrid');
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: {
          email: fromEmail,
          ...(payload.fromName?.trim() || cfg.fromName?.trim()
            ? { name: payload.fromName?.trim() || cfg.fromName?.trim() }
            : {}),
        },
        personalizations: [{ to: [{ email: payload.to }] }],
        reply_to:
          payload.replyToEmail?.trim() || cfg.replyToEmail?.trim()
            ? {
                email:
                  payload.replyToEmail?.trim() || cfg.replyToEmail?.trim(),
              }
            : undefined,
        subject: payload.subject,
        content: [
          { type: 'text/html', value: payload.html },
          { type: 'text/plain', value: payload.text?.trim() || this.stripHtml(payload.html) },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.warn(`SendGrid failed tenant=${tenantId}: ${err}`);
      throw new InternalServerErrorException(`SendGrid: ${err}`);
    }

    return {
      provider: IntegrationProvider.SENDGRID,
      messageId: res.headers.get('x-message-id'),
    };
  }

  private async sendWithAmazonSes(
    tenantId: string,
    payload: EmailDeliveryPayload,
  ): Promise<EmailDeliveryResult> {
    const cfg = (await this.getProviderConfig(
      tenantId,
      IntegrationProvider.AMAZON_SES,
    )) as AmazonSesConfig | null;
    if (!cfg?.accessKeyId || !cfg.secretAccessKey || !cfg.region) {
      throw new BadRequestException('Amazon SES não configurado para este tenant');
    }

    const from = this.formatFromAddress(
      payload.fromEmail?.trim() || cfg.fromEmail?.trim(),
      payload.fromName?.trim() || cfg.fromName?.trim(),
    );
    if (!from) {
      throw new BadRequestException('fromEmail é obrigatório para enviar via Amazon SES');
    }

    const client = new SESv2Client({
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });

    const destination: Destination = {
      ToAddresses: [payload.to],
    };
    const subject: Content = { Data: payload.subject, Charset: 'UTF-8' };
    const body: Body = {
      Html: { Data: payload.html, Charset: 'UTF-8' },
      Text: {
        Data: payload.text?.trim() || this.stripHtml(payload.html),
        Charset: 'UTF-8',
      },
    };
    const message: Message = { Subject: subject, Body: body };

    try {
      const result = await client.send(
        new SendEmailCommand({
          FromEmailAddress: from,
          Destination: destination,
          ReplyToAddresses:
            payload.replyToEmail?.trim() || cfg.replyToEmail?.trim()
              ? [payload.replyToEmail?.trim() || cfg.replyToEmail!.trim()]
              : undefined,
          Content: {
            Simple: message,
          },
          ConfigurationSetName: cfg.configurationSetName?.trim() || undefined,
        }),
      );

      return {
        provider: IntegrationProvider.AMAZON_SES,
        messageId: result.MessageId ?? null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Amazon SES send failed';
      this.logger.warn(`Amazon SES failed tenant=${tenantId}: ${message}`);
      throw new InternalServerErrorException(`Amazon SES: ${message}`);
    } finally {
      client.destroy();
    }
  }
}
