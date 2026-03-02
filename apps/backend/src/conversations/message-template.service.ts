import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplate } from './entities/message-template.entity';
import { CreateMessageTemplateDto } from './dto/create-message-template.dto';
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto';

@Injectable()
export class MessageTemplateService {
  constructor(
    @InjectRepository(MessageTemplate)
    private readonly templateRepo: Repository<MessageTemplate>,
  ) {}

  async create(tenantId: string, dto: CreateMessageTemplateDto): Promise<MessageTemplate> {
    const template = this.templateRepo.create({
      ...dto,
      tenantId,
      variables: dto.variables ?? [],
    });
    return this.templateRepo.save(template);
  }

  async findAll(tenantId: string): Promise<MessageTemplate[]> {
    return this.templateRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<MessageTemplate> {
    const template = await this.templateRepo.findOne({
      where: { id, tenantId },
    });
    if (!template) throw new NotFoundException('Message template not found');
    return template;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateMessageTemplateDto,
  ): Promise<MessageTemplate> {
    const template = await this.findOne(tenantId, id);
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.templateRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Message template not found');
  }
}
