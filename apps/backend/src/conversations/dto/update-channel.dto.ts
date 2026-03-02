import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ChannelType } from '../entities/channel.entity';

export class UpdateChannelDto {
  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
