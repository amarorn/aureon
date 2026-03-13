import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Opportunity } from '../../crm/entities/opportunity.entity';
import { Contact } from '../../crm/entities/contact.entity';

export type PaymentProvider = 'asaas' | 'mercadopago' | 'stripe';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'opportunity_id' })
  opportunityId: string;

  @Column({ name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column({
    type: 'varchar',
    length: 32,
  })
  provider: PaymentProvider;

  @Column({ name: 'external_id', length: 128 })
  externalId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  value: number;

  @Column({ length: 3, default: 'BRL' })
  currency: string;

  @Column({ length: 32, default: 'pending' })
  status: string;

  @Column({ name: 'payment_url', type: 'text', nullable: true })
  paymentUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Opportunity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity: Opportunity;

  @ManyToOne(() => Contact, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;
}
