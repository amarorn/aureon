import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from './require-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { UsersManagementService } from './users-management.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { SetUserRoleDto } from './dto/set-user-role.dto';
import { SetUserStatusDto } from './dto/set-user-status.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { Req } from '@nestjs/common';
import type { Request } from 'express';
import { UserRole, UserStatus } from './auth.types';

@Controller('users')
@UseGuards(RequireAuthGuard, TenantGuard)
export class UsersManagementController {
  constructor(private readonly users: UsersManagementService) {}

  @Get()
  list(
    @TenantId() tenantId: string,
    @Req() req: Request & { userJwt: { role: UserRole } },
  ) {
    return this.users.listTenantUsers(tenantId);
  }

  @Post('invite')
  invite(
    @TenantId() tenantId: string,
    @Body() dto: InviteUserDto,
    @Req() req: Request & { userJwt: { role: UserRole } },
  ) {
    return this.users.invite(tenantId, req.userJwt.role, dto);
  }

  @Put(':id/role')
  setRole(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SetUserRoleDto,
    @Req() req: Request & { userJwt: { role: UserRole } },
  ) {
    const role =
      dto.role === 'tenant_admin'
        ? UserRole.TENANT_ADMIN
        : UserRole.TENANT_MEMBER;
    return this.users.setRole(tenantId, id, role, req.userJwt.role);
  }

  @Put(':id/status')
  setStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SetUserStatusDto,
    @Req() req: Request & { userJwt: { role: UserRole } },
  ) {
    const status =
      dto.status === 'active' ? UserStatus.ACTIVE : UserStatus.BLOCKED;
    return this.users.setStatus(tenantId, id, status, req.userJwt.role);
  }
}
