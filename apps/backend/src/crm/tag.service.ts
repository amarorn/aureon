import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
  ) {}

  async create(tenantId: string, dto: CreateTagDto): Promise<Tag> {
    const tag = this.tagRepo.create({ ...dto, tenantId });
    return this.tagRepo.save(tag);
  }

  async findAll(tenantId: string): Promise<Tag[]> {
    return this.tagRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Tag> {
    const tag = await this.tagRepo.findOne({ where: { id, tenantId } });
    if (!tag) throw new NotFoundException('Tag not found');
    return tag;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.tagRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Tag not found');
  }
}
