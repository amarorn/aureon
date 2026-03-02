import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Pipeline } from './pipeline.entity';
import { Opportunity } from './opportunity.entity';

@Entity('stages')
export class Stage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'pipeline_id' })
  pipelineId: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ default: '#6b7280' })
  color: string;

  @Column({ name: 'is_won', default: false })
  isWon: boolean;

  @ManyToOne(() => Pipeline, (pipeline) => pipeline.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: Pipeline;

  @OneToMany(() => Opportunity, (opp) => opp.stage)
  opportunities: Opportunity[];

  @CreateDateColumn()
  createdAt: Date;
}
