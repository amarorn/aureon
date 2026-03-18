import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class EmailTemplateService {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly repo: Repository<EmailTemplate>,
  ) {}

  create(tenantId: string, dto: CreateTemplateDto) {
    const template = this.repo.create({
      tenantId,
      name: dto.name,
      subject: dto.subject,
      bodyHtml: dto.bodyHtml,
      variables: dto.variables ?? [],
    });
    return this.repo.save(template);
  }

  findAll(tenantId: string) {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async findOne(tenantId: string, id: string) {
    const t = await this.repo.findOne({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateTemplateDto>) {
    const t = await this.findOne(tenantId, id);
    Object.assign(t, dto);
    return this.repo.save(t);
  }

  async remove(tenantId: string, id: string) {
    const t = await this.findOne(tenantId, id);
    await this.repo.remove(t);
    return { ok: true };
  }
}
