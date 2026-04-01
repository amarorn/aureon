import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RequireAuthGuard } from './require-auth.guard';
import { PACKAGE_CODES } from './package-catalog';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(RequireAuthGuard)
  async me(@Req() req: Request & { userJwt: { sub: string } }) {
    const raw = req.headers['x-tenant-id'];
    const headerTenantId =
      typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
    return this.auth.getMe(req.userJwt.sub, { headerTenantId });
  }

  @Get('packages')
  packageCatalog() {
    return { packages: PACKAGE_CODES };
  }
}
