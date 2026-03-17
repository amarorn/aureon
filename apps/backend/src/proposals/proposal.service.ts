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
import { Contact } from '../crm/entities/contact.entity';
import { Opportunity } from '../crm/entities/opportunity.entity';
import { EmailDeliveryService } from '../integrations/email-delivery.service';

@Injectable()
export class ProposalService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(ProposalItem)
    private readonly itemRepo: Repository<ProposalItem>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    private readonly proposalSignature: ProposalSignatureService,
    private readonly emailDelivery: EmailDeliveryService,
  ) {}

  private calcTotal(items: ProposalItemDto[]): number {
    return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  }

  private normalizeString(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private parseValidUntil(value?: string | null): Date | null {
    const normalized = this.normalizeString(value);
    if (!normalized) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return new Date(`${normalized}T12:00:00.000Z`);
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('validUntil inválido');
    }
    return parsed;
  }

  private async findContactOrFail(
    tenantId: string,
    contactId: string,
  ): Promise<Contact> {
    const contact = await this.contactRepo.findOne({ where: { id: contactId, tenantId } });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  private async findOpportunityOrFail(
    tenantId: string,
    opportunityId: string,
  ): Promise<Opportunity> {
    const opportunity = await this.opportunityRepo.findOne({
      where: { id: opportunityId, tenantId },
      relations: ['contact'],
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    return opportunity;
  }

  private async resolveReferences(
    tenantId: string,
    dto: Pick<CreateProposalDto, 'contactId' | 'opportunityId'>,
  ): Promise<{ contactId: string | null; opportunityId: string | null }> {
    const contactId = this.normalizeString(dto.contactId);
    const opportunityId = this.normalizeString(dto.opportunityId);

    const [contact, opportunity] = await Promise.all([
      contactId ? this.findContactOrFail(tenantId, contactId) : Promise.resolve(null),
      opportunityId
        ? this.findOpportunityOrFail(tenantId, opportunityId)
        : Promise.resolve(null),
    ]);

    if (contact && opportunity && opportunity.contactId !== contact.id) {
      throw new BadRequestException(
        'Opportunity does not belong to the selected contact',
      );
    }

    return {
      contactId: contact?.id ?? opportunity?.contactId ?? null,
      opportunityId: opportunity?.id ?? null,
    };
  }

  private getProposalContact(proposal: Proposal): Contact | null {
    return proposal.contact ?? proposal.opportunity?.contact ?? null;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private formatDateOnly(value: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(value);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private buildProposalEmailText(proposal: Proposal): string {
    const contact = this.getProposalContact(proposal);
    const lines = [
      `Proposta: ${proposal.title}`,
      contact?.name ? `Cliente: ${contact.name}` : null,
      proposal.validUntil
        ? `Validade: ${this.formatDateOnly(proposal.validUntil)}`
        : null,
      '',
      'Itens:',
      ...(proposal.items?.length
        ? proposal.items.map(
            (item, index) =>
              `${index + 1}. ${item.description} | ${item.quantity} x ${this.formatCurrency(
                Number(item.unitPrice),
              )} = ${this.formatCurrency(Number(item.total))}`,
          )
        : ['Nenhum item informado']),
      '',
      `Total: ${this.formatCurrency(Number(proposal.total))}`,
      proposal.meetingUrl ? `Reuniao: ${proposal.meetingUrl}` : null,
      proposal.signatureUrl ? `Assinatura: ${proposal.signatureUrl}` : null,
      proposal.notes ? '' : null,
      proposal.notes ? `Observacoes:\n${proposal.notes}` : null,
    ];

    return lines.filter((line): line is string => Boolean(line)).join('\n');
  }

  private buildProposalEmailHtml(proposal: Proposal): string {
    const contact = this.getProposalContact(proposal);
    const itemsHtml = proposal.items?.length
      ? proposal.items
          .map(
            (item) => `
              <tr>
                <td style="padding:8px;border:1px solid #d7d7d7;">${this.escapeHtml(
                  item.description,
                )}</td>
                <td style="padding:8px;border:1px solid #d7d7d7;text-align:center;">${
                  item.quantity
                }</td>
                <td style="padding:8px;border:1px solid #d7d7d7;text-align:right;">${this.escapeHtml(
                  this.formatCurrency(Number(item.unitPrice)),
                )}</td>
                <td style="padding:8px;border:1px solid #d7d7d7;text-align:right;">${this.escapeHtml(
                  this.formatCurrency(Number(item.total)),
                )}</td>
              </tr>`,
          )
          .join('')
      : `
        <tr>
          <td colspan="4" style="padding:12px;border:1px solid #d7d7d7;text-align:center;color:#6b7280;">
            Nenhum item informado
          </td>
        </tr>`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="font-family:Arial,sans-serif;color:#111827;">
    <h1>${this.escapeHtml(proposal.title)}</h1>
    ${
      contact?.name
        ? `<p><strong>Cliente:</strong> ${this.escapeHtml(contact.name)}</p>`
        : ''
    }
    ${
      proposal.validUntil
        ? `<p><strong>Validade:</strong> ${this.escapeHtml(
            this.formatDateOnly(proposal.validUntil),
          )}</p>`
        : ''
    }
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #d7d7d7;text-align:left;">Item</th>
          <th style="padding:8px;border:1px solid #d7d7d7;">Qtd</th>
          <th style="padding:8px;border:1px solid #d7d7d7;text-align:right;">Unitario</th>
          <th style="padding:8px;border:1px solid #d7d7d7;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <p style="margin-top:16px;"><strong>Total:</strong> ${this.escapeHtml(
      this.formatCurrency(Number(proposal.total)),
    )}</p>
    ${
      proposal.meetingUrl
        ? `<p><strong>Link da reuniao:</strong> <a href="${this.escapeHtml(
            proposal.meetingUrl,
          )}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(
            proposal.meetingUrl,
          )}</a></p>`
        : ''
    }
    ${
      proposal.signatureUrl
        ? `<p><a href="${this.escapeHtml(
            proposal.signatureUrl,
          )}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 16px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;">Assinar proposta</a></p>`
        : ''
    }
    ${
      proposal.notes
        ? `<p><strong>Observacoes:</strong><br/>${this.escapeHtml(proposal.notes).replace(
            /\n/g,
            '<br/>',
          )}</p>`
        : ''
    }
  </body>
</html>`;
  }

  private async sendProposalEmail(tenantId: string, proposal: Proposal): Promise<void> {
    const contact = this.getProposalContact(proposal);
    const recipient = contact?.email?.trim();
    if (!recipient) {
      throw new BadRequestException(
        'A proposta precisa de um contato com email para envio',
      );
    }

    await this.emailDelivery.send(tenantId, {
      to: recipient,
      subject: `Proposta: ${proposal.title}`,
      html: this.buildProposalEmailHtml(proposal),
      text: this.buildProposalEmailText(proposal),
    });
  }

  private ensureStatusTransition(
    currentStatus: Proposal['status'],
    nextStatus: UpdateProposalStatusDto['status'],
  ): void {
    if (nextStatus === 'sent' && !['draft', 'expired'].includes(currentStatus)) {
      throw new BadRequestException('Only draft or expired proposals can be sent');
    }

    if (nextStatus === 'viewed' && currentStatus !== 'sent') {
      throw new BadRequestException('Only sent proposals can be marked as viewed');
    }

    if (
      (nextStatus === 'accepted' || nextStatus === 'declined') &&
      !['sent', 'viewed'].includes(currentStatus)
    ) {
      throw new BadRequestException(
        'Only sent or viewed proposals can be accepted or declined',
      );
    }

    if (nextStatus === 'expired' && ['accepted', 'declined'].includes(currentStatus)) {
      throw new BadRequestException('Responded proposals cannot be marked as expired');
    }
  }

  async create(tenantId: string, dto: CreateProposalDto) {
    const items = dto.items ?? [];
    const total = this.calcTotal(items);
    const refs = await this.resolveReferences(tenantId, dto);

    const proposal = this.proposalRepo.create({
      tenantId,
      title: dto.title.trim(),
      contactId: refs.contactId,
      opportunityId: refs.opportunityId,
      notes: this.normalizeString(dto.notes),
      validUntil: this.parseValidUntil(dto.validUntil),
      status: 'draft',
      total,
      meetingUrl: this.normalizeString(dto.meetingUrl),
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
      relations: ['contact', 'items', 'opportunity', 'opportunity.contact'],
    });
    if (!p) throw new NotFoundException('Proposal not found');
    p.items?.sort((a, b) => a.sort - b.sort);
    return p;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateProposalStatusDto) {
    const proposal = await this.findOne(tenantId, id);
    this.ensureStatusTransition(proposal.status, dto.status);
    const now = new Date();
    const extra: Partial<Proposal> = { status: dto.status };
    if (dto.status === 'sent') {
      await this.sendProposalEmail(tenantId, proposal);
      extra.sentAt = now;
    }
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
      opportunityId: original.opportunityId ?? undefined,
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
    const contact = this.getProposalContact(proposal);
    if (!contact?.email?.trim()) {
      throw new BadRequestException(
        'A proposta precisa de um contato com email para assinatura',
      );
    }
    if (!contact?.name?.trim()) {
      throw new BadRequestException(
        'A proposta precisa de um contato com nome para assinatura',
      );
    }
    if (proposal.status === 'accepted' || proposal.signatureStatus === 'signed') {
      throw new BadRequestException('A proposta ja foi assinada');
    }
    if (
      proposal.signatureRequestId &&
      (proposal.signatureStatus === 'sent' || proposal.signatureStatus === 'viewed')
    ) {
      throw new BadRequestException(
        'A proposta ja possui uma assinatura em andamento',
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
        signerName: contact.name,
        signerEmail: contact.email,
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
      signatureCompletedAt: null,
      status: 'sent',
      sentAt: new Date(),
      viewedAt: null,
      respondedAt: null,
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
