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
import { FeatureFlagSource } from '../auth.types';

@Entity('tenant_feature_flags')
export class TenantFeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar' })
  tenantId: string;

  @Column({ name: 'feature_code', type: 'varchar' })
  featureCode: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'varchar' })
  source: FeatureFlagSource;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
