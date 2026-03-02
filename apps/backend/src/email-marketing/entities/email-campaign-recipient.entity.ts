import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EmailCampaign } from './email-campaign.entity';

export type RecipientStatus = 'pending' | 'sent' | 'failed' | 'bounced' | 'unsubscribed';

@Entity('email_campaign_recipients')
export class EmailCampaignRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id' })
  campaignId: string;

  @Column({ type: 'uuid', name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column()
  email: string;

  @Column({ type: 'varchar', name: 'contact_name', nullable: true })
  contactName: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: RecipientStatus;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'opened_at', type: 'timestamp', nullable: true })
  openedAt: Date | null;

  @ManyToOne(() => EmailCampaign, (c) => c.recipients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: EmailCampaign;

  @CreateDateColumn()
  createdAt: Date;
}
