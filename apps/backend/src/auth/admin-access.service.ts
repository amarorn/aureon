import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TenantAccessRequest } from './entities/tenant-access-request.entity';
import { Tenant } from '../tenant/tenant.entity';
import { User } from './entities/user.entity';
import { AuthSession } from './entities/auth-session.entity';
import { TenantSubscription } from './entities/tenant-subscription.entity';
import { TenantFeatureFlag } from './entities/tenant-feature-flag.entity';
import { PackagePlan } from './entities/package-plan.entity';
import {
  AccessRequestStatus,
  FeatureFlagSource,
  SubscriptionStatus,
  TenantApprovalStatus,
  TenantOperationalStatus,
  UserRole,
  UserStatus,
} from './auth.types';
import { AuditService } from './audit.service';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';
import { RejectAccessRequestDto } from './dto/reject-access-request.dto';
import { isValidPlanSlug } from './package-catalog';
import { isKnownFeatureCode, listFeatureRegistry } from './feature-registry';
import { AdminTenantPackageDto } from './dto/admin-tenant-package.dto';
import { AdminTenantFeaturesDto } from './dto/admin-tenant-features.dto';
import { AdminUpdatePackageDto } from './dto/admin-update-package.dto';
import { AdminCreatePackageDto } from './dto/admin-create-package.dto';
import { AdminUserStatusDto } from './dto/admin-user-status.dto';
import { FeaturesService } from './features.service';
import { PackagePlansService } from './package-plans.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminAccessService {
  constructor(
    @InjectRepository(TenantAccessRequest)
    private readonly accessRepo: Repository<TenantAccessRequest>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuthSession)
    private readonly sessionRepo: Repository<AuthSession>,
    @InjectRepository(TenantSubscription)
    private readonly subRepo: Repository<TenantSubscription>,
    @InjectRepository(TenantFeatureFlag)
    private readonly flagRepo: Repository<TenantFeatureFlag>,
    @InjectRepository(PackagePlan)
    private readonly packagePlanRepo: Repository<PackagePlan>,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
    private readonly packagePlans: PackagePlansService,
  ) {}

  async listUsersForAdmin() {
    const users = await this.userRepo.find({
      relations: ['tenant'],
      order: { createdAt: 'DESC' },
      take: 2000,
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      isPlatformUser: u.isPlatformUser,
      tenantId: u.tenantId,
      tenantName: u.tenant?.name ?? null,
      tenantSlug: u.tenant?.slug ?? null,
      currentPackageCode: u.tenant?.currentPackageCode ?? null,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));
  }

  async setUserStatusAdmin(
    userId: string,
    dto: AdminUserStatusDto,
    actorUserId: string,
  ) {
    if (userId === actorUserId) {
      throw new BadRequestException('Não é possível alterar o próprio status aqui');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.isPlatformUser) {
      throw new ForbiddenException(
        'Contas da equipe Aureon não são geridas nesta lista',
      );
    }
    const next =
      dto.status === 'blocked' ? UserStatus.BLOCKED : UserStatus.ACTIVE;
    user.status = next;
    await this.userRepo.save(user);
    await this.audit.log({
      actorUserId,
      tenantId: user.tenantId,
      action: 'user.status_change',
      entityType: 'user',
      entityId: userId,
      metadata: { status: next },
    });
    return { ok: true };
  }

  async resetUserPasswordAdmin(userId: string, actorUserId: string) {
    if (userId === actorUserId) {
      throw new BadRequestException('Use outro meio para alterar a sua senha');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.isPlatformUser) {
      throw new ForbiddenException(
        'Redefinição por esta tela não se aplica à equipe Aureon',
      );
    }
    const temporaryPassword = randomBytes(14).toString('base64url').slice(0, 20);
    user.passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    await this.userRepo.save(user);
    await this.sessionRepo.delete({ userId: user.id });
    await this.audit.log({
      actorUserId,
      tenantId: user.tenantId,
      action: 'user.password_reset',
      entityType: 'user',
      entityId: userId,
      metadata: {},
    });
    return { ok: true, temporaryPassword };
  }

  async listPackagePlans() {
    return this.packagePlans.listPlansOrdered();
  }

  async createPackagePlan(
    dto: AdminCreatePackageDto,
    actorUserId: string,
  ) {
    const code = dto.code.trim().toLowerCase();
    if (!isValidPlanSlug(code)) {
      throw new BadRequestException(
        'Código do plano inválido (minúsculas, números e hífen; 2–64 caracteres)',
      );
    }
    const exists = await this.packagePlanRepo.findOne({ where: { code } });
    if (exists) {
      throw new ConflictException('Já existe um plano com este código');
    }
    for (const fc of dto.featureCodes) {
      if (!isKnownFeatureCode(fc)) {
        throw new BadRequestException(`Funcionalidade desconhecida: ${fc}`);
      }
    }
    const row = await this.packagePlanRepo.save(
      this.packagePlanRepo.create({
        code,
        name: dto.name.trim(),
        featureCodes: dto.featureCodes,
      }),
    );
    await this.audit.log({
      actorUserId,
      tenantId: null,
      action: 'package_plan.create',
      entityType: 'package_plan',
      entityId: code,
      metadata: { name: row.name, featureCount: dto.featureCodes.length },
    });
    return row;
  }

  async updatePackagePlan(
    code: string,
    dto: AdminUpdatePackageDto,
    actorUserId: string,
  ) {
    const normalized = code.trim().toLowerCase();
    if (!isValidPlanSlug(normalized)) {
      throw new BadRequestException('Código de plano inválido');
    }
    await this.packagePlans.ensureDefaultPlansSeeded();
    for (const fc of dto.featureCodes) {
      if (!isKnownFeatureCode(fc)) {
        throw new BadRequestException(`Funcionalidade desconhecida: ${fc}`);
      }
    }
    const row = await this.packagePlanRepo.findOne({
      where: { code: normalized },
    });
    if (!row) {
      throw new NotFoundException('Plano não encontrado');
    }
    row.name = dto.name.trim();
    row.featureCodes = dto.featureCodes;
    await this.packagePlanRepo.save(row);
    await this.audit.log({
      actorUserId,
      tenantId: null,
      action: 'package_plan.update',
      entityType: 'package_plan',
      entityId: normalized,
      metadata: { name: dto.name, featureCount: dto.featureCodes.length },
    });
    return row;
  }

  featureRegistry() {
    return listFeatureRegistry();
  }

  listPendingAccessRequests() {
    return this.accessRepo.find({
      where: { status: AccessRequestStatus.PENDING },
      relations: ['tenant'],
      order: { createdAt: 'ASC' },
    });
  }

  listAllAccessRequests() {
    return this.accessRepo.find({
      relations: ['tenant'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async getAccessRequest(id: string) {
    const r = await this.accessRepo.findOne({
      where: { id },
      relations: ['tenant'],
    });
    if (!r) throw new NotFoundException('Solicitação não encontrada');
    return r;
  }

  async approve(
    id: string,
    dto: ApproveAccessRequestDto,
    actorUserId: string,
  ) {
    if (!(await this.packagePlans.isAssignablePackageCode(dto.packageCode))) {
      throw new BadRequestException('packageCode inválido ou não cadastrado');
    }
    const pkg = dto.packageCode.trim().toLowerCase();
    const req = await this.getAccessRequest(id);
    if (req.status !== AccessRequestStatus.PENDING) {
      throw new BadRequestException('Solicitação já processada');
    }
    const tenant = await this.tenantRepo.findOne({
      where: { id: req.tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    tenant.approvalStatus = TenantApprovalStatus.APPROVED;
    tenant.operationalStatus = TenantOperationalStatus.ACTIVE;
    tenant.approvedAt = new Date();
    tenant.approvedByUserId = actorUserId;
    tenant.currentPackageCode = pkg;
    tenant.active = true;
    await this.tenantRepo.save(tenant);

    req.status = AccessRequestStatus.APPROVED;
    req.reviewedAt = new Date();
    req.reviewedByUserId = actorUserId;
    req.notes = dto.notes ?? req.notes;
    await this.accessRepo.save(req);

    const owner = await this.userRepo.findOne({
      where: {
        tenantId: tenant.id,
        role: UserRole.TENANT_OWNER,
      },
    });
    if (owner) {
      owner.status = UserStatus.ACTIVE;
      await this.userRepo.save(owner);
    }

    await this.subRepo.save(
      this.subRepo.create({
        tenantId: tenant.id,
        packageCode: pkg,
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date(),
        endsAt: null,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      }),
    );

    if (dto.featureOverrides) {
      for (const [featureCode, enabled] of Object.entries(
        dto.featureOverrides,
      )) {
        await this.flagRepo.save(
          this.flagRepo.create({
            tenantId: tenant.id,
            featureCode,
            enabled,
            source: FeatureFlagSource.MANUAL_OVERRIDE,
          }),
        );
      }
    }

    await this.audit.log({
      actorUserId,
      tenantId: tenant.id,
      action: 'access_request.approve',
      entityType: 'tenant_access_request',
      entityId: req.id,
      metadata: { packageCode: pkg },
    });

    return { ok: true, tenantId: tenant.id };
  }

  async reject(
    id: string,
    dto: RejectAccessRequestDto,
    actorUserId: string,
  ) {
    const req = await this.getAccessRequest(id);
    if (req.status !== AccessRequestStatus.PENDING) {
      throw new BadRequestException('Solicitação já processada');
    }
    const tenant = await this.tenantRepo.findOne({
      where: { id: req.tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    tenant.approvalStatus = TenantApprovalStatus.REJECTED;
    tenant.active = false;
    await this.tenantRepo.save(tenant);

    req.status = AccessRequestStatus.REJECTED;
    req.reviewedAt = new Date();
    req.reviewedByUserId = actorUserId;
    if (dto.notes) req.notes = dto.notes;
    await this.accessRepo.save(req);

    await this.audit.log({
      actorUserId,
      tenantId: tenant.id,
      action: 'access_request.reject',
      entityType: 'tenant_access_request',
      entityId: req.id,
      metadata: {},
    });

    return { ok: true };
  }

  async suspendTenant(tenantId: string, actorUserId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    tenant.operationalStatus = TenantOperationalStatus.SUSPENDED;
    await this.tenantRepo.save(tenant);
    await this.audit.log({
      actorUserId,
      tenantId,
      action: 'tenant.suspend',
      entityType: 'tenant',
      entityId: tenantId,
      metadata: {},
    });
    return { ok: true };
  }

  async reactivateTenant(tenantId: string, actorUserId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    tenant.operationalStatus = TenantOperationalStatus.ACTIVE;
    tenant.active = true;
    await this.tenantRepo.save(tenant);
    await this.audit.log({
      actorUserId,
      tenantId,
      action: 'tenant.reactivate',
      entityType: 'tenant',
      entityId: tenantId,
      metadata: {},
    });
    return { ok: true };
  }

  async setPackage(tenantId: string, dto: AdminTenantPackageDto, actorUserId: string) {
    if (!(await this.packagePlans.isAssignablePackageCode(dto.packageCode))) {
      throw new BadRequestException('packageCode inválido ou não cadastrado');
    }
    const pkg = dto.packageCode.trim().toLowerCase();
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    tenant.currentPackageCode = pkg;
    await this.tenantRepo.save(tenant);
    await this.subRepo.save(
      this.subRepo.create({
        tenantId,
        packageCode: pkg,
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date(),
        endsAt: null,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      }),
    );
    await this.audit.log({
      actorUserId,
      tenantId,
      action: 'tenant.package_change',
      entityType: 'tenant',
      entityId: tenantId,
      metadata: { packageCode: pkg },
    });
    return { ok: true };
  }

  async getTenantFeatures(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    const flags = await this.flagRepo.find({ where: { tenantId } });
    const effective = await this.features.getEffectiveFeatureCodes(tenantId);
    const manual = flags.filter(
      (f) => f.source === FeatureFlagSource.MANUAL_OVERRIDE,
    );
    return {
      currentPackageCode: tenant.currentPackageCode,
      flags,
      effectiveFeatureCodes: [...effective].sort(),
      manualOverrides: manual.map((f) => ({
        featureCode: f.featureCode,
        enabled: f.enabled,
      })),
    };
  }

  async putTenantFeatures(
    tenantId: string,
    dto: AdminTenantFeaturesDto,
    actorUserId: string,
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    if (dto.revertToPackageDefaults?.length) {
      await this.flagRepo.delete({
        tenantId,
        source: FeatureFlagSource.MANUAL_OVERRIDE,
        featureCode: In(dto.revertToPackageDefaults),
      });
    }
    for (const o of dto.overrides ?? []) {
      const existing = await this.flagRepo.findOne({
        where: {
          tenantId,
          featureCode: o.featureCode,
          source: FeatureFlagSource.MANUAL_OVERRIDE,
        },
      });
      if (existing) {
        existing.enabled = o.enabled;
        await this.flagRepo.save(existing);
      } else {
        await this.flagRepo.save(
          this.flagRepo.create({
            tenantId,
            featureCode: o.featureCode,
            enabled: o.enabled,
            source: FeatureFlagSource.MANUAL_OVERRIDE,
          }),
        );
      }
    }
    await this.audit.log({
      actorUserId,
      tenantId,
      action: 'tenant.features_override',
      entityType: 'tenant',
      entityId: tenantId,
      metadata: {
        overrides: dto.overrides ?? [],
        revertToPackageDefaults: dto.revertToPackageDefaults ?? [],
      },
    });
    return { ok: true };
  }

  listTenants() {
    return this.tenantRepo.find({
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }
}
