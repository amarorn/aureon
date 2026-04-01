import { IsArray, IsString, Matches, MinLength } from 'class-validator';

export class AdminCreatePackageDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z][a-z0-9-]{1,62}$/, {
    message: 'código deve ser slug minúsculo (ex.: enterprise-plus)',
  })
  code: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @IsString({ each: true })
  featureCodes: string[];
}
