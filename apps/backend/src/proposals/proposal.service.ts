import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal } from './entities/proposal.entity';
import { ProposalItem } from './entities/proposal-item.entity';
import {
  CreateProposalDto,
  ProposalItemDto,
  UpdateProposalStatusDto,
} from './dto/create-proposal.dto';

@Injectable()
export class ProposalService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(ProposalItem)
    private readonly itemRepo: Repository<ProposalItem>,
  ) {}

  private calcTotal(items: ProposalItemDto[]): number {
    return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  }

  async create(tenantId: string, dto: CreateProposalDto) {
    const items = dto.items ?? [];
    const total = this.calcTotal(items);

    const proposal = this.proposalRepo.create({
      tenantId,
      title: dto.title,
      contactId: dto.contactId ?? null,
      opportunityId: dto.opportunityId ?? null,
      notes: dto.notes ?? null,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      status: 'draft',
      total,
      meetingUrl: dto.meetingUrl ?? null,
    });

    const saved = await this.proposalRepo.save(proposal);

    if (items.length) {
      const proposalItems = items.map((item, idx) =>
        this.itemRepo.create({
          proposalId: saved.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          sort: idx,
        }),
      );
      await this.itemRepo.save(proposalItems);
    }

    return this.findOne(tenantId, saved.id);
  }

  findAll(tenantId: string) {
    return this.proposalRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      relations: ['contact', 'items'],
    });
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.proposalRepo.findOne({
      where: { id, tenantId },
      relations: ['contact', 'items'],
    });
    if (!p) throw new NotFoundException('Proposal not found');
    p.items?.sort((a, b) => a.sort - b.sort);
    return p;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateProposalStatusDto) {
    await this.findOne(tenantId, id);
    const now = new Date();
    const extra: Partial<Proposal> = { status: dto.status };
    if (dto.status === 'sent') extra.sentAt = now;
    if (dto.status === 'viewed') extra.viewedAt = now;
    if (dto.status === 'accepted' || dto.status === 'declined') extra.respondedAt = now;
    await this.proposalRepo.update(id, extra);
    return this.findOne(tenantId, id);
  }

  async updateItems(tenantId: string, id: string, items: ProposalItemDto[]) {
    await this.findOne(tenantId, id);
    await this.itemRepo.delete({ proposalId: id });
    if (items.length) {
      const newItems = items.map((item, idx) =>
        this.itemRepo.create({
          proposalId: id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          sort: idx,
        }),
      );
      await this.itemRepo.save(newItems);
    }
    const total = this.calcTotal(items);
    await this.proposalRepo.update(id, { total });
    return this.findOne(tenantId, id);
  }

  async duplicate(tenantId: string, id: string) {
    const original = await this.findOne(tenantId, id);
    return this.create(tenantId, {
      title: `${original.title} (cópia)`,
      contactId: original.contactId ?? undefined,
      notes: original.notes ?? undefined,
      meetingUrl: original.meetingUrl ?? undefined,
      validUntil: original.validUntil?.toISOString(),
      items: original.items?.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
    });
  }

  async remove(tenantId: string, id: string) {
    const p = await this.findOne(tenantId, id);
    await this.proposalRepo.remove(p);
    return { ok: true };
  }

  async getStats(tenantId: string) {
    const all = await this.proposalRepo.find({ where: { tenantId } });
    const accepted = all.filter((p) => p.status === 'accepted');
    return {
      total: all.length,
      draft: all.filter((p) => p.status === 'draft').length,
      sent: all.filter((p) => ['sent', 'viewed'].includes(p.status)).length,
      accepted: accepted.length,
      declined: all.filter((p) => p.status === 'declined').length,
      totalValue: all.reduce((s, p) => s + Number(p.total), 0),
      acceptedValue: accepted.reduce((s, p) => s + Number(p.total), 0),
    };
  }
}
