import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SyncWebchatMessageDto {
  @IsString()
  id: string;

  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class SyncWebchatLeadDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  empresa?: string;

  @IsOptional()
  @IsString()
  planoInteresse?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modulosInteresse?: string[];

  @IsOptional()
  @IsString()
  tamanhoTime?: string;

  @IsOptional()
  @IsString()
  desafioPrincipal?: string;
}

export class SyncWebchatTranscriptDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ValidateNested()
  @Type(() => SyncWebchatLeadDto)
  lead: SyncWebchatLeadDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncWebchatMessageDto)
  messages: SyncWebchatMessageDto[];
}
