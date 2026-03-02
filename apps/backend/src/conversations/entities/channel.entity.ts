import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum ChannelType {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  INSTAGRAM = 'instagram',
  TELEGRAM = 'telegram',
  OTHER = 'other',
}

@Entity('channels')
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: ChannelType,
  })
  type: ChannelType;

  @Column()
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, unknown> | null;

  @OneToMany(() => Conversation, (conv) => conv.channel)
  conversations: Conversation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
