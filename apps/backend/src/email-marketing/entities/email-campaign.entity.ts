import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { EmailCampaignRecipient } from './email-campaign-recipient.entity';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

@Entity('email_campaigns')
export class EmailCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  name: string;

  @Column()
  subject: string;

  @Column({ name: 'body_html', type: 'text' })
  bodyHtml: string;

  @Column({ name: 'from_name', type: 'varchar', nullable: true })
  fromName: string | null;

  @Column({ name: 'from_email', type: 'varchar', nullable: true })
  fromEmail: string | null;

  @Column({ type: 'varchar', default: 'draft' })
  status: CampaignStatus;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'recipient_count', default: 0 })
  recipientCount: number;

  @Column({ name: 'sent_count', default: 0 })
  sentCount: number;

  @Column({ name: 'open_count', default: 0 })
  openCount: number;

  @Column({ name: 'click_count', default: 0 })
  clickCount: number;

  @OneToMany(() => EmailCampaignRecipient, (r) => r.campaign)
  recipients: EmailCampaignRecipient[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
