import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { Tag } from './tag.entity';
import { Opportunity } from './opportunity.entity';
import { Interaction } from './interaction.entity';
import { Task } from './task.entity';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  company: string;

  @Column({ type: 'varchar', nullable: true })
  source: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToMany(() => Tag, (tag) => tag.contacts, { cascade: true })
  @JoinTable({
    name: 'contact_tags',
    joinColumn: { name: 'contact_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @OneToMany(() => Opportunity, (opp) => opp.contact)
  opportunities: Opportunity[];

  @OneToMany(() => Interaction, (interaction) => interaction.contact)
  interactions: Interaction[];

  @OneToMany(() => Task, (task) => task.contact)
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
