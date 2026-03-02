import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Contact } from './contact.entity';
import { Pipeline } from './pipeline.entity';
import { Stage } from './stage.entity';
import { Interaction } from './interaction.entity';
import { Task } from './task.entity';

@Entity('opportunities')
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'contact_id' })
  contactId: string;

  @Column({ name: 'pipeline_id' })
  pipelineId: string;

  @Column({ name: 'stage_id' })
  stageId: string;

  @Column()
  title: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  value: number;

  @Column({ name: 'expected_close_date', type: 'date', nullable: true })
  expectedCloseDate: Date | null;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Contact, (contact) => contact.opportunities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @ManyToOne(() => Pipeline, (pipeline) => pipeline.opportunities)
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: Pipeline;

  @ManyToOne(() => Stage, (stage) => stage.opportunities)
  @JoinColumn({ name: 'stage_id' })
  stage: Stage;

  @OneToMany(() => Interaction, (interaction) => interaction.opportunity)
  interactions: Interaction[];

  @OneToMany(() => Task, (task) => task.opportunity)
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
