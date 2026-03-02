import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Contact } from '../../crm/entities/contact.entity';

export enum QueueItemStatus {
  PENDING = 'pending',
  CALLING = 'calling',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

@Entity('call_queue_items')
export class CallQueueItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'contact_id' })
  contactId: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({
    type: 'enum',
    enum: QueueItemStatus,
    default: QueueItemStatus.PENDING,
  })
  status: QueueItemStatus;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @CreateDateColumn()
  createdAt: Date;
}
