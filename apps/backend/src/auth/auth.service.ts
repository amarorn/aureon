import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { AuthSession } from './entities/auth-session.entity';
import { Tenant } from '../tenant/tenant.entity';
import { TenantAccessRequest } from './entities/tenant-access-request.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  AccessRequestStatus,
  TenantApprovalStatus,
  TenantOperationalStatus,
  TenantType,
  UserRole,
  UserStatus,
} from './auth.types';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FeaturesService } from './features.service';
import { PackagePlansService } from './package-plans.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  isPlatformUser: boolean;
}

const BCRYPT_ROUNDS = 12;
const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || 'empresa';
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuthSession)
    private readonly sessionRepo: Repository<AuthSession>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantAccessRequest)
    private readonly accessRequestRepo: Repository<TenantAccessRequest>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly features: FeaturesService,
    private readonly packagePlans: PackagePlansService,
  ) {}

  private domainError(
    status: HttpStatus,
    code: string,
    message: string,
  ): HttpException {
    return new HttpException({ statusCode: status, code, message }, status);
  }

  async signup(dto: SignupDto) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }
    const requestedPkg = dto.requestedPackageCode.trim().toLowerCase();
    if (!(await this.packagePlans.isAssignablePackageCode(requestedPkg))) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Pacote inválido ou indisponível para cadastro.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    let baseSlug = slugify(dto.companySlug || dto.companyName);
    let slug = baseSlug;
    let n = 0;
    while (await this.tenantRepo.findOne({ where: { slug } })) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const tenant = this.tenantRepo.create({
      slug,
      name: dto.companyName,
      active: true,
      type: TenantType.CUSTOMER,
      approvalStatus: TenantApprovalStatus.PENDING,
      operationalStatus: TenantOperationalStatus.ACTIVE,
      approvedAt: null,
      approvedByUserId: null,
      currentPackageCode: null,
    });
    await this.tenantRepo.save(tenant);

    const user = this.userRepo.create({
      tenantId: tenant.id,
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      name: dto.name,
      role: UserRole.TENANT_OWNER,
      status: UserStatus.PENDING_APPROVAL,
      isPlatformUser: false,
    });
    await this.userRepo.save(user);

    const req = this.accessRequestRepo.create({
      tenantId: tenant.id,
      requestedPackageCode: requestedPkg,
      contactName: dto.name,
      contactEmail: dto.email.toLowerCase().trim(),
      contactPhone: dto.phone,
      companyName: dto.companyName,
      notes: null,
      status: AccessRequestStatus.PENDING,
      reviewedByUserId: null,
      reviewedAt: null,
    });
    await this.accessRequestRepo.save(req);

    await this.notifyInternalTeamSignup({
      companyName: dto.companyName,
      contactName: dto.name,
      email: dto.email,
      phone: dto.phone,
      packageCode: requestedPkg,
      tenantId: tenant.id,
    });

    return {
      ok: true,
      message:
        'Cadastro recebido. Sua conta será analisada pela equipe Aureon.',
      tenantId: tenant.id,
    };
  }

  async listPublicPackages() {
    const plans = await this.packagePlans.listPlansOrdered();
    return {
      packages: plans.map((p) => ({ code: p.code, name: p.name })),
    };
  }

  private async notifyInternalTeamSignup(payload: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    packageCode: string;
    tenantId: string;
  }): Promise<void> {
    const webhook = this.config.get<string>('INTERNAL_SIGNUP_WEBHOOK_URL');
    const adminBase =
      this.config.get<string>('PUBLIC_APP_URL') || 'http://localhost:3000';
    const text = [
      'Novo cadastro pendente de aprovação - Aureon',
      `Empresa: ${payload.companyName}`,
      `Responsável: ${payload.contactName}`,
      `E-mail: ${payload.email}`,
      `Telefone: ${payload.phone}`,
      `Pacote: ${payload.packageCode}`,
      `Tenant: ${payload.tenantId}`,
      `Admin: ${adminBase}/admin/access-requests`,
    ].join('\n');

    if (webhook) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
      } catch (e) {
        this.logger.warn(`Webhook signup notify failed: ${e}`);
      }
    } else {
      this.logger.log(`[signup notify]\n${text}`);
    }
  }

  async validateUserForLogin(user: User): Promise<void> {
    if (user.isPlatformUser) {
      if (user.status !== UserStatus.ACTIVE) {
        throw this.domainError(
          HttpStatus.FORBIDDEN,
          'ACCOUNT_PENDING_APPROVAL',
          'Conta não ativa.',
        );
      }
      return;
    }
    const tenant = user.tenantId
      ? await this.tenantRepo.findOne({ where: { id: user.tenantId } })
      : null;
    if (!tenant) {
      throw this.domainError(
        HttpStatus.FORBIDDEN,
        'TENANT_SUSPENDED',
        'Organização não encontrada.',
      );
    }
    if (tenant.approvalStatus === TenantApprovalStatus.PENDING) {
      throw this.domainError(
        HttpStatus.FORBIDDEN,
        'ACCOUNT_PENDING_APPROVAL',
        'Sua conta foi criada e está aguardando liberação da equipe Aureon.',
      );
    }
    if (tenant.approvalStatus === TenantApprovalStatus.REJECTED) {
      throw this.domainError(
        HttpStatus.FORBIDDEN,
        'ACCOUNT_REJECTED',
        'Seu cadastro não foi aprovado. Entre em contato com o comercial.',
      );
    }
    if (
      tenant.operationalStatus === TenantOperationalStatus.SUSPENDED ||
      tenant.operationalStatus === TenantOperationalStatus.DISABLED
    ) {
      throw this.domainError(
        HttpStatus.FORBIDDEN,
        'TENANT_SUSPENDED',
        'Sua organização está suspensa ou inativa.',
      );
    }
    if (!tenant.active) {
      throw this.domainError(
        HttpStatus.FORBIDDEN,
        'TENANT_SUSPENDED',
        'Sua organização está inativa.',
      );
    }
    if (user.status === UserStatus.PENDING_APPROVAL) {
      throw this.domainError(
        HttpStatus.FORBIDDEN,
        'ACCOUNT_PENDING_APPROVAL',
        'Sua conta está aguardando liberação.',
      );
    }
    if (user.status === UserStatus.BLOCKED) {
      throw this.domainError(
        HttpStatus.FORBIDDEN,
        'TENANT_SUSPENDED',
        'Sua conta está bloqueada.',
      );
    }
  }

  async login(
    dto: LoginDto,
    meta: { userAgent?: string; ip?: string },
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: ReturnType<AuthService['toPublicUser']>;
    tenant: {
      id: string;
      name: string;
      slug: string;
      approvalStatus: string;
      operationalStatus: string;
      currentPackageCode: string | null;
    } | null;
    features: string[];
  }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['tenant'],
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw this.domainError(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'E-mail ou senha inválidos.',
      );
    }

    await this.validateUserForLogin(user);

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const tokens = await this.issueTokens(user, meta);
    const features = await this.resolveEffectiveFeatureCodes(user);

    let tenant: {
      id: string;
      name: string;
      slug: string;
      approvalStatus: string;
      operationalStatus: string;
      currentPackageCode: string | null;
    } | null = null;
    if (user.tenant) {
      tenant = {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        approvalStatus: user.tenant.approvalStatus,
        operationalStatus: user.tenant.operationalStatus,
        currentPackageCode: user.tenant.currentPackageCode,
      };
    }

    return {
      ...tokens,
      user: this.toPublicUser(user),
      tenant,
      features,
    };
  }

  toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      isPlatformUser: user.isPlatformUser,
    };
  }

  private async issueTokens(
    user: User,
    meta: { userAgent?: string; ip?: string },
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      isPlatformUser: user.isPlatformUser,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: ACCESS_TTL_SEC,
    });
    const refreshToken = randomBytes(48).toString('hex');
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.sessionRepo.save(
      this.sessionRepo.create({
        userId: user.id,
        refreshTokenHash,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ip ?? null,
        expiresAt,
        revokedAt: null,
      }),
    );
    return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SEC };
  }

  async refresh(
    refreshToken: string,
    meta: { userAgent?: string; ip?: string },
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const hash = hashRefreshToken(refreshToken);
    const session = await this.sessionRepo.findOne({
      where: { refreshTokenHash: hash },
      relations: ['user'],
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
    session.revokedAt = new Date();
    await this.sessionRepo.save(session);

    const user = await this.userRepo.findOne({
      where: { id: session.userId },
      relations: ['tenant'],
    });
    if (!user) throw new UnauthorizedException();
    await this.validateUserForLogin(user);

    return this.issueTokens(user, meta);
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = hashRefreshToken(refreshToken);
    const session = await this.sessionRepo.findOne({
      where: { refreshTokenHash: hash },
    });
    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      await this.sessionRepo.save(session);
    }
  }

  private async resolveEffectiveFeatureCodes(
    user: User,
    opts?: { headerTenantId?: string | null },
  ): Promise<string[]> {
    let tenantId: string | null = user.tenantId;
    if (user.isPlatformUser && opts?.headerTenantId?.trim()) {
      tenantId = opts.headerTenantId.trim();
    }
    if (!tenantId) return [];
    return Array.from(await this.features.getEffectiveFeatureCodes(tenantId));
  }

  async getMe(
    userId: string,
    opts?: { headerTenantId?: string | null },
  ): Promise<{
    user: ReturnType<AuthService['toPublicUser']>;
    tenant: {
      id: string;
      name: string;
      slug: string;
      approvalStatus: string;
      operationalStatus: string;
      currentPackageCode: string | null;
    } | null;
    features: string[];
  }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });
    if (!user) throw new UnauthorizedException();
    const features = await this.resolveEffectiveFeatureCodes(user, opts);
    let tenant: {
      id: string;
      name: string;
      slug: string;
      approvalStatus: string;
      operationalStatus: string;
      currentPackageCode: string | null;
    } | null = null;
    if (user.tenant) {
      tenant = {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        approvalStatus: user.tenant.approvalStatus,
        operationalStatus: user.tenant.operationalStatus,
        currentPackageCode: user.tenant.currentPackageCode,
      };
    }
    return { user: this.toPublicUser(user), tenant, features };
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id }, relations: ['tenant'] });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Nome inválido');
    user.name = name;
    await this.userRepo.save(user);
    return { user: this.toPublicUser(user) };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Senha atual incorreta');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.userRepo.save(user);
    await this.sessionRepo.delete({ userId: user.id });
    return { ok: true };
  }
}
