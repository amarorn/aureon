import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationService } from '../integrations/integration.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';
import { Appointment } from './entities/appointment.entity';
import { Contact } from '../crm/entities/contact.entity';

// ── Provider type ─────────────────────────────────────────────────────────────

export type BookingProvider = 'calendly' | 'cal_com';

// ── Stored config shape ───────────────────────────────────────────────────────

interface BookingConfig {
  apiKey: string;
  bookingUrl: string; // e.g. https://calendly.com/username or https://cal.com/username
  baseUrl?: string;   // Cal.com only — custom self-hosted base (default https://api.cal.com/v1)
  userUri?: string;   // Calendly internal — populated on first save
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface BookingStatus {
  connected: boolean;
  bookingUrl: string | null;
  provider: BookingProvider;
}

export interface BookingSyncResult {
  created: number;
  skipped: number;
  errors: string[];
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly integrationService: IntegrationService,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  // ── Config & Status ────────────────────────────────────────────────────────

  async saveConfig(
    tenantId: string,
    provider: BookingProvider,
    dto: { apiKey: string; bookingUrl: string; baseUrl?: string },
  ): Promise<{ ok: boolean; bookingUrl: string }> {
    const integrationProvider =
      provider === 'calendly' ? IntegrationProvider.CALENDLY : IntegrationProvider.CAL_COM;

    // Validate token and fetch user info
    let userUri: string | undefined;
    if (provider === 'calendly') {
      userUri = await this.validateCalendly(dto.apiKey);
    } else {
      await this.validateCalCom(dto.apiKey, dto.baseUrl);
    }

    const config: BookingConfig = {
      apiKey: dto.apiKey,
      bookingUrl: dto.bookingUrl.replace(/\/$/, ''),
      ...(dto.baseUrl ? { baseUrl: dto.baseUrl } : {}),
      ...(userUri ? { userUri } : {}),
    };

    const existing = await this.integrationService.findByProvider(tenantId, integrationProvider);
    if (existing) {
      await this.integrationService.updateConfig(
        tenantId,
        integrationProvider,
        config as unknown as Record<string, unknown>,
      );
      await this.integrationService.setStatus(tenantId, existing.id, 'connected');
    } else {
      await this.integrationService.create(tenantId, {
        provider: integrationProvider,
        config: config as unknown as Record<string, unknown>,
      });
      const created = await this.integrationService.findByProvider(tenantId, integrationProvider);
      if (created) await this.integrationService.setStatus(tenantId, created.id, 'connected');
    }

    return { ok: true, bookingUrl: config.bookingUrl };
  }

  async getStatus(tenantId: string, provider: BookingProvider): Promise<BookingStatus> {
    const integrationProvider =
      provider === 'calendly' ? IntegrationProvider.CALENDLY : IntegrationProvider.CAL_COM;

    const integration = await this.integrationService.findByProvider(tenantId, integrationProvider);
    if (!integration || integration.status !== 'connected') {
      return { connected: false, bookingUrl: null, provider };
    }
    const cfg = integration.config as BookingConfig | null;
    return {
      connected: !!(cfg?.apiKey && cfg?.bookingUrl),
      bookingUrl: cfg?.bookingUrl ?? null,
      provider,
    };
  }

  async getBookingLink(
    tenantId: string,
    opts: { provider?: BookingProvider; contactId?: string },
  ): Promise<{ url: string | null; provider: BookingProvider | null }> {
    // Try Calendly first, then Cal.com
    const providers: BookingProvider[] = opts.provider
      ? [opts.provider]
      : ['calendly', 'cal_com'];

    for (const p of providers) {
      const status = await this.getStatus(tenantId, p);
      if (!status.connected || !status.bookingUrl) continue;

      let url = status.bookingUrl;

      // Prefill contact info if provided
      if (opts.contactId) {
        const contact = await this.contactRepo.findOne({
          where: { tenantId, id: opts.contactId },
        });
        if (contact) {
          const params = new URLSearchParams();
          if (contact.name) params.set('name', contact.name);
          if (contact.email) params.set('email', contact.email);
          url = `${url}?${params.toString()}`;
        }
      }

      return { url, provider: p };
    }

    return { url: null, provider: null };
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  private async validateCalendly(apiKey: string): Promise<string | undefined> {
    const res = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Calendly API key inválida: ${res.status}`);
    const data = (await res.json()) as { resource?: { uri?: string } };
    return data.resource?.uri;
  }

  private async validateCalCom(apiKey: string, baseUrl?: string): Promise<void> {
    const base = this.calComApiBase(baseUrl);
    const res = await fetch(`${base}/me?apiKey=${encodeURIComponent(apiKey)}`);
    if (!res.ok) throw new Error(`Cal.com API key inválida: ${res.status}`);
  }

  // ── Sync ───────────────────────────────────────────────────────────────────

  async syncEvents(tenantId: string, provider?: BookingProvider): Promise<BookingSyncResult> {
    const result: BookingSyncResult = { created: 0, skipped: 0, errors: [] };
    const providers: BookingProvider[] = provider ? [provider] : ['calendly', 'cal_com'];

    for (const p of providers) {
      const integrationProvider =
        p === 'calendly' ? IntegrationProvider.CALENDLY : IntegrationProvider.CAL_COM;
      const integration = await this.integrationService.findByProvider(tenantId, integrationProvider);
      if (!integration || integration.status !== 'connected') continue;
      const cfg = integration.config as BookingConfig | null;
      if (!cfg?.apiKey) continue;

      try {
        if (p === 'calendly') {
          await this.syncCalendly(tenantId, cfg, result);
        } else {
          await this.syncCalCom(tenantId, cfg, result);
        }
      } catch (err) {
        result.errors.push(`${p}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return result;
  }

  private async syncCalendly(
    tenantId: string,
    cfg: BookingConfig,
    result: BookingSyncResult,
  ): Promise<void> {
    if (!cfg.userUri) {
      result.errors.push('calendly: userUri não disponível. Reconecte a integração.');
      return;
    }

    const minStart = new Date();
    minStart.setDate(minStart.getDate() - 30);

    const res = await fetch(
      `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(cfg.userUri)}&min_start_time=${minStart.toISOString()}&count=100`,
      { headers: { Authorization: `Bearer ${cfg.apiKey}` } },
    );
    if (!res.ok) throw new Error(`Calendly /scheduled_events: ${res.status}`);
    const data = (await res.json()) as {
      collection?: CalendlyEvent[];
    };

    for (const event of data.collection ?? []) {
      if (!event.uri) continue;
      const bookingId = event.uri.split('/').pop()!;

      const existing = await this.appointmentRepo.findOne({
        where: { tenantId, bookingExternalId: bookingId },
      });
      if (existing) { result.skipped++; continue; }

      // Fetch invitees to get contact info
      const inviteesRes = await fetch(`${event.uri}/invitees`, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });
      const inviteesData = inviteesRes.ok
        ? ((await inviteesRes.json()) as { collection?: CalendlyInvitee[] })
        : { collection: [] };

      const invitee = inviteesData.collection?.[0];
      const contact = invitee
        ? await this.findOrCreateContact(tenantId, invitee.email, invitee.name)
        : null;

      await this.appointmentRepo.save(
        this.appointmentRepo.create({
          tenantId,
          contactId: contact?.id ?? null,
          title: event.name ?? 'Reunião Calendly',
          description: event.location?.join_url
            ? `Meeting URL: ${event.location.join_url}`
            : null,
          startAt: new Date(event.start_time),
          endAt: new Date(event.end_time),
          type: 'meeting',
          status: event.status === 'canceled' ? 'cancelled' : 'scheduled',
          meetingUrl: event.location?.join_url ?? null,
          bookingExternalId: bookingId,
        }),
      );
      result.created++;
    }
  }

  private async syncCalCom(
    tenantId: string,
    cfg: BookingConfig,
    result: BookingSyncResult,
  ): Promise<void> {
    const base = this.calComApiBase(cfg.baseUrl);
    const res = await fetch(
      `${base}/bookings?apiKey=${encodeURIComponent(cfg.apiKey)}&take=100`,
    );
    if (!res.ok) throw new Error(`Cal.com /bookings: ${res.status}`);
    const data = (await res.json()) as { bookings?: CalComBooking[] };

    for (const booking of data.bookings ?? []) {
      const bookingId = String(booking.id);

      const existing = await this.appointmentRepo.findOne({
        where: { tenantId, bookingExternalId: bookingId },
      });
      if (existing) { result.skipped++; continue; }

      const attendee = booking.attendees?.[0];
      const contact = attendee
        ? await this.findOrCreateContact(tenantId, attendee.email, attendee.name)
        : null;

      await this.appointmentRepo.save(
        this.appointmentRepo.create({
          tenantId,
          contactId: contact?.id ?? null,
          title: booking.title ?? 'Reunião Cal.com',
          description: null,
          startAt: new Date(booking.startTime),
          endAt: new Date(booking.endTime),
          type: 'meeting',
          status: booking.status === 'CANCELLED' ? 'cancelled' : 'scheduled',
          meetingUrl: booking.metadata?.videoCallUrl ?? null,
          bookingExternalId: bookingId,
        }),
      );
      result.created++;
    }
  }

  // ── Webhook processors ─────────────────────────────────────────────────────

  async processCalendlyWebhook(
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const event = payload.event as string | undefined;
    if (event !== 'invitee.created') return;

    const p = payload.payload as CalendlyWebhookPayload | undefined;
    if (!p) return;

    const bookingId = p.scheduled_event?.uri?.split('/').pop();
    if (!bookingId) return;

    const existing = await this.appointmentRepo.findOne({
      where: { tenantId, bookingExternalId: bookingId },
    });
    if (existing) return;

    const contact = p.invitee?.email
      ? await this.findOrCreateContact(tenantId, p.invitee.email, p.invitee.name ?? p.invitee.email)
      : null;

    const startAt = p.scheduled_event?.start_time
      ? new Date(p.scheduled_event.start_time)
      : new Date();
    const endAt = p.scheduled_event?.end_time
      ? new Date(p.scheduled_event.end_time)
      : new Date(startAt.getTime() + 60 * 60 * 1000);

    await this.appointmentRepo.save(
      this.appointmentRepo.create({
        tenantId,
        contactId: contact?.id ?? null,
        title: p.event_type?.name ?? p.scheduled_event?.name ?? 'Reunião Calendly',
        description: null,
        startAt,
        endAt,
        type: 'meeting',
        status: 'scheduled',
        meetingUrl: p.scheduled_event?.location?.join_url ?? null,
        bookingExternalId: bookingId,
      }),
    );

    this.logger.log(`Calendly booking created: ${bookingId} for tenant ${tenantId}`);
  }

  async processCalComWebhook(
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const trigger = payload.triggerEvent as string | undefined;
    if (trigger !== 'BOOKING_CREATED') return;

    const p = payload.payload as CalComWebhookPayload | undefined;
    if (!p?.uid) return;

    const existing = await this.appointmentRepo.findOne({
      where: { tenantId, bookingExternalId: String(p.uid) },
    });
    if (existing) return;

    const attendee = p.attendees?.[0];
    const contact = attendee?.email
      ? await this.findOrCreateContact(tenantId, attendee.email, attendee.name ?? attendee.email)
      : null;

    const startAt = p.startTime ? new Date(p.startTime) : new Date();
    const endAt = p.endTime
      ? new Date(p.endTime)
      : new Date(startAt.getTime() + 60 * 60 * 1000);

    await this.appointmentRepo.save(
      this.appointmentRepo.create({
        tenantId,
        contactId: contact?.id ?? null,
        title: p.title ?? 'Reunião Cal.com',
        description: null,
        startAt,
        endAt,
        type: 'meeting',
        status: 'scheduled',
        meetingUrl: p.metadata?.videoCallUrl ?? null,
        bookingExternalId: String(p.uid),
      }),
    );

    this.logger.log(`Cal.com booking created: ${p.uid} for tenant ${tenantId}`);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private calComApiBase(baseUrl?: string): string {
    if (baseUrl) return baseUrl.replace(/\/$/, '');
    return 'https://api.cal.com/v1';
  }

  private async findOrCreateContact(
    tenantId: string,
    email: string,
    name: string,
  ): Promise<Contact> {
    const existing = await this.contactRepo.findOne({ where: { tenantId, email } });
    if (existing) return existing;
    return this.contactRepo.save(
      this.contactRepo.create({ tenantId, name, email, source: 'booking' }),
    );
  }
}

// ── Internal types ─────────────────────────────────────────────────────────────

interface CalendlyEvent {
  uri?: string;
  name?: string;
  status?: string;
  start_time: string;
  end_time: string;
  location?: { join_url?: string; type?: string };
}

interface CalendlyInvitee {
  email: string;
  name: string;
}

interface CalComBooking {
  id: number;
  title?: string;
  status?: string;
  startTime: string;
  endTime: string;
  attendees?: Array<{ email: string; name: string }>;
  metadata?: { videoCallUrl?: string };
}

interface CalendlyWebhookPayload {
  invitee?: { email: string; name?: string };
  event_type?: { name?: string };
  scheduled_event?: {
    uri?: string;
    name?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
    location?: { join_url?: string; type?: string };
  };
}

interface CalComWebhookPayload {
  uid?: string | number;
  title?: string;
  startTime?: string;
  endTime?: string;
  attendees?: Array<{ email: string; name?: string }>;
  metadata?: { videoCallUrl?: string };
}
