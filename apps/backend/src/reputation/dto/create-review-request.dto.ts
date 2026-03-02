export class CreateReviewRequestDto {
  contactId?: string;
  platform?: 'google' | 'facebook' | 'trustpilot' | 'custom';
  channel?: 'whatsapp' | 'email' | 'sms';
  reviewUrl?: string;
  message?: string;
}

export class CompleteReviewDto {
  rating: number;    // 1-5
  comment?: string;
}
