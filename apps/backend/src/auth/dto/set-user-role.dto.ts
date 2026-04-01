import { IsIn } from 'class-validator';

export class SetUserRoleDto {
  @IsIn(['tenant_admin', 'tenant_member'])
  role: 'tenant_admin' | 'tenant_member';
}
