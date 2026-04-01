import { IsString } from 'class-validator';

export class AdminTenantPackageDto {
  @IsString()
  packageCode: string;
}
