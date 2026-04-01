import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RequireAuthGuard } from './require-auth.guard';
import { PlatformStaffGuard } from './platform-roles.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from './auth.types';
import { AdminAccessService } from './admin-access.service';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';
import { RejectAccessRequestDto } from './dto/reject-access-request.dto';
import { AdminTenantPackageDto } from './dto/admin-tenant-package.dto';
import { AdminTenantFeaturesDto } from './dto/admin-tenant-features.dto';
import { AdminUpdatePackageDto } from './dto/admin-update-package.dto';
import { AdminCreatePackageDto } from './dto/admin-create-package.dto';
import { AdminUserStatusDto } from './dto/admin-user-status.dto';
import type { Request } from 'express';

@Controller('admin')
@UseGuards(RequireAuthGuard, PlatformStaffGuard)
export class AdminAccessController {
  constructor(private readonly admin: AdminAccessService) {}

  @Get('access-requests')
  listAccessRequests() {
    return this.admin.listAllAccessRequests();
  }

  @Get('access-requests/pending')
  listPending() {
    return this.admin.listPendingAccessRequests();
  }

  @Get('access-requests/:id')
  getOne(@Param('id') id: string) {
    return this.admin.getAccessRequest(id);
  }

  @Post('access-requests/:id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveAccessRequestDto,
    @Req() req: Request & { userJwt: { sub: string } },
  ) {
    return this.admin.approve(id, dto, req.userJwt.sub);
  }

  @Post('access-requests/:id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectAccessRequestDto,
    @Req() req: Request & { userJwt: { sub: string } },
  ) {
    return this.admin.reject(id, dto, req.userJwt.sub);
  }

  @Get('feature-registry')
  featureRegistry() {
    return this.admin.featureRegistry();
  }

  @Get('packages')
  listPackages() {
    return this.admin.listPackagePlans();
  }

  @Post('packages')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  createPackage(
    @Body() dto: AdminCreatePackageDto,
    @Req() req: Request & { userJwt: { sub: string } },
  ) {
    return this.admin.createPackagePlan(dto, req.userJwt.sub);
  }

  @Put('packages/:code')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  updatePackage(
    @Param('code') code: string,
    @Body() dto: AdminUpdatePackageDto,
    @Req() req: Request & { userJwt: { sub: string } },
  ) {
    return this.admin.updatePackagePlan(code, dto, req.userJwt.sub);
  }

  @Get('users')
  listUsers() {
    return this.admin.listUsersForAdmin();
  }

  @Put('users/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  setUserStatus(
    @Param('id') id: string,
    @Body() dto: AdminUserStatusDto,
    @Req() req: Request & { userJwt: { sub: string } },
  ) {
    return this.admin.setUserStatusAdmin(id, dto, req.userJwt.sub);
  }

  @Post('users/:id/reset-password')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  resetUserPassword(
    @Param('id') id: string,
    @Req() req: Request & { userJwt: { sub: string } },
  ) {
    return this.admin.resetUserPasswordAdmin(id, req.userJwt.sub);
  }

  @Get('tenants')
  listTenants() {
    return this.admin.listTenants();
  }

  @Post('tenants/:id/suspend')
  suspend(
    @Param('id') id: string,
    @Req() req: Request & { userJwt: { sub: string } },
  ) {
    return this.admin.suspendTenant(id, req.userJwt.sub);
  }

  @Post('tenants/:id/reactivate')
  reactivate(
    @Param('id') id: string,
    @Req() req: Request & { userJwt: { sub: string } },
  ) {
    return this.admin.reactivateTenant(id, req.userJwt.sub);
  }

  @Put('tenants/:id/package')
  setPackage(
    @Param('id') id: string,
    @Body() dto: AdminTenantPackageDto,
    @Req() req: Request & { userJwt: { sub: string } },
  ) {
    return this.admin.setPackage(id, dto, req.userJwt.sub);
  }

  @Get('tenants/:id/features')
  getFeatures(@Param('id') id: string) {
    return this.admin.getTenantFeatures(id);
  }

  @Put('tenants/:id/features')
  putFeatures(
    @Param('id') id: string,
    @Body() dto: AdminTenantFeaturesDto,
    @Req() req: Request & { userJwt: { sub: string } },
  ) {
    return this.admin.putTenantFeatures(id, dto, req.userJwt.sub);
  }
}
