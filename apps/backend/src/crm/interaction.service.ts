import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interaction } from './entities/interaction.entity';
import { CreateInteractionDto } from './dto/create-interaction.dto';

@Injectable()
export class InteractionService {
  constructor(
    @InjectRepository(Interaction)
    private readonly interactionRepo: Repository<Interaction>,
  ) {}

  async create(tenantId: string, dto: CreateInteractionDto): Promise<Interaction> {
    const interaction = this.interactionRepo.create({
      ...dto,
      tenantId,
      opportunityId: dto.opportunityId ?? null,
    });
    return this.interactionRepo.save(interaction);
  }

  async findByContact(tenantId: string, contactId: string): Promise<Interaction[]> {
    return this.interactionRepo.find({
      where: { tenantId, contactId },
      relations: ['opportunity'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByOpportunity(
    tenantId: string,
    opportunityId: string,
  ): Promise<Interaction[]> {
    return this.interactionRepo.find({
      where: { tenantId, opportunityId },
      order: { createdAt: 'DESC' },
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.interactionRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Interaction not found');
  }
}
