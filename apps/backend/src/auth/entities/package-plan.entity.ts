import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('package_plans')
export class PackagePlan {
  @PrimaryColumn({ type: 'varchar' })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'feature_codes', type: 'jsonb', default: [] })
  featureCodes: string[];

  @UpdateDateColumn()
  updatedAt: Date;
}
