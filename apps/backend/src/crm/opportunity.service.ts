import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity } from './entities/opportunity.entity';
import { Contact } from './entities/contact.entity';
import { Pipeline } from './entities/pipeline.entity';
import { Stage } from './entities/stage.entity';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { AppEventsService } from '../common/events/app-events.service';
import { WorkflowTriggerType } from '../automation/entities/workflow.entity';

@Injectable()
export class OpportunityService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly oppRepo: Repository<Opportunity>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Pipeline)
    private readonly pipelineRepo: Repository<Pipeline>,
    @InjectRepository(Stage)
    private readonly stageRepo: Repository<Stage>,
    private readonly appEvents: AppEventsService,
  ) {}

  private async findContactOrFail(tenantId: string, contactId: string): Promise<Contact> {
    const contact = await this.contactRepo.findOne({ where: { id: contactId, tenantId } });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  private async findPipelineOrFail(tenantId: string, pipelineId: string): Promise<Pipeline> {
    const pipeline = await this.pipelineRepo.findOne({ where: { id: pipelineId, tenantId } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  private async findStageOrFail(tenantId: string, stageId: string): Promise<Stage> {
    const stage = await this.stageRepo.findOne({ where: { id: stageId, tenantId } });
    if (!stage) throw new NotFoundException('Stage not found');
    return stage;
  }

  private async validateReferences(
    tenantId: string,
    contactId: string,
    pipelineId: string,
    stageId: string,
  ): Promise<{ contact: Contact; pipeline: Pipeline; stage: Stage }> {
    const [contact, pipeline, stage] = await Promise.all([
      this.findContactOrFail(tenantId, contactId),
      this.findPipelineOrFail(tenantId, pipelineId),
      this.findStageOrFail(tenantId, stageId),
    ]);
    if (stage.pipelineId !== pipeline.id) {
      throw new BadRequestException('Stage does not belong to the selected pipeline');
    }
    return { contact, pipeline, stage };
  }

  async create(tenantId: string, dto: CreateOpportunityDto): Promise<Opportunity> {
    const { stage } = await this.validateReferences(
      tenantId,
      dto.contactId,
      dto.pipelineId,
      dto.stageId,
    );
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
    opp.closedAt = stage.isWon ? new Date() : null;
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
    const nextContactId = dto.contactId ?? opp.contactId;
    const nextPipelineId = dto.pipelineId ?? opp.pipelineId;
    const nextStageId = dto.stageId ?? opp.stageId;
    const { stage } = await this.validateReferences(
      tenantId,
      nextContactId,
      nextPipelineId,
      nextStageId,
    );

    const fromStageId = opp.stageId;
    Object.assign(opp, {
      ...dto,
      contactId: nextContactId,
      pipelineId: nextPipelineId,
      stageId: nextStageId,
      expectedCloseDate:
        dto.expectedCloseDate !== undefined
          ? new Date(dto.expectedCloseDate)
          : opp.expectedCloseDate,
      closedAt: stage.isWon ? opp.closedAt ?? new Date() : null,
    });
    const saved = await this.oppRepo.save(opp);

    if (fromStageId !== saved.stageId) {
      this.appEvents.emit('opportunity.moved', {
        type: WorkflowTriggerType.OPPORTUNITY_MOVED,
        tenantId,
        contactId: saved.contactId,
        opportunityId: saved.id,
        fromStageId,
        toStageId: saved.stageId,
        pipelineId: saved.pipelineId,
      });
    }

    return saved;
  }

  async moveStage(
    tenantId: string,
    id: string,
    stageId: string,
  ): Promise<Opportunity> {
    const opp = await this.findOne(tenantId, id);
    const stage = await this.findStageOrFail(tenantId, stageId);
    if (stage.pipelineId !== opp.pipelineId) {
      throw new BadRequestException('Stage does not belong to the opportunity pipeline');
    }
    const fromStageId = opp.stageId;
    opp.stageId = stageId;
    opp.closedAt = stage.isWon ? opp.closedAt ?? new Date() : null;
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
