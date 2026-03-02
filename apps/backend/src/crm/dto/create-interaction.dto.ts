import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { InteractionType } from '../entities/interaction.entity';

export class CreateInteractionDto {
  @IsUUID()
  contactId: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @IsEnum(InteractionType)
  type: InteractionType;

  @IsString()
  description: string;
}
