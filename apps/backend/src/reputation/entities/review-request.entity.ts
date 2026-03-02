import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Contact } from '../../crm/entities/contact.entity';

export type ReviewPlatform = 'google' | 'facebook' | 'trustpilot' | 'custom';
export type ReviewChannel = 'whatsapp' | 'email' | 'sms';
export type ReviewStatus = 'pending' | 'sent' | 'opened' | 'completed' | 'declined';

@Entity('review_requests')
export class ReviewRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column({ type: 'varchar', default: 'google' })
  platform: ReviewPlatform;

  @Column({ type: 'varchar', default: 'whatsapp' })
  channel: ReviewChannel;

  @Column({ type: 'varchar', default: 'pending' })
  status: ReviewStatus;

  @Column({ name: 'review_url', type: 'varchar', nullable: true })
  reviewUrl: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => Contact, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
