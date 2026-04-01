import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserRole, UserStatus } from './auth.types';
import { InviteUserDto } from './dto/invite-user.dto';
import { randomBytes } from 'crypto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersManagementService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async listTenantUsers(tenantId: string) {
    return this.userRepo.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  async invite(
    tenantId: string,
    actorRole: UserRole,
    dto: InviteUserDto,
  ): Promise<{ ok: boolean; userId: string; temporaryPassword?: string }> {
    if (
      actorRole !== UserRole.TENANT_OWNER &&
      actorRole !== UserRole.TENANT_ADMIN
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'INSUFFICIENT_ROLE',
        message: 'Sem permissão para convidar usuários',
      });
    }
    const email = dto.email.toLowerCase().trim();
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) {
      throw new ConflictException('E-mail já cadastrado');
    }
    const tempPass = randomBytes(12).toString('base64url').slice(0, 16);
    const passwordHash = await bcrypt.hash(tempPass, BCRYPT_ROUNDS);
    const role =
      dto.role === 'tenant_admin'
        ? UserRole.TENANT_ADMIN
        : UserRole.TENANT_MEMBER;
    const user = this.userRepo.create({
      tenantId,
      email,
      name: dto.name,
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
      isPlatformUser: false,
    });
    await this.userRepo.save(user);
    return { ok: true, userId: user.id, temporaryPassword: tempPass };
  }

  async setRole(
    tenantId: string,
    userId: string,
    role: UserRole.TENANT_ADMIN | UserRole.TENANT_MEMBER,
    actorRole: UserRole,
  ) {
    if (
      actorRole !== UserRole.TENANT_OWNER &&
      actorRole !== UserRole.TENANT_ADMIN
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'INSUFFICIENT_ROLE',
        message: 'Sem permissão',
      });
    }
    const user = await this.userRepo.findOne({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === UserRole.TENANT_OWNER) {
      throw new BadRequestException('Não é possível alterar o papel do owner');
    }
    user.role = role;
    await this.userRepo.save(user);
    return { ok: true };
  }

  async setStatus(
    tenantId: string,
    userId: string,
    status: UserStatus.ACTIVE | UserStatus.BLOCKED,
    actorRole: UserRole,
  ) {
    if (
      actorRole !== UserRole.TENANT_OWNER &&
      actorRole !== UserRole.TENANT_ADMIN
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'INSUFFICIENT_ROLE',
        message: 'Sem permissão',
      });
    }
    const user = await this.userRepo.findOne({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === UserRole.TENANT_OWNER) {
      throw new BadRequestException('Não é possível bloquear o owner');
    }
    user.status = status;
    await this.userRepo.save(user);
    return { ok: true };
  }
}
