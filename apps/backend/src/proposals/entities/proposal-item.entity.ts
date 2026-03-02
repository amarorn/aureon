import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Proposal } from './proposal.entity';

@Entity('proposal_items')
export class ProposalItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proposal_id' })
  proposalId: string;

  @Column()
  description: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @ManyToOne(() => Proposal, (p) => p.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proposal_id' })
  proposal: Proposal;
}
