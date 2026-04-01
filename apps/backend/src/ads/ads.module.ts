import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoogleAdsService } from './google-ads.service';
import { GoogleAdsController } from './google-ads.controller';
import { TikTokAdsService } from './tiktok-ads.service';
import { TikTokAdsController } from './tiktok-ads.controller';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [AuthModule, IntegrationsModule],
  controllers: [GoogleAdsController, TikTokAdsController],
  providers: [GoogleAdsService, TikTokAdsService],
  exports: [GoogleAdsService, TikTokAdsService],
})
export class AdsModule {}
