import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { CallDirection, CallStatus } from '../entities/call.entity';

export class CreateCallDto {
  @IsUUID()
  contactId: string;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsEnum(CallDirection)
  direction?: CallDirection;

  @IsOptional()
  @IsEnum(CallStatus)
  status?: CallStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  durationSeconds?: number;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
