import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/tenant.entity';
import { User } from './user.entity';
import { AccessRequestStatus } from '../auth.types';

@Entity('tenant_access_requests')
export class TenantAccessRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar' })
  tenantId: string;

  @Column({ name: 'requested_package_code' })
  requestedPackageCode: string;

  @Column({ name: 'contact_name' })
  contactName: string;

  @Column({ name: 'contact_email' })
  contactEmail: string;

  @Column({ name: 'contact_phone', type: 'varchar' })
  contactPhone: string;

  @Column({ name: 'company_name' })
  companyName: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar' })
  status: AccessRequestStatus;

  @Column({ name: 'reviewed_by_user_id', type: 'varchar', nullable: true })
  reviewedByUserId: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedByUser: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
