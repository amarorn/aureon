import { IsIn } from 'class-validator';

export class SetUserStatusDto {
  @IsIn(['active', 'blocked'])
  status: 'active' | 'blocked';
}
