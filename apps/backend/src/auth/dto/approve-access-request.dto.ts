import { IsObject, IsOptional, IsString } from 'class-validator';

export class ApproveAccessRequestDto {
  @IsString()
  packageCode: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  featureOverrides?: Record<string, boolean>;
}
