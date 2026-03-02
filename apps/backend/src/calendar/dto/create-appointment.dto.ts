export class CreateAppointmentDto {
  title: string;
  description?: string;
  startAt: string; // ISO date string
  endAt: string;   // ISO date string
  type?: 'meeting' | 'call' | 'demo' | 'follow_up' | 'other';
  status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  contactId?: string;
  location?: string;
  notes?: string;
}
