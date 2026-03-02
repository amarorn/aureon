import { IsUUID, IsOptional, IsArray } from 'class-validator';

export class AddToQueueDto {
  @IsUUID()
  contactId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  contactIds?: string[];
}
