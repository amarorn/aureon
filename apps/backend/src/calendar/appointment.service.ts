import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { GoogleCalendarService } from './google-calendar.service';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly repo: Repository<Appointment>,
    private readonly googleCalendar: GoogleCalendarService,
  ) {}

  async create(tenantId: string, dto: CreateAppointmentDto) {
    const appointment = this.repo.create({
      tenantId,
      title: dto.title,
      description: dto.description ?? null,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      type: dto.type ?? 'meeting',
      status: dto.status ?? 'scheduled',
      contactId: dto.contactId ?? null,
      location: dto.location ?? null,
      notes: dto.notes ?? null,
    });

    const saved = await this.repo.save(appointment);

    // Async sync to Google Calendar (non-blocking)
    this.googleCalendar
      .syncEvent(tenantId, saved)
      .then(async (result) => {
        if (result.googleEventId) {
          await this.repo.update(saved.id, {
            googleEventId: result.googleEventId,
          });
        } else if (result.error) {
          this.logger.warn(
            `create sync failed appointmentId=${saved.id}: ${result.error}`,
          );
        }
      })
      .catch((err) => {
        this.logger.warn(
          `create sync threw appointmentId=${saved.id}: ${err}`,
        );
      });

    return saved;
  }

  findAll(tenantId: string, startDate?: string, endDate?: string) {
    if (startDate && endDate) {
      return this.repo.find({
        where: {
          tenantId,
          startAt: Between(new Date(startDate), new Date(endDate)),
        },
        order: { startAt: 'ASC' },
        relations: ['contact'],
      });
    }
    if (startDate) {
      return this.repo.find({
        where: { tenantId, startAt: MoreThanOrEqual(new Date(startDate)) },
        order: { startAt: 'ASC' },
        relations: ['contact'],
      });
    }
    if (endDate) {
      return this.repo.find({
        where: { tenantId, startAt: LessThanOrEqual(new Date(endDate)) },
        order: { startAt: 'ASC' },
        relations: ['contact'],
      });
    }
    return this.repo.find({
      where: { tenantId },
      order: { startAt: 'ASC' },
      relations: ['contact'],
    });
  }

  async findOne(tenantId: string, id: string) {
    const appointment = await this.repo.findOne({
      where: { id, tenantId },
      relations: ['contact'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async update(tenantId: string, id: string, dto: UpdateAppointmentDto) {
    const appointment = await this.findOne(tenantId, id);
    if (dto.title !== undefined) appointment.title = dto.title;
    if (dto.description !== undefined) appointment.description = dto.description ?? null;
    if (dto.startAt !== undefined) appointment.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) appointment.endAt = new Date(dto.endAt);
    if (dto.type !== undefined) appointment.type = dto.type;
    if (dto.status !== undefined) appointment.status = dto.status;
    if (dto.contactId !== undefined) appointment.contactId = dto.contactId ?? null;
    if (dto.location !== undefined) appointment.location = dto.location ?? null;
    if (dto.notes !== undefined) appointment.notes = dto.notes ?? null;

    const saved = await this.repo.save(appointment);

    // Sync update to Google Calendar
    this.googleCalendar
      .syncEvent(tenantId, saved)
      .then(async (result) => {
        if (result.googleEventId && !saved.googleEventId) {
          await this.repo.update(saved.id, {
            googleEventId: result.googleEventId,
          });
        } else if (result.error) {
          this.logger.warn(
            `update sync failed appointmentId=${saved.id}: ${result.error}`,
          );
        }
      })
      .catch((err) => {
        this.logger.warn(
          `update sync threw appointmentId=${saved.id}: ${err}`,
        );
      });

    return saved;
  }

  async remove(tenantId: string, id: string) {
    const appointment = await this.findOne(tenantId, id);

    // Delete from Google Calendar if synced
    if (appointment.googleEventId) {
      this.googleCalendar
        .deleteEvent(tenantId, appointment.googleEventId)
        .catch((err) => {
          this.logger.warn(
            `deleteEvent threw googleEventId=${appointment.googleEventId}: ${err}`,
          );
        });
    }

    await this.repo.remove(appointment);
    return { ok: true };
  }

  /**
   * Push all local appointments to Google Calendar.
   * Returns synced count, failed count, and up to 10 error messages for debugging.
   */
  async syncAllToGoogle(tenantId: string): Promise<{
    synced: number;
    failed: number;
    total: number;
    errors: string[];
  }> {
    const appointments = await this.repo.find({ where: { tenantId } });
    let synced = 0;
    const errors: string[] = [];

    for (const appt of appointments) {
      const result = await this.googleCalendar.syncEvent(tenantId, appt);
      if (result.googleEventId) {
        await this.repo.update(appt.id, {
          googleEventId: result.googleEventId,
        });
        synced++;
      } else if (result.error && errors.length < 10) {
        errors.push(`${appt.title} (${appt.id}): ${result.error}`);
      }
    }

    const failed = appointments.length - synced;
    if (failed > 0) {
      this.logger.warn(
        `syncAllToGoogle tenant=${tenantId}: synced=${synced} failed=${failed}`,
      );
    }

    return {
      synced,
      failed,
      total: appointments.length,
      errors,
    };
  }

  /** Import events from Google Calendar as appointments (skip already imported). */
  async importFromGoogle(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<{ imported: number }> {
    const events = await this.googleCalendar.listEvents(tenantId, startDate, endDate);
    let imported = 0;

    for (const event of events) {
      if (!event.summary || event.status === 'cancelled') continue;

      // Skip if already imported
      const existing = await this.repo.findOne({
        where: { tenantId, googleEventId: event.id },
      });
      if (existing) continue;

      const startAt = event.start.dateTime
        ? new Date(event.start.dateTime)
        : new Date(event.start.date + 'T00:00:00');
      const endAt = event.end.dateTime
        ? new Date(event.end.dateTime)
        : new Date(event.end.date + 'T23:59:59');

      const appt = this.repo.create({
        tenantId,
        title: event.summary,
        description: event.description ?? null,
        location: event.location ?? null,
        startAt,
        endAt,
        type: 'meeting',
        status: 'scheduled',
        googleEventId: event.id,
      });

      await this.repo.save(appt);
      imported++;
    }

    return { imported };
  }
}
