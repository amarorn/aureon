import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackagePlan } from './entities/package-plan.entity';
import {
  featuresForPackage,
  isValidPackageCode,
  PACKAGE_CODES,
} from './package-catalog';

@Injectable()
export class PackagePlansService {
  constructor(
    @InjectRepository(PackagePlan)
    private readonly packagePlanRepo: Repository<PackagePlan>,
  ) {}

  async ensureDefaultPlansSeeded(): Promise<void> {
    const names: Record<string, string> = {
      starter: 'Starter',
      growth: 'Growth',
      scale: 'Scale',
    };
    for (const code of PACKAGE_CODES) {
      const exists = await this.packagePlanRepo.findOne({ where: { code } });
      if (!exists) {
        await this.packagePlanRepo.save(
          this.packagePlanRepo.create({
            code,
            name: names[code] ?? code,
            featureCodes: featuresForPackage(code),
          }),
        );
      }
    }
  }

  async listPlansOrdered(): Promise<PackagePlan[]> {
    await this.ensureDefaultPlansSeeded();
    return this.packagePlanRepo.find({ order: { code: 'ASC' } });
  }

  async isAssignablePackageCode(code: string): Promise<boolean> {
    const normalized = code.trim().toLowerCase();
    if (!normalized) return false;
    const inDb = await this.packagePlanRepo.exist({
      where: { code: normalized },
    });
    if (inDb) return true;
    return isValidPackageCode(normalized);
  }
}
