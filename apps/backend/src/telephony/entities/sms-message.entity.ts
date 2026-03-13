import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Contact } from '../../crm/entities/contact.entity';

@Entity('sms_messages')
export class SmsMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column({ name: 'phone_number', length: 32 })
  phoneNumber: string;

  @Column({ length: 16 })
  direction: string; // 'inbound' | 'outbound'

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'external_sid', type: 'varchar', length: 64, nullable: true })
  externalSid: string | null;

  @Column({ length: 32, default: 'delivered' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Contact, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;
}
