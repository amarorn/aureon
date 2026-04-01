import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequireAuthGuard } from './require-auth.guard';

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

  @Patch('me')
  @UseGuards(RequireAuthGuard)
  updateMe(
    @Req() req: Request & { userJwt: { sub: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(req.userJwt.sub, dto);
  }

  @Put('me/password')
  @UseGuards(RequireAuthGuard)
  changeMyPassword(
    @Req() req: Request & { userJwt: { sub: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(req.userJwt.sub, dto);
  }

  @Get('packages')
  packageCatalog() {
    return this.auth.listPublicPackages();
  }
}
