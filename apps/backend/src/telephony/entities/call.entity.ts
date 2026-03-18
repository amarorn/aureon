import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Contact } from '../../crm/entities/contact.entity';

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum CallStatus {
  COMPLETED = 'completed',
  MISSED = 'missed',
  NO_ANSWER = 'no_answer',
  BUSY = 'busy',
  IN_PROGRESS = 'in_progress',
}

@Index(['tenantId'])
@Entity('calls')
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'contact_id' })
  contactId: string;

  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: CallDirection,
    default: CallDirection.OUTBOUND,
  })
  direction: CallDirection;

  @Column({
    type: 'enum',
    enum: CallStatus,
    default: CallStatus.COMPLETED,
  })
  status: CallStatus;

  @Column({ type: 'int', nullable: true })
  durationSeconds: number | null;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'external_sid', type: 'varchar', length: 64, nullable: true })
  externalSid: string | null;

  @Column({ name: 'recording_url', type: 'text', nullable: true })
  recordingUrl: string | null;

  @Column({ name: 'transcription_text', type: 'text', nullable: true })
  transcriptionText: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @CreateDateColumn()
  createdAt: Date;
}
