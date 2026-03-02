import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
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
