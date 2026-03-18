import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export class CreateReviewRequestDto {
  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsEnum(['google', 'facebook', 'trustpilot', 'custom'])
  platform?: 'google' | 'facebook' | 'trustpilot' | 'custom';

  @IsOptional()
  @IsEnum(['whatsapp', 'email', 'sms'])
  channel?: 'whatsapp' | 'email' | 'sms';

  @IsOptional()
  @IsString()
  reviewUrl?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class CompleteReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
