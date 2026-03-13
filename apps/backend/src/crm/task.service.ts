import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AppEventsService } from '../common/events/app-events.service';
import { WorkflowTriggerType } from '../automation/entities/workflow.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly appEvents: AppEventsService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateTaskDto,
    options?: { skipWorkflowEvent?: boolean },
  ): Promise<Task> {
    const task = this.taskRepo.create({
      ...dto,
      tenantId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      overdueNotifiedAt: null,
    });
    const saved = await this.taskRepo.save(task);
    if (options?.skipWorkflowEvent !== true) {
      this.appEvents.emit('task.created', {
        type: WorkflowTriggerType.TASK_CREATED,
        tenantId,
        contactId: saved.contactId,
        opportunityId: saved.opportunityId ?? undefined,
        taskId: saved.id,
      });
    }
    return saved;
  }

  async findAll(
    tenantId: string,
    contactId?: string,
    opportunityId?: string,
  ): Promise<Task[]> {
    const where: Record<string, unknown> = { tenantId };
    if (contactId) where.contactId = contactId;
    if (opportunityId) where.opportunityId = opportunityId;
    return this.taskRepo.find({
      where,
      relations: ['contact', 'opportunity'],
      order: { dueDate: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id, tenantId },
      relations: ['contact', 'opportunity'],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(tenantId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(tenantId, id);
    Object.assign(task, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : task.dueDate,
    });
    if (dto.dueDate !== undefined || dto.isCompleted !== undefined) {
      task.overdueNotifiedAt = null;
    }
    return this.taskRepo.save(task);
  }

  async toggleComplete(tenantId: string, id: string): Promise<Task> {
    const task = await this.findOne(tenantId, id);
    task.isCompleted = !task.isCompleted;
    if (task.isCompleted) {
      task.overdueNotifiedAt = null;
    }
    return this.taskRepo.save(task);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.taskRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Task not found');
  }

  async deleteByTitle(tenantId: string, title: string): Promise<{ deleted: number }> {
    const result = await this.taskRepo.delete({ tenantId, title });
    return { deleted: result.affected ?? 0 };
  }
}
