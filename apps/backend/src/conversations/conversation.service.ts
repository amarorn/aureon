import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './entities/conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { Channel, ChannelType } from './entities/channel.entity';
import { Contact } from '../crm/entities/contact.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  private extractInstagramIgsid(contact: Contact): string | null {
    const phone = contact.phone?.trim();
    if (!phone?.startsWith('ig:')) return null;
    const igsid = phone.slice(3).trim();
    return igsid || null;
  }

  async create(tenantId: string, dto: CreateConversationDto): Promise<Conversation> {
    const [channel, contact] = await Promise.all([
      this.channelRepo.findOne({ where: { id: dto.channelId, tenantId } }),
      this.contactRepo.findOne({ where: { id: dto.contactId, tenantId } }),
    ]);
    if (!channel) throw new NotFoundException('Channel not found');
    if (!contact) throw new NotFoundException('Contact not found');

    let externalId = dto.externalId ?? null;
    if (channel.type === ChannelType.TELEGRAM) {
      throw new BadRequestException(
        'Telegram ainda nao esta disponivel nas integracoes deste projeto.',
      );
    }
    if (channel.type === ChannelType.INSTAGRAM) {
      externalId = externalId ?? this.extractInstagramIgsid(contact);
      if (!externalId) {
        throw new BadRequestException(
          'O contato precisa ter um identificador do Instagram para iniciar esta conversa.',
        );
      }
    }
    if (channel.type === ChannelType.WHATSAPP) {
      const phone = contact.phone?.trim();
      if (!phone || phone.startsWith('ig:')) {
        throw new BadRequestException(
          'O contato precisa ter um telefone valido para iniciar conversa por WhatsApp.',
        );
      }
    }
    if (channel.type === ChannelType.EMAIL && !contact.email?.trim()) {
      throw new BadRequestException(
        'O contato precisa ter email para iniciar conversa por este canal.',
      );
    }

    const existing = await this.conversationRepo.findOne({
      where: {
        tenantId,
        contactId: dto.contactId,
        channelId: dto.channelId,
        status: ConversationStatus.OPEN,
      },
    });
    if (existing) return existing;

    const conversation = this.conversationRepo.create({
      tenantId,
      contactId: dto.contactId,
      channelId: dto.channelId,
      assignedTo: dto.assignedTo ?? null,
      externalId,
    });
    return this.conversationRepo.save(conversation);
  }

  async findAll(
    tenantId: string,
    filters?: { status?: ConversationStatus; contactId?: string; channelId?: string },
  ): Promise<Conversation[]> {
    const where: Record<string, unknown> = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.contactId) where.contactId = filters.contactId;
    if (filters?.channelId) where.channelId = filters.channelId;

    return this.conversationRepo.find({
      where,
      relations: ['contact', 'channel'],
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id, tenantId },
      relations: ['contact', 'channel', 'messages', 'messages.attachments'],
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateConversationDto,
  ): Promise<Conversation> {
    const conversation = await this.findOne(tenantId, id);
    Object.assign(conversation, dto);
    return this.conversationRepo.save(conversation);
  }

  async assign(tenantId: string, id: string, assignedTo: string | null): Promise<Conversation> {
    return this.update(tenantId, id, { assignedTo });
  }

  async close(tenantId: string, id: string): Promise<Conversation> {
    return this.update(tenantId, id, { status: ConversationStatus.CLOSED });
  }

  async reopen(tenantId: string, id: string): Promise<Conversation> {
    return this.update(tenantId, id, { status: ConversationStatus.OPEN });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.conversationRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Conversation not found');
  }
}
