import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParseJwtGuard } from './parse-jwt.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { AuthSession } from './entities/auth-session.entity';
import { TenantAccessRequest } from './entities/tenant-access-request.entity';
import { TenantSubscription } from './entities/tenant-subscription.entity';
import { TenantFeatureFlag } from './entities/tenant-feature-flag.entity';
import { PackagePlan } from './entities/package-plan.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Tenant } from '../tenant/tenant.entity';
import { FeaturesService } from './features.service';
import { AuditService } from './audit.service';
import { PackagePlansService } from './package-plans.service';
import { AdminAccessService } from './admin-access.service';
import { AdminAccessController } from './admin-access.controller';
import { UsersManagementService } from './users-management.service';
import { UsersManagementController } from './users-management.controller';
import { PlatformStaffGuard } from './platform-roles.guard';
import { RolesGuard } from './roles.guard';
import { FeaturesGuard } from './features.guard';
import { RequireAuthGuard } from './require-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AuthSession,
      Tenant,
      TenantAccessRequest,
      TenantSubscription,
      TenantFeatureFlag,
      PackagePlan,
      AuditLog,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const raw = config.get<string>('JWT_SECRET');
        const secret =
          raw?.trim() || 'dev-jwt-secret-change-in-production';
        return {
          secret,
          signOptions: { expiresIn: '15m' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuthController,
    AdminAccessController,
    UsersManagementController,
  ],
  providers: [
    PackagePlansService,
    AuthService,
    FeaturesService,
    AuditService,
    AdminAccessService,
    UsersManagementService,
    ParseJwtGuard,
    PlatformStaffGuard,
    RolesGuard,
    FeaturesGuard,
    RequireAuthGuard,
    { provide: APP_GUARD, useClass: ParseJwtGuard },
  ],
  exports: [
    AuthService,
    JwtModule,
    FeaturesService,
    FeaturesGuard,
    PackagePlansService,
    TypeOrmModule,
  ],
})
export class AuthModule {}
