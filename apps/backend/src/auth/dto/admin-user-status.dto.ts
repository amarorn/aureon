import { IsIn, IsString } from 'class-validator';

export class AdminUserStatusDto {
  @IsString()
  @IsIn(['active', 'blocked'])
  status: 'active' | 'blocked';
}
