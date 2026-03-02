import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity } from './entities/opportunity.entity';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { AppEventsService } from '../common/events/app-events.service';
import { WorkflowTriggerType } from '../automation/entities/workflow.entity';

@Injectable()
export class OpportunityService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly oppRepo: Repository<Opportunity>,
    private readonly appEvents: AppEventsService,
  ) {}

  async create(tenantId: string, dto: CreateOpportunityDto): Promise<Opportunity> {
    const opp = this.oppRepo.create({
      contactId: dto.contactId,
      pipelineId: dto.pipelineId,
      stageId: dto.stageId,
      title: dto.title,
      value: dto.value ?? 0,
      notes: dto.notes,
      tenantId,
    });
    if (dto.expectedCloseDate) {
      opp.expectedCloseDate = new Date(dto.expectedCloseDate);
    }
    const saved = await this.oppRepo.save(opp);
    this.appEvents.emit('opportunity.created', {
      type: WorkflowTriggerType.OPPORTUNITY_CREATED,
      tenantId,
      contactId: saved.contactId,
      opportunityId: saved.id,
      stageId: saved.stageId,
      pipelineId: saved.pipelineId,
    });
    return saved;
  }

  async findAll(tenantId: string, pipelineId?: string): Promise<Opportunity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (pipelineId) where.pipelineId = pipelineId;
    return this.oppRepo.find({
      where,
      relations: ['contact', 'stage', 'pipeline'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Opportunity> {
    const opp = await this.oppRepo.findOne({
      where: { id, tenantId },
      relations: ['contact', 'stage', 'pipeline'],
    });
    if (!opp) throw new NotFoundException('Opportunity not found');
    return opp;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateOpportunityDto,
  ): Promise<Opportunity> {
    const opp = await this.findOne(tenantId, id);
    Object.assign(opp, {
      ...dto,
      expectedCloseDate: dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : opp.expectedCloseDate,
    });
    return this.oppRepo.save(opp);
  }

  async moveStage(
    tenantId: string,
    id: string,
    stageId: string,
  ): Promise<Opportunity> {
    const opp = await this.findOne(tenantId, id);
    const fromStageId = opp.stageId;
    opp.stageId = stageId;
    const saved = await this.oppRepo.save(opp);
    this.appEvents.emit('opportunity.moved', {
      type: WorkflowTriggerType.OPPORTUNITY_MOVED,
      tenantId,
      contactId: opp.contactId,
      opportunityId: opp.id,
      fromStageId,
      toStageId: stageId,
      pipelineId: opp.pipelineId,
    });
    return saved;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.oppRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Opportunity not found');
  }
}
