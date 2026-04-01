import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { FeaturesService } from './features.service';
import { UserRole } from './auth.types';
import { FEATURE_KEY } from './features.decorator';

@Injectable()
export class FeaturesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly features: FeaturesService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const code = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!code) return true;
    const req = context.switchToHttp().getRequest();
    const jwt = req.userJwt as {
      tenantId?: string | null;
      isPlatformUser?: boolean;
      role?: UserRole;
    } | undefined;
    if (!jwt) {
      return this.config.get<string>('AUTH_LEGACY_TENANT') === 'true';
    }
    if (
      !this.features.shouldEnforcePackage(
        Boolean(jwt.isPlatformUser),
        jwt.role ?? UserRole.TENANT_MEMBER,
      )
    ) {
      return true;
    }
    const tenantId = req.tenantId as string;
    if (!tenantId) return false;
    return this.features.tenantHasFeature(tenantId, code);
  }
}
