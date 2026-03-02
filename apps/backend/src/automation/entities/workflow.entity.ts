import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WorkflowTriggerType {
  CONTACT_CREATED = 'contact_created',
  OPPORTUNITY_CREATED = 'opportunity_created',
  OPPORTUNITY_MOVED = 'opportunity_moved',
  TASK_CREATED = 'task_created',
}

export enum WorkflowActionType {
  SEND_MESSAGE = 'send_message',
  CREATE_TASK = 'create_task',
  UPDATE_STAGE = 'update_stage',
  NOTIFICATION = 'notification',
}

export interface WorkflowActionConfig {
  type: WorkflowActionType;
  config: Record<string, unknown>;
}

export interface WorkflowTriggerConfig {
  pipelineId?: string;
  stageId?: string;
  fromStageId?: string;
  toStageId?: string;
}

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ default: true })
  active: boolean;

  @Column({
    name: 'trigger_type',
    type: 'enum',
    enum: WorkflowTriggerType,
  })
  triggerType: WorkflowTriggerType;

  @Column({
    name: 'trigger_config',
    type: 'jsonb',
    nullable: true,
  })
  triggerConfig: WorkflowTriggerConfig | null;

  @Column({
    type: 'jsonb',
    default: [],
  })
  actions: WorkflowActionConfig[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
