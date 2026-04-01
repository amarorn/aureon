import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from './auth.service';

/**
 * Se existir `Authorization: Bearer`, valida e preenche `request.userJwt`.
 * Token inválido ou expirado gera 401.
 */
@Injectable()
export class ParseJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization as string | undefined;
    if (!auth?.startsWith('Bearer ')) {
      return true;
    }
    try {
      req.userJwt = await this.jwt.verifyAsync<JwtPayload>(auth.slice(7).trim());
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    return true;
  }
}
