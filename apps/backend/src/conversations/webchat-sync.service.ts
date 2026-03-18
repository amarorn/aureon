import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../crm/entities/contact.entity';
import { Channel, ChannelType } from './entities/channel.entity';
import {
  Conversation,
  ConversationStatus,
} from './entities/conversation.entity';
import { Message, MessageDirection } from './entities/message.entity';
import { SyncWebchatLeadDto, SyncWebchatTranscriptDto } from './dto/sync-webchat-transcript.dto';

const WEBCHAT_CHANNEL_NAME = 'Chat do Site';

@Injectable()
export class WebchatSyncService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  private cleanValue(value?: string | null): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private cleanEmail(value?: string | null): string | undefined {
    const email = this.cleanValue(value)?.toLowerCase();
    return email && /\S+@\S+\.\S+/.test(email) ? email : undefined;
  }

  private cleanPhone(value?: string | null): string | undefined {
    const phone = this.cleanValue(value);
    if (!phone) {
      return undefined;
    }

    return phone.replace(/\D/g, '').length >= 10 ? phone : undefined;
  }

  private buildNotes(lead: SyncWebchatLeadDto): string | undefined {
    const lines = [
      'Origem: assistente conversacional do site',
      lead.planoInteresse?.trim()
        ? `Plano de interesse: ${lead.planoInteresse.trim()}`
        : undefined,
      lead.modulosInteresse?.length
        ? `Módulos de interesse: ${lead.modulosInteresse
            .map((item) => item.trim())
            .filter(Boolean)
            .join(', ')}`
        : undefined,
      lead.tamanhoTime?.trim()
        ? `Tamanho do time: ${lead.tamanhoTime.trim()}`
        : undefined,
      lead.desafioPrincipal?.trim()
        ? `Desafio principal: ${lead.desafioPrincipal.trim()}`
        : undefined,
    ].filter(Boolean) as string[];

    return lines.length ? lines.join('\n') : undefined;
  }

  private mergeNotes(
    existing: string | null | undefined,
    incoming: string | undefined,
  ): string | undefined {
    const lines = new Set(
      (existing ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    );

    for (const line of (incoming ?? '')
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)) {
      lines.add(line);
    }

    return lines.size ? Array.from(lines).join('\n') : undefined;
  }

  private async ensureWebchatChannel(tenantId: string) {
    const existing = await this.channelRepo.findOne({
      where: {
        tenantId,
        type: ChannelType.OTHER,
        name: WEBCHAT_CHANNEL_NAME,
      },
    });

    if (existing) {
      return existing;
    }

    const channel = this.channelRepo.create({
      tenantId,
      type: ChannelType.OTHER,
      name: WEBCHAT_CHANNEL_NAME,
      config: {
        source: 'webchat',
        assistant: 'Auri',
      },
    });

    return this.channelRepo.save(channel);
  }

  private async findExistingContact(tenantId: string, lead: SyncWebchatLeadDto) {
    const email = this.cleanEmail(lead.email);
    const phone = this.cleanPhone(lead.telefone);

    if (email) {
      const byEmail = await this.contactRepo.findOne({
        where: { tenantId, email },
      });
      if (byEmail) {
        return byEmail;
      }
    }

    if (phone) {
      const byPhone = await this.contactRepo.findOne({
        where: { tenantId, phone },
      });
      if (byPhone) {
        return byPhone;
      }
    }

    return null;
  }

  private async resolveContact(tenantId: string, lead: SyncWebchatLeadDto) {
    const email = this.cleanEmail(lead.email);
    const phone = this.cleanPhone(lead.telefone);

    if (!email && !phone) {
      throw new BadRequestException(
        'Email ou telefone são obrigatórios para arquivar a conversa do webchat.',
      );
    }

    const existing = await this.findExistingContact(tenantId, lead);
    const incomingNotes = this.buildNotes(lead);

    if (existing) {
      const mergedNotes = this.mergeNotes(existing.notes, incomingNotes);

      existing.name =
        this.cleanValue(lead.nome) &&
        (!existing.name || existing.name === 'Lead via Auri')
          ? this.cleanValue(lead.nome)!
          : existing.name;
      existing.email = email ?? existing.email;
      existing.phone = phone ?? existing.phone;
      existing.company = this.cleanValue(lead.empresa) ?? existing.company;
      existing.source = existing.source ?? 'chat_widget';
      if (mergedNotes) {
        existing.notes = mergedNotes;
      }

      return this.contactRepo.save(existing);
    }

    const created: Contact = this.contactRepo.create({
      tenantId,
      name: this.cleanValue(lead.nome) ?? 'Lead via Auri',
      email,
      phone,
      company: this.cleanValue(lead.empresa),
      source: 'chat_widget',
      notes: incomingNotes,
    });

    return this.contactRepo.save(created);
  }

  private async ensureConversation(
    tenantId: string,
    contactId: string,
    channelId: string,
  ) {
    const existing = await this.conversationRepo.findOne({
      where: {
        tenantId,
        contactId,
        channelId,
        status: ConversationStatus.OPEN,
      },
    });

    if (existing) {
      return existing;
    }

    const conversation = this.conversationRepo.create({
      tenantId,
      contactId,
      channelId,
      status: ConversationStatus.OPEN,
      externalId: null,
      assignedTo: null,
      subject: 'Conversa via chat do site',
    });

    return this.conversationRepo.save(conversation);
  }

  async sync(tenantId: string, dto: SyncWebchatTranscriptDto) {
    const contact = await this.resolveContact(tenantId, dto.lead);
    const channel = await this.ensureWebchatChannel(tenantId);
    const conversation = await this.ensureConversation(
      tenantId,
      contact.id,
      channel.id,
    );

    const existingMessages = await this.messageRepo.find({
      where: {
        tenantId,
        conversationId: conversation.id,
      },
      order: { createdAt: 'ASC' },
    });

    const existingClientIds = new Set(
      existingMessages
        .map((message) =>
          typeof message.metadata?.clientMessageId === 'string'
            ? message.metadata.clientMessageId
            : null,
        )
        .filter(Boolean),
    );

    let persistedMessages = 0;

    for (const item of dto.messages) {
      const clientMessageId = this.cleanValue(item.id);
      const content = this.cleanValue(item.content);

      if (!clientMessageId || !content || existingClientIds.has(clientMessageId)) {
        continue;
      }

      const direction =
        item.role === 'user'
          ? MessageDirection.INBOUND
          : MessageDirection.OUTBOUND;

      const message = this.messageRepo.create({
        tenantId,
        conversationId: conversation.id,
        content,
        direction,
        templateId: null,
        externalId: null,
        metadata: {
          source: 'webchat',
          assistant: 'Auri',
          sessionId: this.cleanValue(dto.sessionId) ?? null,
          clientMessageId,
        },
      });

      await this.messageRepo.save(message);
      existingClientIds.add(clientMessageId);
      persistedMessages += 1;
    }

    return {
      contactId: contact.id,
      conversationId: conversation.id,
      persistedMessages,
    };
  }
}
