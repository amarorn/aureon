import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateMessageTemplateDto {
  @IsString()
  name: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}
