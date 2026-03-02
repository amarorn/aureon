import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Contact } from './contact.entity';
import { Opportunity } from './opportunity.entity';

export enum InteractionType {
  NOTE = 'note',
  EMAIL = 'email',
  CALL = 'call',
  MEETING = 'meeting',
  TASK = 'task',
}

@Entity('interactions')
export class Interaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'contact_id' })
  contactId: string;

  @Column({ name: 'opportunity_id', nullable: true })
  opportunityId: string | null;

  @Column({
    type: 'enum',
    enum: InteractionType,
    default: InteractionType.NOTE,
  })
  type: InteractionType;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => Contact, (contact) => contact.interactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @ManyToOne(() => Opportunity, (opp) => opp.interactions, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity: Opportunity | null;

  @CreateDateColumn()
  createdAt: Date;
}
