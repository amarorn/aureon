import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'varchar', default: 'customer' })
  type: string;

  @Column({ name: 'approval_status', type: 'varchar', default: 'approved' })
  approvalStatus: string;

  @Column({ name: 'operational_status', type: 'varchar', default: 'active' })
  operationalStatus: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by_user_id', type: 'varchar', nullable: true })
  approvedByUserId: string | null;

  @Column({ name: 'current_package_code', type: 'varchar', nullable: true })
  currentPackageCode: string | null;

  @Column({ type: 'jsonb', nullable: true })
  oauthConfig: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
