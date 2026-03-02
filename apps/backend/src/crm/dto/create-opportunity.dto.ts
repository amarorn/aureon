import { IsString, IsOptional, IsUUID, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOpportunityDto {
  @IsUUID()
  contactId: string;

  @IsUUID()
  pipelineId: string;

  @IsUUID()
  stageId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  value?: number;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
