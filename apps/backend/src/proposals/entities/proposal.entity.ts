import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Contact } from '../../crm/entities/contact.entity';
import { ProposalItem } from './proposal-item.entity';

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired';

@Entity('proposals')
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @Column({ name: 'opportunity_id', type: 'uuid', nullable: true })
  opportunityId: string | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', default: 'draft' })
  status: ProposalStatus;

  @Column({ name: 'valid_until', type: 'timestamp', nullable: true })
  validUntil: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'viewed_at', type: 'timestamp', nullable: true })
  viewedAt: Date | null;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  respondedAt: Date | null;

  @ManyToOne(() => Contact, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @OneToMany(() => ProposalItem, (item) => item.proposal, { cascade: true, eager: true })
  items: ProposalItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
