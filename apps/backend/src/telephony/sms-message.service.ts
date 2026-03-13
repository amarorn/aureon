import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, IsNull, Repository } from 'typeorm';
import { SmsMessage } from './entities/sms-message.entity';
import { Contact } from '../crm/entities/contact.entity';

@Injectable()
export class SmsMessageService {
  constructor(
    @InjectRepository(SmsMessage)
    private readonly smsRepo: Repository<SmsMessage>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  async findAll(tenantId: string, contactId?: string): Promise<SmsMessage[]> {
    const where = contactId
      ? { tenantId, contactId }
      : { tenantId };

    return this.smsRepo.find({
      where,
      relations: ['contact'],
      order: { createdAt: 'DESC' },
    });
  }

  async createInbound(
    tenantId: string,
    phoneNumber: string,
    body: string,
    externalSid: string | null,
  ): Promise<SmsMessage> {
    const contact = await this.findContactByPhone(tenantId, phoneNumber);
    const sms = this.smsRepo.create({
      tenantId,
      contactId: contact?.id ?? null,
      phoneNumber,
      direction: 'inbound',
      body,
      externalSid,
      status: 'received',
    });
    return this.smsRepo.save(sms);
  }

  private async findContactByPhone(
    tenantId: string,
    phoneNumber: string,
  ): Promise<Contact | null> {
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) return null;

    const directMatch = await this.contactRepo.findOne({
      where: { tenantId, phone: trimmedPhone },
    });
    if (directMatch) return directMatch;

    const normalizedTarget = this.normalizePhone(trimmedPhone);
    if (!normalizedTarget) return null;

    const contacts = await this.contactRepo.find({
      where: { tenantId, phone: Not(IsNull()) },
      select: ['id', 'phone'],
    });

    return (
      contacts.find((contact) => this.normalizePhone(contact.phone) === normalizedTarget) ??
      null
    );
  }

  private normalizePhone(phone?: string | null): string {
    return phone?.replace(/\D/g, '') ?? '';
  }
}
