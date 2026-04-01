import { IsOptional, IsString } from 'class-validator';

export class RejectAccessRequestDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
