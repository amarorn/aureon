import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WorkflowTriggerType,
  WorkflowActionType,
} from '../entities/workflow.entity';

export class WorkflowTriggerConfigDto {
  @IsOptional()
  @IsString()
  pipelineId?: string;

  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @IsString()
  fromStageId?: string;

  @IsOptional()
  @IsString()
  toStageId?: string;
}

export class WorkflowActionConfigDto {
  @IsEnum(WorkflowActionType)
  type: WorkflowActionType;

  @IsOptional()
  @IsObject()
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
  @ValidateNested()
  @Type(() => WorkflowTriggerConfigDto)
  triggerConfig?: WorkflowTriggerConfigDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionConfigDto)
  actions: WorkflowActionConfigDto[];
}
