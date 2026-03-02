import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './entities/conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
  ) {}

  async create(tenantId: string, dto: CreateConversationDto): Promise<Conversation> {
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
      ...dto,
      tenantId,
      assignedTo: dto.assignedTo ?? null,
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
