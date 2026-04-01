import { IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FeatureOverrideItem {
  @IsString()
  featureCode: string;

  @IsBoolean()
  enabled: boolean;
}

export class AdminTenantFeaturesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureOverrideItem)
  overrides: FeatureOverrideItem[];
}
