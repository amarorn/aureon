import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Contact } from './contact.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ default: '#6b7280' })
  color: string;

  @ManyToMany(() => Contact, (contact) => contact.tags)
  contacts: Contact[];

  @CreateDateColumn()
  createdAt: Date;
}
