export class CreateCampaignDto {
  name: string;
  subject: string;
  bodyHtml: string;
  fromName?: string;
  fromEmail?: string;
  scheduledAt?: string;
  /** Array of contact IDs or raw emails to send to */
  contactIds?: string[];
}
