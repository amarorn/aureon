import { WorkflowTriggerType } from './entities/workflow.entity';

export interface WorkflowEventPayload {
  type: WorkflowTriggerType;
  tenantId: string;
  contactId?: string;
  opportunityId?: string;
  stageId?: string;
  fromStageId?: string;
  toStageId?: string;
  pipelineId?: string;
  taskId?: string;
  [key: string]: unknown;
}
