import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../../auth/auth.service';

/**
 * Resolve `tenantId` no request.
 * - Com JWT: cliente usa sempre o tenant do token; staff da plataforma usa `X-Tenant-Id` (ou DEFAULT_TENANT_ID em dev).
 * - Sem JWT (modo legado): `X-Tenant-Id` ou DEFAULT_TENANT_ID quando AUTH_LEGACY_TENANT=true.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const jwt = request.userJwt as JwtPayload | undefined;

    if (jwt) {
      if (jwt.isPlatformUser) {
        const headerTenant =
          request.headers['x-tenant-id'] || this.config.get('DEFAULT_TENANT_ID');
        if (!headerTenant) {
          throw new BadRequestException(
            'X-Tenant-Id é obrigatório para usuários da equipe Aureon',
          );
        }
        request.tenantId = String(headerTenant);
        return true;
      }
      if (!jwt.tenantId) {
        throw new BadRequestException('Usuário sem organização vinculada');
      }
      request.tenantId = jwt.tenantId;
      return true;
    }

    const legacy = this.config.get('AUTH_LEGACY_TENANT') === 'true';
    if (!legacy) {
      throw new UnauthorizedException(
        'Autenticação necessária (defina AUTH_LEGACY_TENANT=true apenas para desenvolvimento legado)',
      );
    }

    const tenantId =
      request.headers['x-tenant-id'] || this.config.get('DEFAULT_TENANT_ID');

    if (!tenantId) {
      throw new BadRequestException(
        'X-Tenant-Id header or DEFAULT_TENANT_ID env is required',
      );
    }

    request.tenantId = tenantId;
    return true;
  }
}
