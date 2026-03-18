import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProposalItemDto {
  @IsString()
  description: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;
}

export class CreateProposalDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalItemDto)
  items?: ProposalItemDto[];

  @IsOptional()
  @IsString()
  meetingUrl?: string;
}

export class UpdateProposalStatusDto {
  @IsEnum(['sent', 'viewed', 'accepted', 'declined', 'expired'])
  status: 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
}

export class SendProposalSignatureDto {
  @IsOptional()
  @IsEnum(['clicksign', 'docusign'])
  provider?: 'clicksign' | 'docusign';
}
