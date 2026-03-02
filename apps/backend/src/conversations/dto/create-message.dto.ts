import { IsString, IsUUID, IsOptional, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAttachmentDto {
  @IsString()
  url: string;

  @IsString()
  filename: string;

  @IsOptional()
  @IsString()
  mimetype?: string;

  @IsOptional()
  size?: number;
}

export class CreateMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttachmentDto)
  attachments?: CreateAttachmentDto[];
}
