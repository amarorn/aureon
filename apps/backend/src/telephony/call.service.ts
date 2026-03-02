import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call, CallStatus } from './entities/call.entity';
import { CreateCallDto } from './dto/create-call.dto';

@Injectable()
export class CallService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepo: Repository<Call>,
  ) {}

  async create(tenantId: string, dto: CreateCallDto): Promise<Call> {
    const call = this.callRepo.create({
      ...dto,
      tenantId,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
      endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
    });
    return this.callRepo.save(call);
  }

  async findByContact(tenantId: string, contactId: string): Promise<Call[]> {
    return this.callRepo.find({
      where: { tenantId, contactId },
      relations: ['contact'],
      order: { startedAt: 'DESC' },
    });
  }

  async findAll(tenantId: string, contactId?: string): Promise<Call[]> {
    const where: Record<string, unknown> = { tenantId };
    if (contactId) where.contactId = contactId;
    return this.callRepo.find({
      where,
      relations: ['contact'],
      order: { startedAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Call> {
    const call = await this.callRepo.findOne({
      where: { id, tenantId },
      relations: ['contact'],
    });
    if (!call) throw new NotFoundException('Call not found');
    return call;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.callRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException('Call not found');
  }
}
