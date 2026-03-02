import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailCampaign } from './entities/email-campaign.entity';
import { EmailCampaignRecipient } from './entities/email-campaign-recipient.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class EmailCampaignService {
  constructor(
    @InjectRepository(EmailCampaign)
    private readonly campaignRepo: Repository<EmailCampaign>,
    @InjectRepository(EmailCampaignRecipient)
    private readonly recipientRepo: Repository<EmailCampaignRecipient>,
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

    // Create recipients from contactIds if provided
    if (dto.contactIds?.length) {
      const recipients = dto.contactIds.map((cId) =>
        this.recipientRepo.create({
          campaignId: saved.id,
          contactId: cId,
          email: '',  // will be resolved on send
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
    // Mark as sending → simulate send → mark as sent
    await this.campaignRepo.update(id, { status: 'sending' });
    await this.recipientRepo.update(
      { campaignId: id },
      { status: 'sent', sentAt: new Date() },
    );
    const sentCount = await this.recipientRepo.count({ where: { campaignId: id } });
    await this.campaignRepo.update(id, {
      status: 'sent',
      sentAt: new Date(),
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

  async addRecipient(tenantId: string, campaignId: string, email: string, contactId?: string, contactName?: string) {
    await this.findOne(tenantId, campaignId);
    const recipient = this.recipientRepo.create({
      campaignId,
      email,
      contactId: contactId ?? null,
      contactName: contactName ?? null,
      status: 'pending',
    });
    const saved = await this.recipientRepo.save(recipient);
    const count = await this.recipientRepo.count({ where: { campaignId } });
    await this.campaignRepo.update(campaignId, { recipientCount: count });
    return saved;
  }
}
