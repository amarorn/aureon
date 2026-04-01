import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantFeatureFlag } from './entities/tenant-feature-flag.entity';
import { PackagePlan } from './entities/package-plan.entity';
import { Tenant } from '../tenant/tenant.entity';
import {
  FeatureFlagSource,
  UserRole,
} from './auth.types';
import {
  featuresForPackage,
  isValidPackageCode,
  type PackageCode,
} from './package-catalog';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(TenantFeatureFlag)
    private readonly flagRepo: Repository<TenantFeatureFlag>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(PackagePlan)
    private readonly packagePlanRepo: Repository<PackagePlan>,
  ) {}

  async getEffectiveFeatureCodes(tenantId: string): Promise<Set<string>> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const set = new Set<string>();
    const pkgCode = tenant?.currentPackageCode ?? null;
    if (pkgCode) {
      const planRow = await this.packagePlanRepo.findOne({
        where: { code: pkgCode },
      });
      if (planRow?.featureCodes?.length) {
        for (const f of planRow.featureCodes) {
          set.add(f);
        }
      } else if (isValidPackageCode(pkgCode)) {
        for (const f of featuresForPackage(pkgCode as PackageCode)) {
          set.add(f);
        }
      }
    }
    const overrides = await this.flagRepo.find({ where: { tenantId } });
    for (const row of overrides) {
      if (row.source === FeatureFlagSource.MANUAL_OVERRIDE) {
        if (row.enabled) set.add(row.featureCode);
        else set.delete(row.featureCode);
      }
    }
    return set;
  }

  async tenantHasFeature(tenantId: string, featureCode: string): Promise<boolean> {
    const s = await this.getEffectiveFeatureCodes(tenantId);
    return s.has(featureCode);
  }

  shouldEnforcePackage(isPlatformUser: boolean, role: UserRole): boolean {
    if (isPlatformUser) return false;
    if (role === UserRole.PLATFORM_ADMIN || role === UserRole.PLATFORM_SUPPORT) {
      return false;
    }
    return true;
  }
}
