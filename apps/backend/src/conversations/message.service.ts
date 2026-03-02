import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageDirection } from './entities/message.entity';
import { MessageAttachment } from './entities/message-attachment.entity';
import { MessageTemplate } from './entities/message-template.entity';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageAttachment)
    private readonly attachmentRepo: Repository<MessageAttachment>,
    @InjectRepository(MessageTemplate)
    private readonly templateRepo: Repository<MessageTemplate>,
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
