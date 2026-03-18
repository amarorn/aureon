import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageDirection } from './entities/message.entity';
import { MessageAttachment } from './entities/message-attachment.entity';
import { MessageTemplate } from './entities/message-template.entity';
import { Conversation } from './entities/conversation.entity';
import { ChannelType } from './entities/channel.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { WhatsAppService } from '../integrations/whatsapp.service';
import { InstagramService } from '../integrations/instagram.service';
import { GmailService } from '../email-inbox/gmail.service';
import { OutlookService } from '../email-inbox/outlook.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageAttachment)
    private readonly attachmentRepo: Repository<MessageAttachment>,
    @InjectRepository(MessageTemplate)
    private readonly templateRepo: Repository<MessageTemplate>,
    private readonly whatsApp: WhatsAppService,
    private readonly instagram: InstagramService,
    private readonly gmail: GmailService,
    private readonly outlook: OutlookService,
  ) {}

  private applyTemplateVariables(
    content: string,
    variables: string[],
    values?: Record<string, string>,
  ): string {
    if (!values) return content;
    let result = content;
    for (const v of variables) {
      const placeholder = `{{${v}}}`;
      const value = values[v] ?? '';
      result = result.split(placeholder).join(value);
    }
    return result;
  }

  private assertNoAttachmentsForProviderChannel(
    channelType: ChannelType,
    attachments?: CreateMessageDto['attachments'],
  ): void {
    if (attachments?.length && channelType !== ChannelType.OTHER) {
      throw new BadRequestException(
        'Anexos ainda nao sao suportados para este canal no inbox.',
      );
    }
  }

  private extractInstagramIgsid(phone?: string | null): string | null {
    if (!phone?.trim().startsWith('ig:')) return null;
    const igsid = phone.trim().slice(3).trim();
    return igsid || null;
  }

  private getLatestGmailReplyHeader(
    conversation: Conversation & { messages?: Message[] },
  ): string | undefined {
    const sorted = [...(conversation.messages ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    for (const message of sorted) {
      const value = message.metadata?.messageId;
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
    return undefined;
  }

  async send(
    tenantId: string,
    conversationId: string,
    dto: CreateMessageDto,
  ): Promise<Message> {
    let content = dto.content;
    if (dto.templateId) {
      const template = await this.templateRepo.findOne({
        where: { id: dto.templateId, tenantId },
      });
      if (template) {
        content = this.applyTemplateVariables(
          template.content,
          template.variables,
          dto.templateVariables,
        );
      }
    }

    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, tenantId },
      relations: ['channel', 'contact', 'messages'],
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const channelType = conversation.channel?.type;
    if (!channelType) throw new BadRequestException('Canal da conversa nao encontrado.');

    this.assertNoAttachmentsForProviderChannel(channelType, dto.attachments);

    if (channelType === ChannelType.TELEGRAM) {
      throw new BadRequestException(
        'Telegram ainda nao esta disponivel nas integracoes deste projeto.',
      );
    }

    if (channelType === ChannelType.WHATSAPP) {
      const phone = dto.recipient?.trim() || conversation.contact?.phone?.trim();
      if (!phone || phone.startsWith('ig:')) {
        throw new BadRequestException(
          'O contato precisa ter um telefone valido para enviar WhatsApp.',
        );
      }
      const result = await this.whatsApp.sendTextMessage(tenantId, {
        to: phone,
        text: content,
      });
      if (!result.messageId) {
        throw new BadRequestException(result.error ?? 'Falha ao enviar mensagem por WhatsApp.');
      }

      const saved = await this.messageRepo.save(
        this.messageRepo.create({
          tenantId,
          conversationId,
          content,
          direction: MessageDirection.OUTBOUND,
          templateId: dto.templateId ?? null,
          externalId: result.messageId,
          metadata: { provider: 'whatsapp', to: phone },
        }),
      );
      return this.findOne(tenantId, saved.id);
    }

    if (channelType === ChannelType.INSTAGRAM) {
      const recipientIgsid =
        conversation.externalId?.trim() ||
        this.extractInstagramIgsid(conversation.contact?.phone);
      if (!recipientIgsid) {
        throw new BadRequestException(
          'Esta conversa nao possui o identificador do destinatario no Instagram.',
        );
      }
      if (!conversation.externalId) {
        await this.conversationRepo.update(conversation.id, { externalId: recipientIgsid });
      }

      const result = await this.instagram.sendDm(tenantId, recipientIgsid, content);
      if (!result.messageId) {
        throw new BadRequestException(result.error ?? 'Falha ao enviar DM pelo Instagram.');
      }

      const persisted = await this.messageRepo.findOne({
        where: { tenantId, externalId: result.messageId },
        relations: ['attachments'],
      });
      if (!persisted) throw new NotFoundException('Message not found');
      return persisted;
    }

    if (channelType === ChannelType.EMAIL) {
      const providerConfig = conversation.channel?.config?.provider;
      const configuredProvider =
        providerConfig === 'gmail' || providerConfig === 'outlook'
          ? providerConfig
          : undefined;
      const recipient = dto.recipient?.trim() || conversation.contact?.email?.trim();
      if (!recipient) {
        throw new BadRequestException(
          'O contato precisa ter email para enviar mensagens por este canal.',
        );
      }

      const subject = dto.subject?.trim() || conversation.subject || '(sem assunto)';
      const resolvedProvider =
        configuredProvider ??
        ((await this.gmail.isConnected(tenantId))
          ? 'gmail'
          : (await this.outlook.isConnected(tenantId))
            ? 'outlook'
            : undefined);
      if (!resolvedProvider) {
        throw new BadRequestException(
          'Nenhuma conta de email conectada para este tenant.',
        );
      }

      if (resolvedProvider === 'outlook') {
        const result = await this.outlook.sendEmail(tenantId, recipient, subject, content, {
          cc: dto.cc?.trim() || undefined,
          conversationId: conversation.id,
        });
        return this.findOne(tenantId, result.persistedMessageId);
      }

      const result = await this.gmail.sendEmail(tenantId, recipient, subject, content, {
        cc: dto.cc?.trim() || undefined,
        threadId: conversation.externalId ?? undefined,
        replyToMessageId: this.getLatestGmailReplyHeader(conversation),
        conversationId: conversation.id,
      });
      return this.findOne(tenantId, result.persistedMessageId);
    }

    const message = this.messageRepo.create({
      tenantId,
      conversationId,
      content,
      direction: MessageDirection.OUTBOUND,
      templateId: dto.templateId ?? null,
    });
    const saved = await this.messageRepo.save(message);

    if (dto.attachments?.length) {
      for (const att of dto.attachments) {
        const attachment = this.attachmentRepo.create({
          messageId: saved.id,
          url: att.url,
          filename: att.filename,
          mimetype: att.mimetype ?? null,
          size: att.size ?? 0,
        });
        await this.attachmentRepo.save(attachment);
      }
    }

    return this.findOne(tenantId, saved.id);
  }

  async findAll(tenantId: string, conversationId: string): Promise<Message[]> {
    return this.messageRepo.find({
      where: { tenantId, conversationId },
      relations: ['attachments'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Message> {
    const message = await this.messageRepo.findOne({
      where: { id, tenantId },
      relations: ['attachments'],
    });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }
}
