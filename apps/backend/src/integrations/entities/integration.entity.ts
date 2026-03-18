import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum IntegrationProvider {
  GOOGLE_ANALYTICS = 'google_analytics',
  GOOGLE_BUSINESS_PROFILE = 'google_business_profile',
  FACEBOOK_ADS = 'facebook_ads',
  GOOGLE_ADS = 'google_ads',
  GOOGLE_CALENDAR = 'google_calendar',
  WHATSAPP = 'whatsapp',
  SLACK = 'slack',
  MICROSOFT_TEAMS = 'microsoft_teams',
  ASAAS = 'asaas',
  MERCADOPAGO = 'mercadopago',
  STRIPE = 'stripe',
  LINKEDIN = 'linkedin',
  RD_STATION = 'rd_station',
  ZOOM = 'zoom',
  SENDGRID = 'sendgrid',
  AMAZON_SES = 'amazon_ses',
  CLICKSIGN = 'clicksign',
  DOCUSIGN = 'docusign',
  GMAIL = 'gmail',
  OUTLOOK = 'outlook',
  INSTAGRAM = 'instagram',
  TIKTOK_ADS = 'tiktok_ads',
  TWILIO = 'twilio',
  CALENDLY = 'calendly',
  CAL_COM = 'cal_com',
  TELEGRAM = 'telegram',
}

@Index(['tenantId', 'provider'], { unique: true })
@Entity('integrations')
export class Integration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: IntegrationProvider,
  })
  provider: IntegrationProvider;

  @Column({ default: 'disconnected' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  credentials: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
