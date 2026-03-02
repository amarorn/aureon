import {
  IsString,
  IsOptional,
  IsEnum,
  IsISO8601,
} from 'class-validator';

export enum AppointmentTypeEnum {
  MEETING = 'meeting',
  CALL = 'call',
  DEMO = 'demo',
  FOLLOW_UP = 'follow_up',
  OTHER = 'other',
}

export enum AppointmentStatusEnum {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export class CreateAppointmentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsISO8601()
  startAt: string;

  @IsISO8601()
  endAt: string;

  @IsOptional()
  @IsEnum(AppointmentTypeEnum)
  type?: AppointmentTypeEnum;

  @IsOptional()
  @IsEnum(AppointmentStatusEnum)
  status?: AppointmentStatusEnum;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
