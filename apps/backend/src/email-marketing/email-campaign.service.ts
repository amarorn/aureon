import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EmailCampaign } from './entities/email-campaign.entity';
import { EmailCampaignRecipient } from './entities/email-campaign-recipient.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { Contact } from '../crm/entities';
import { EmailDeliveryService } from '../integrations/email-delivery.service';

@Injectable()
export class EmailCampaignService {
  constructor(
    @InjectRepository(EmailCampaign)
    private readonly campaignRepo: Repository<EmailCampaign>,
    @InjectRepository(EmailCampaignRecipient)
    private readonly recipientRepo: Repository<EmailCampaignRecipient>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    private readonly emailDelivery: EmailDeliveryService,
  ) {}

  async create(tenantId: string, dto: CreateCampaignDto) {
    const campaign = this.campaignRepo.create({
      tenantId,
      name: dto.name,
      subject: dto.subject,
      bodyHtml: dto.bodyHtml,
      fromName: dto.fromName ?? null,
      fromEmail: dto.fromEmail ?? null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      status: 'draft',
    });
    const saved = await this.campaignRepo.save(campaign);

    if (dto.contactIds?.length) {
      const recipients = dto.contactIds.map((cId) =>
        this.recipientRepo.create({
          campaignId: saved.id,
          contactId: cId,
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
    const recipients = await this.recipientRepo.find({
      where: { campaignId: id },
      order: { createdAt: 'ASC' },
    });
    if (!recipients.length) {
      throw new BadRequestException('A campanha não possui destinatários');
    }

    await this.campaignRepo.update(id, { status: 'sending' });

    const contacts = await this.loadContactsByIds(
      tenantId,
      recipients
        .map((recipient) => recipient.contactId)
        .filter((contactId): contactId is string => !!contactId),
    );

    let sentCount = 0;
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
        await this.emailDelivery.send(tenantId, {
          to: email,
          subject: this.renderTemplate(campaign.subject, contact, contactName, email),
          html: this.renderTemplate(campaign.bodyHtml, contact, contactName, email),
          fromEmail: campaign.fromEmail,
          fromName: campaign.fromName,
        });

        sentCount += 1;
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

    await this.campaignRepo.update(id, {
      status: 'sent',
      sentAt: sentCount > 0 ? new Date() : null,
      sentCount,
    });
    return this.findOne(tenantId, id);
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

  getRecipients(campaignId: string) {
    return this.recipientRepo.find({ where: { campaignId }, order: { createdAt: 'DESC' } });
  }

  async addRecipient(
    tenantId: string,
    campaignId: string,
    email: string,
    contactId?: string,
    contactName?: string,
  ) {
    await this.findOne(tenantId, campaignId);
    const recipient = this.recipientRepo.create({
      campaignId,
      email: email.trim(),
      contactId: contactId ?? null,
      contactName: contactName?.trim() || null,
      status: 'pending',
    });
    const saved = await this.recipientRepo.save(recipient);
    const count = await this.recipientRepo.count({ where: { campaignId } });
    await this.campaignRepo.update(campaignId, { recipientCount: count });
    return saved;
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
}
