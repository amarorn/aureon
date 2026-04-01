import { IsArray, IsString, MinLength } from 'class-validator';

export class AdminUpdatePackageDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @IsString({ each: true })
  featureCodes: string[];
}
