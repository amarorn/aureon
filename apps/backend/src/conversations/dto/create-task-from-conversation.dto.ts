import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class CreateTaskFromConversationDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;
}
