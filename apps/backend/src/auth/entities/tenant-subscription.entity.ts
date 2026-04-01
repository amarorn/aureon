import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/tenant.entity';
import { User } from './user.entity';
import { SubscriptionStatus } from '../auth.types';

@Entity('tenant_subscriptions')
export class TenantSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar' })
  tenantId: string;

  @Column({ name: 'package_code' })
  packageCode: string;

  @Column({ type: 'varchar' })
  status: SubscriptionStatus;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'ends_at', type: 'timestamp', nullable: true })
  endsAt: Date | null;

  @Column({ name: 'created_by_user_id', type: 'varchar', nullable: true })
  createdByUserId: string | null;

  @Column({ name: 'updated_by_user_id', type: 'varchar', nullable: true })
  updatedByUserId: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by_user_id' })
  updatedByUser: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
