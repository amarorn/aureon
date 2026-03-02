import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly repo: Repository<Appointment>,
  ) {}

  create(tenantId: string, dto: CreateAppointmentDto) {
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
    return this.repo.save(appointment);
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
    return this.repo.save(appointment);
  }

  async remove(tenantId: string, id: string) {
    const appointment = await this.findOne(tenantId, id);
    await this.repo.remove(appointment);
    return { ok: true };
  }
}
