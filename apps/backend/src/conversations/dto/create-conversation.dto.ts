import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  contactId: string;

  @IsUUID()
  channelId: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}
