import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal } from './entities/proposal.entity';
import { ProposalItem } from './entities/proposal-item.entity';
import {
  CreateProposalDto,
  ProposalItemDto,
  SendProposalSignatureDto,
  UpdateProposalStatusDto,
} from './dto/create-proposal.dto';
import { ProposalSignatureService } from '../integrations/proposal-signature.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';

@Injectable()
export class ProposalService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(ProposalItem)
    private readonly itemRepo: Repository<ProposalItem>,
    private readonly proposalSignature: ProposalSignatureService,
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
      signatureProvider: null,
      signatureStatus: null,
      signatureRequestId: null,
      signatureUrl: null,
      signatureSentAt: null,
      signatureCompletedAt: null,
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

  async sendForSignature(
    tenantId: string,
    id: string,
    dto: SendProposalSignatureDto,
  ) {
    const proposal = await this.findOne(tenantId, id);
    if (!proposal.contact?.email?.trim()) {
      throw new BadRequestException(
        'A proposta precisa de um contato com email para assinatura',
      );
    }
    if (!proposal.contact?.name?.trim()) {
      throw new BadRequestException(
        'A proposta precisa de um contato com nome para assinatura',
      );
    }

    const result = await this.proposalSignature.sendProposalForSignature(
      tenantId,
      {
        proposalId: proposal.id,
        title: proposal.title,
        notes: proposal.notes,
        total: Number(proposal.total),
        validUntil: proposal.validUntil,
        signerName: proposal.contact.name,
        signerEmail: proposal.contact.email,
        items: proposal.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
      },
      dto.provider as IntegrationProvider.CLICKSIGN | IntegrationProvider.DOCUSIGN | undefined,
    );

    await this.proposalRepo.update(id, {
      signatureProvider: result.provider,
      signatureStatus: result.status,
      signatureRequestId: result.requestId,
      signatureUrl: result.signatureUrl,
      signatureSentAt: new Date(),
      status: proposal.status === 'draft' ? 'sent' : proposal.status,
      sentAt: proposal.sentAt ?? new Date(),
    });

    return this.findOne(tenantId, id);
  }

  async refreshSignatureStatus(tenantId: string, id: string) {
    const proposal = await this.findOne(tenantId, id);
    if (!proposal.signatureProvider || !proposal.signatureRequestId) {
      throw new BadRequestException('A proposta ainda não foi enviada para assinatura');
    }

    const result = await this.proposalSignature.refreshSignatureStatus(
      tenantId,
      proposal.signatureProvider as IntegrationProvider.CLICKSIGN | IntegrationProvider.DOCUSIGN,
      proposal.signatureRequestId,
      proposal.signatureUrl,
    );

    const update: Partial<Proposal> = {
      signatureStatus: result.status,
      signatureUrl: result.signatureUrl,
    };

    if (result.status === 'signed') {
      update.signatureCompletedAt = new Date();
      update.status = 'accepted';
      update.respondedAt = proposal.respondedAt ?? new Date();
    } else if (result.status === 'viewed' && proposal.status === 'sent') {
      update.status = 'viewed';
      update.viewedAt = proposal.viewedAt ?? new Date();
    } else if (result.status === 'declined') {
      update.status = 'declined';
      update.respondedAt = proposal.respondedAt ?? new Date();
    }

    await this.proposalRepo.update(id, update);
    return this.findOne(tenantId, id);
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
