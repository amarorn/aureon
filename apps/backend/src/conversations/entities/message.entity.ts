import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { MessageAttachment } from './message-attachment.entity';

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageDirection,
  })
  direction: MessageDirection;

  @Column({ type: 'uuid', name: 'template_id', nullable: true })
  templateId: string | null;

  /** ID da mensagem no provedor externo (ex: Gmail messageId, Outlook id) — evita duplicatas no sync */
  @Column({ name: 'external_id', type: 'varchar', nullable: true })
  externalId: string | null;

  /** Metadados específicos do canal (subject, from, to, cc, replyTo, etc.) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @ManyToOne(() => Conversation, (conv) => conv.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @OneToMany(() => MessageAttachment, (att) => att.message, { cascade: true })
  attachments: MessageAttachment[];

  @CreateDateColumn()
  createdAt: Date;
}
