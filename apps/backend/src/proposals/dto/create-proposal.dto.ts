export class ProposalItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
}

export class CreateProposalDto {
  title: string;
  contactId?: string;
  opportunityId?: string;
  notes?: string;
  validUntil?: string;
  items?: ProposalItemDto[];
}

export class UpdateProposalStatusDto {
  status: 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
}
