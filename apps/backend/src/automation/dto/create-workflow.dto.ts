import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WorkflowTriggerType,
  WorkflowActionType,
} from '../entities/workflow.entity';

export class WorkflowActionConfigDto {
  @IsEnum(WorkflowActionType)
  type: WorkflowActionType;

  @IsOptional()
  config?: Record<string, unknown>;
}

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsEnum(WorkflowTriggerType)
  triggerType: WorkflowTriggerType;

  @IsOptional()
  triggerConfig?: {
    pipelineId?: string;
    stageId?: string;
    fromStageId?: string;
    toStageId?: string;
  };

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionConfigDto)
  actions: WorkflowActionConfigDto[];
}
