import { IsString, IsOptional, IsArray, IsUUID, IsDateString } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  bodyHtml: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsString()
  fromEmail?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  contactIds?: string[];
}
