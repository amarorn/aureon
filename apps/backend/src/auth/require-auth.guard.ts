import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class RequireAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.userJwt) {
      throw new UnauthorizedException(
        'Autenticação necessária. Envie Authorization: Bearer <access_token>',
      );
    }
    return true;
  }
}
