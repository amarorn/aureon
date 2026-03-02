export class UpdateAppointmentDto {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  type?: 'meeting' | 'call' | 'demo' | 'follow_up' | 'other';
  status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  contactId?: string;
  location?: string;
  notes?: string;
}
