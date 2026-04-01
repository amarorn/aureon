import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeaturesService } from './features.service';
import { UserRole } from './auth.types';
import { FEATURE_KEY } from './features.decorator';

@Injectable()
export class FeaturesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly features: FeaturesService,
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
    };
    if (!jwt) return false;
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
