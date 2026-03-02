import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { Tag } from './entities/tag.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { AppEventsService } from '../common/events/app-events.service';
import { WorkflowTriggerType } from '../automation/entities/workflow.entity';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
    private readonly appEvents: AppEventsService,
  ) {}

  async create(tenantId: string, dto: CreateContactDto): Promise<Contact> {
    const contact = this.contactRepo.create({ ...dto, tenantId });
    if (dto.tagIds?.length) {
      contact.tags = await this.tagRepo.findBy({
        id: In(dto.tagIds),
        tenantId,
      });
    }
    const saved = await this.contactRepo.save(contact);
    this.appEvents.emit('contact.created', {
      type: WorkflowTriggerType.CONTACT_CREATED,
      tenantId,
      contactId: saved.id,
    });
    return saved;
  }

  async findAll(tenantId: string): Promise<Contact[]> {
    return this.contactRepo.find({
      where: { tenantId },
      relations: ['tags'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Contact> {
    const contact = await this.contactRepo.findOne({
      where: { id, tenantId },
      relations: ['tags', 'opportunities', 'opportunities.stage'],
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateContactDto,
  ): Promise<Contact> {
    const contact = await this.findOne(tenantId, id);
    if (dto.tagIds !== undefined) {
      contact.tags = dto.tagIds.length
        ? await this.tagRepo.findBy({ id: In(dto.tagIds), tenantId })
        : [];
    }
    const { tagIds, ...rest } = dto;
    Object.assign(contact, rest);
    return this.contactRepo.save(contact);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.contactRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Contact not found');
  }
}
