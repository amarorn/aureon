import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { EmailCampaign } from './entities/email-campaign.entity';
import { EmailCampaignRecipient } from './entities/email-campaign-recipient.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { Contact } from '../crm/entities';
import { EmailDeliveryService } from '../integrations/email-delivery.service';

const SCHEDULE_SCAN_MS = 60_000;
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64',
);

@Injectable()
export class EmailCampaignService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailCampaignService.name);
  private scheduleTimer: NodeJS.Timeout | null = null;
  private readonly processingCampaignIds = new Set<string>();

  constructor(
    @InjectRepository(EmailCampaign)
    private readonly campaignRepo: Repository<EmailCampaign>,
    @InjectRepository(EmailCampaignRecipient)
    private readonly recipientRepo: Repository<EmailCampaignRecipient>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    private readonly emailDelivery: EmailDeliveryService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.scheduleTimer = setInterval(() => {
      void this.processScheduledCampaigns();
    }, SCHEDULE_SCAN_MS);
    void this.processScheduledCampaigns();
  }

  onModuleDestroy(): void {
    if (this.scheduleTimer) clearInterval(this.scheduleTimer);
  }

  async create(tenantId: string, dto: CreateCampaignDto) {
    const validatedContactIds = await this.validateContactIds(tenantId, dto.contactIds);
    const shouldSchedule = Boolean(dto.scheduledAt && validatedContactIds.length > 0);

    const campaign = this.campaignRepo.create({
      tenantId,
      name: dto.name,
      subject: dto.subject,
      bodyHtml: dto.bodyHtml,
      fromName: dto.fromName ?? null,
      fromEmail: dto.fromEmail ?? null,
      scheduledAt: shouldSchedule ? new Date(dto.scheduledAt as string) : null,
      status: shouldSchedule ? 'scheduled' : 'draft',
    });
    const saved = await this.campaignRepo.save(campaign);

    if (validatedContactIds.length) {
      const recipients = validatedContactIds.map((contactId) =>
        this.recipientRepo.create({
          campaignId: saved.id,
          contactId,
          email: '',
          status: 'pending',
        }),
      );
      await this.recipientRepo.save(recipients);
      await this.campaignRepo.update(saved.id, { recipientCount: recipients.length });
    }

    return this.findOne(tenantId, saved.id);
  }

  findAll(tenantId: string) {
    return this.campaignRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const campaign = await this.campaignRepo.findOne({ where: { id, tenantId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async send(tenantId: string, id: string) {
    const campaign = await this.findOne(tenantId, id);
    return this.sendCampaign(campaign);
  }

  async duplicate(tenantId: string, id: string) {
    const original = await this.findOne(tenantId, id);
    return this.create(tenantId, {
      name: `${original.name} (cópia)`,
      subject: original.subject,
      bodyHtml: original.bodyHtml,
      fromName: original.fromName ?? undefined,
      fromEmail: original.fromEmail ?? undefined,
    });
  }

  async remove(tenantId: string, id: string) {
    const campaign = await this.findOne(tenantId, id);
    await this.campaignRepo.remove(campaign);
    return { ok: true };
  }

  async getRecipients(tenantId: string, campaignId: string) {
    await this.findOne(tenantId, campaignId);
    return this.recipientRepo.find({
      where: { campaignId },
      order: { createdAt: 'DESC' },
    });
  }

  async addRecipient(
    tenantId: string,
    campaignId: string,
    email: string,
    contactId?: string,
    contactName?: string,
  ) {
    const campaign = await this.findOne(tenantId, campaignId);
    const contact = contactId
      ? await this.contactRepo.findOne({ where: { id: contactId, tenantId } })
      : null;
    if (contactId && !contact) {
      throw new NotFoundException('Contact not found');
    }

    const recipient = this.recipientRepo.create({
      campaignId,
      email: email.trim(),
      contactId: contact?.id ?? null,
      contactName: contactName?.trim() || contact?.name || null,
      status: 'pending',
    });
    const saved = await this.recipientRepo.save(recipient);
    const count = await this.recipientRepo.count({ where: { campaignId } });
    const nextStatus =
      campaign.status === 'scheduled' && count > 0 && campaign.scheduledAt
        ? 'scheduled'
        : campaign.status === 'scheduled' && count === 0
          ? 'draft'
          : campaign.status;

    await this.campaignRepo.update(campaignId, {
      recipientCount: count,
      status: nextStatus,
    });
    return saved;
  }

  async trackOpen(recipientId: string): Promise<void> {
    const recipient = await this.recipientRepo.findOne({ where: { id: recipientId } });
    if (!recipient || recipient.openedAt) return;

    const openedAt = new Date();
    await this.recipientRepo.update(recipient.id, { openedAt });
    await this.campaignRepo.increment({ id: recipient.campaignId }, 'openCount', 1);
  }

  async trackClick(recipientId: string, url: string): Promise<string> {
    const redirectUrl = this.normalizeRedirectUrl(url);
    const recipient = await this.recipientRepo.findOne({ where: { id: recipientId } });
    if (!recipient) {
      return redirectUrl;
    }

    if (!recipient.clickedAt) {
      const clickedAt = new Date();
      await this.recipientRepo.update(recipient.id, { clickedAt });
      await this.campaignRepo.increment({ id: recipient.campaignId }, 'clickCount', 1);
    }

    return redirectUrl;
  }

  trackingPixel(): Buffer {
    return TRACKING_PIXEL;
  }

  private async sendCampaign(campaign: EmailCampaign): Promise<EmailCampaign> {
    if (this.processingCampaignIds.has(campaign.id)) {
      throw new BadRequestException('Campaign is already being processed');
    }

    const allowedStatuses: Array<EmailCampaign['status']> = [
      'draft',
      'scheduled',
      'failed',
    ];
    const claimed = await this.campaignRepo
      .createQueryBuilder()
      .update(EmailCampaign)
      .set({ status: 'sending' })
      .where('id = :id', { id: campaign.id })
      .andWhere('tenant_id = :tenantId', { tenantId: campaign.tenantId })
      .andWhere('status IN (:...statuses)', { statuses: allowedStatuses })
      .execute();

    if (!claimed.affected) {
      const current = await this.findOne(campaign.tenantId, campaign.id);
      if (current.status === 'sending') {
        throw new BadRequestException('A campanha já está em envio');
      }
      if (current.status === 'sent') {
        throw new BadRequestException('A campanha já foi enviada');
      }
      if (current.status === 'cancelled') {
        throw new BadRequestException('A campanha foi cancelada');
      }
      throw new BadRequestException('A campanha não pode ser enviada neste estado');
    }

    this.processingCampaignIds.add(campaign.id);

    try {
      const recipients = await this.recipientRepo.find({
        where: { campaignId: campaign.id, status: In(['pending', 'failed']) },
        order: { createdAt: 'ASC' },
      });
      if (!recipients.length) {
        await this.campaignRepo.update(campaign.id, { status: campaign.status });
        throw new BadRequestException('A campanha não possui destinatários pendentes');
      }

      const contacts = await this.loadContactsByIds(
        campaign.tenantId,
        recipients
          .map((recipient) => recipient.contactId)
          .filter((contactId): contactId is string => !!contactId),
      );

      for (const recipient of recipients) {
        const contact = recipient.contactId ? contacts.get(recipient.contactId) : null;
        const email = recipient.email?.trim() || contact?.email?.trim() || '';
        const contactName = recipient.contactName?.trim() || contact?.name?.trim() || null;

        if (!email) {
          await this.recipientRepo.update(recipient.id, {
            status: 'failed',
            contactName,
            email: recipient.email || '',
          });
          continue;
        }

        try {
          const renderedSubject = this.renderTemplate(
            campaign.subject,
            contact,
            contactName,
            email,
          );
          const renderedHtml = this.renderTemplate(
            campaign.bodyHtml,
            contact,
            contactName,
            email,
          );

          await this.emailDelivery.send(campaign.tenantId, {
            to: email,
            subject: renderedSubject,
            html: this.injectTracking(renderedHtml, recipient.id),
            fromEmail: campaign.fromEmail,
            fromName: campaign.fromName,
          });

          await this.recipientRepo.update(recipient.id, {
            email,
            contactName,
            status: 'sent',
            sentAt: new Date(),
          });
        } catch {
          await this.recipientRepo.update(recipient.id, {
            email,
            contactName,
            status: 'failed',
          });
        }
      }

      const [sentCount, recipientCount] = await Promise.all([
        this.recipientRepo.count({
          where: { campaignId: campaign.id, status: 'sent' },
        }),
        this.recipientRepo.count({ where: { campaignId: campaign.id } }),
      ]);

      await this.campaignRepo.update(campaign.id, {
        status: sentCount > 0 ? 'sent' : 'failed',
        sentAt: sentCount > 0 ? campaign.sentAt ?? new Date() : null,
        sentCount,
        recipientCount,
      });

      return this.findOne(campaign.tenantId, campaign.id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      await this.campaignRepo.update(campaign.id, { status: 'failed' });
      throw error;
    } finally {
      this.processingCampaignIds.delete(campaign.id);
    }
  }

  private async processScheduledCampaigns(): Promise<void> {
    const dueCampaigns = await this.campaignRepo.find({
      where: {
        status: 'scheduled',
        scheduledAt: LessThanOrEqual(new Date()),
      },
      order: { scheduledAt: 'ASC' },
      take: 20,
    });

    for (const campaign of dueCampaigns) {
      try {
        await this.sendCampaign(campaign);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Scheduled campaign failed id=${campaign.id} tenant=${campaign.tenantId}: ${message}`,
        );
      }
    }
  }

  private async validateContactIds(
    tenantId: string,
    contactIds?: string[],
  ): Promise<string[]> {
    if (!contactIds?.length) return [];

    const uniqueIds = [...new Set(contactIds)];
    const contacts = await this.contactRepo.find({
      where: { tenantId, id: In(uniqueIds) },
      select: ['id'],
    });

    if (contacts.length !== uniqueIds.length) {
      throw new BadRequestException('Um ou mais contatos não pertencem a este tenant');
    }

    return uniqueIds;
  }

  private async loadContactsByIds(
    tenantId: string,
    contactIds: string[],
  ): Promise<Map<string, Contact>> {
    if (!contactIds.length) return new Map();

    const contacts = await this.contactRepo.find({
      where: { tenantId, id: In(contactIds) },
    });
    return new Map(contacts.map((contact) => [contact.id, contact]));
  }

  private renderTemplate(
    content: string,
    contact: Contact | null | undefined,
    fallbackName: string | null,
    fallbackEmail: string,
  ): string {
    const variables: Record<string, string> = {
      nome: contact?.name || fallbackName || '',
      name: contact?.name || fallbackName || '',
      email: contact?.email || fallbackEmail || '',
      telefone: contact?.phone || '',
      phone: contact?.phone || '',
      empresa: contact?.company || '',
      company: contact?.company || '',
    };

    return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, rawKey: string) => {
      const key = rawKey.toLowerCase();
      return variables[key] ?? '';
    });
  }

  private injectTracking(html: string, recipientId: string): string {
    const trackedHtml = html.replace(
      /href=(["'])(https?:\/\/[^"'<>]+)\1/gi,
      (_match, quote: string, url: string) =>
        `href=${quote}${this.buildTrackingClickUrl(recipientId, url)}${quote}`,
    );
    const openPixel = `<img src="${this.buildTrackingOpenUrl(
      recipientId,
    )}" alt="" width="1" height="1" style="display:none" />`;

    if (trackedHtml.includes('</body>')) {
      return trackedHtml.replace('</body>', `${openPixel}</body>`);
    }

    return `${trackedHtml}${openPixel}`;
  }

  private buildTrackingOpenUrl(recipientId: string): string {
    return `${this.trackingBaseUrl()}/email-campaigns/track/open?recipientId=${encodeURIComponent(
      recipientId,
    )}`;
  }

  private buildTrackingClickUrl(recipientId: string, url: string): string {
    const params = new URLSearchParams({
      recipientId,
      url,
    });
    return `${this.trackingBaseUrl()}/email-campaigns/track/click?${params.toString()}`;
  }

  private trackingBaseUrl(): string {
    const baseUrl = (this.config.get<string>('API_BASE_URL') || 'http://localhost:3001').replace(
      /\/+$/,
      '',
    );
    const prefix = (this.config.get<string>('API_PREFIX') || 'api/v1').replace(
      /^\/+|\/+$/g,
      '',
    );
    return `${baseUrl}/${prefix}`;
  }

  private normalizeRedirectUrl(url: string): string {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('URL de tracking inválida');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('URL de tracking inválida');
    }

    return parsed.toString();
  }
}
