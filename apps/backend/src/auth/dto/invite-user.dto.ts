import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsIn(['tenant_admin', 'tenant_member'])
  role: 'tenant_admin' | 'tenant_member';
}
