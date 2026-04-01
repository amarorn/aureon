import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { UserRole } from './auth.types';

@Injectable()
export class PlatformStaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const jwt = req.userJwt as { role?: UserRole; isPlatformUser?: boolean };
    if (!jwt) return false;
    return (
      jwt.isPlatformUser === true &&
      (jwt.role === UserRole.PLATFORM_ADMIN ||
        jwt.role === UserRole.PLATFORM_SUPPORT)
    );
  }
}
