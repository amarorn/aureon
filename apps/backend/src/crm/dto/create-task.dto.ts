import { IsString, IsOptional, IsUUID, IsBoolean, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @IsUUID()
  contactId: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isCompleted?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priority?: number;
}
