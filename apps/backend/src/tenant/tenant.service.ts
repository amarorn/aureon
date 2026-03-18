import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepo.find({ where: { active: true } });
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { slug, active: true } });
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { id } });
  }

  /**
   * Mescla oauthConfig (credenciais por cliente). Passar só as chaves a alterar.
   */
  async updateOAuthConfig(
    tenantId: string,
    patch: Record<string, unknown>,
  ): Promise<Tenant | null> {
    const tenant = await this.findById(tenantId);
    if (!tenant) return null;
    const current = (tenant.oauthConfig as Record<string, unknown>) ?? {};
    tenant.oauthConfig = this.mergeOAuthConfig(current, patch);
    return this.tenantRepo.save(tenant);
  }

  private mergeOAuthConfig(
    current: Record<string, unknown>,
    patch: Record<string, unknown>,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = { ...current };
    for (const key of Object.keys(patch)) {
      const next = patch[key];
      const prev = current[key];
      if (
        next !== null &&
        typeof next === 'object' &&
        !Array.isArray(next) &&
        prev !== null &&
        typeof prev === 'object' &&
        !Array.isArray(prev)
      ) {
        out[key] = { ...(prev as Record<string, unknown>), ...(next as Record<string, unknown>) };
      } else {
        out[key] = next;
      }
    }
    return out;
  }
}
