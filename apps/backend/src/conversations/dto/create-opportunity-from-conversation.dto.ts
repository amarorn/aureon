import { IsString, IsOptional, IsUUID, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOpportunityFromConversationDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsUUID()
  pipelineId?: string;

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
