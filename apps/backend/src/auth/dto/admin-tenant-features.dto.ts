import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class FeatureOverrideItem {
  @IsString()
  featureCode: string;

  @IsBoolean()
  enabled: boolean;
}

export class AdminTenantFeaturesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  revertToPackageDefaults?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureOverrideItem)
  overrides?: FeatureOverrideItem[];
}
