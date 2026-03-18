import { Module } from '@nestjs/common';
import { GoogleAdsService } from './google-ads.service';
import { GoogleAdsController } from './google-ads.controller';
import { TikTokAdsService } from './tiktok-ads.service';
import { TikTokAdsController } from './tiktok-ads.controller';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  controllers: [GoogleAdsController, TikTokAdsController],
  providers: [GoogleAdsService, TikTokAdsService],
  exports: [GoogleAdsService, TikTokAdsService],
})
export class AdsModule {}
