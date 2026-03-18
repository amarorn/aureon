import { Injectable, NotFoundException, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from './entities/workflow.entity';
import { WorkflowRun } from './entities/workflow-run.entity';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowTriggerType } from './entities/workflow.entity';
import { TaskService } from '../crm/task.service';
import { OpportunityService } from '../crm/opportunity.service';
import { AppEventsService } from '../common/events/app-events.service';
import type { WorkflowEventPayload } from './workflow.types';

export type { WorkflowEventPayload };

@Injectable()
export class WorkflowService implements OnModuleInit {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepo: Repository<Workflow>,
    @InjectRepository(WorkflowRun)
    private readonly runRepo: Repository<WorkflowRun>,
    @Inject(forwardRef(() => TaskService))
    private readonly taskService: TaskService,
    @Inject(forwardRef(() => OpportunityService))
    private readonly opportunityService: OpportunityService,
    private readonly appEvents: AppEventsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const { APP_EVENTS } = require('../common/events/app-events.service');
    this.appEvents.on(APP_EVENTS.CONTACT_CREATED, (p) => this.trigger(p));
    this.appEvents.on(APP_EVENTS.OPPORTUNITY_CREATED, (p) => this.trigger(p));
    this.appEvents.on(APP_EVENTS.OPPORTUNITY_MOVED, (p) => this.trigger(p));
    this.appEvents.on(APP_EVENTS.TASK_CREATED, (p) => this.trigger(p));
  }

  async create(tenantId: string, dto: CreateWorkflowDto): Promise<Workflow> {
    const workflow = this.workflowRepo.create({
      ...dto,
      tenantId,
      active: dto.active ?? true,
    });
    return this.workflowRepo.save(workflow);
  }

  async findAll(tenantId: string): Promise<Workflow[]> {
    return this.workflowRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Workflow> {
    const workflow = await this.workflowRepo.findOne({
      where: { id, tenantId },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateWorkflowDto,
  ): Promise<Workflow> {
    const workflow = await this.findOne(tenantId, id);
    Object.assign(workflow, dto);
    return this.workflowRepo.save(workflow);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.workflowRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Workflow not found');
  }

  async trigger(payload: WorkflowEventPayload): Promise<void> {
    const workflows = await this.workflowRepo.find({
      where: {
        tenantId: payload.tenantId,
        triggerType: payload.type,
        active: true,
      },
    });

    for (const workflow of workflows) {
      if (!this.matchesTrigger(workflow, payload)) continue;
      await this.executeWorkflow(workflow, payload);
    }
  }

  private matchesTrigger(
    workflow: Workflow,
    payload: WorkflowEventPayload,
  ): boolean {
    const config = workflow.triggerConfig;
    if (!config) return true;

    if (config.pipelineId && payload.pipelineId !== config.pipelineId) {
      return false;
    }
    if (config.stageId && payload.stageId !== config.stageId) {
      return false;
    }
    if (config.fromStageId && payload.fromStageId !== config.fromStageId) {
      return false;
    }
    if (config.toStageId && payload.toStageId !== config.toStageId) {
      return false;
    }
    return true;
  }

  private async executeWorkflow(
    workflow: Workflow,
    payload: WorkflowEventPayload,
  ): Promise<void> {
    const run = this.runRepo.create({
      tenantId: workflow.tenantId,
      workflowId: workflow.id,
      status: 'running',
      context: payload,
    });
    await this.runRepo.save(run);

    try {
      for (const action of workflow.actions || []) {
        await this.executeAction(action, payload);
      }
      run.status = 'completed';
    } catch (err) {
      run.status = 'failed';
      run.error = err instanceof Error ? err.message : String(err);
    }
    run.completedAt = new Date();
    await this.runRepo.save(run);
  }

  private async executeAction(
    action: { type: string; config?: Record<string, unknown> },
    payload: WorkflowEventPayload,
  ): Promise<void> {
    const config = action.config || {};
    switch (action.type) {
      case 'create_task':
        await this.executeCreateTask(config, payload);
        break;
      case 'update_stage':
        await this.executeUpdateStage(config, payload);
        break;
      case 'notification':
        await this.executeNotification(config, payload);
        break;
      case 'send_message':
        await this.executeSendMessage(config, payload);
        break;
      default:
        break;
    }
  }

  private async executeCreateTask(
    config: Record<string, unknown>,
    payload: WorkflowEventPayload,
  ): Promise<void> {
    if (this.config.get('WORKFLOW_CREATE_TASK_ENABLED') !== 'true') return;

    const contactId = (config.contactId as string) || payload.contactId;
    if (!contactId) return;

    await this.taskService.create(
      payload.tenantId,
      {
        contactId,
        title: (config.title as string) || 'Tarefa automática',
        description: config.description as string,
        opportunityId: payload.opportunityId,
      },
      { skipWorkflowEvent: true },
    );
  }

  private async executeUpdateStage(
    config: Record<string, unknown>,
    payload: WorkflowEventPayload,
  ): Promise<void> {
    const opportunityId = (config.opportunityId as string) || payload.opportunityId;
    const stageId = config.stageId as string;
    if (!opportunityId || !stageId) return;

    await this.opportunityService.moveStage(payload.tenantId, opportunityId, stageId);
  }

  private async executeNotification(
    config: Record<string, unknown>,
    _payload: WorkflowEventPayload,
  ): Promise<void> {
    const message = config.message as string;
    if (message) {
      console.log('[Workflow Notification]', message);
    }
  }

  private async executeSendMessage(
    _config: Record<string, unknown>,
    _payload: WorkflowEventPayload,
  ): Promise<void> {
    console.log('[Workflow] send_message - placeholder');
  }
}
