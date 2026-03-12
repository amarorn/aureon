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

export type AppointmentType = 'meeting' | 'call' | 'demo' | 'follow_up' | 'other';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_at', type: 'timestamp' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamp' })
  endAt: Date;

  @Column({
    type: 'varchar',
    default: 'meeting',
  })
  type: AppointmentType;

  @Column({
    type: 'varchar',
    default: 'scheduled',
  })
  status: AppointmentStatus;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'google_event_id', type: 'varchar', nullable: true })
  googleEventId: string | null;

  @ManyToOne(() => Contact, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
