import { Module } from '@nestjs/common';
import { GoogleAdsService } from './google-ads.service';
import { GoogleAdsController } from './google-ads.controller';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  controllers: [GoogleAdsController],
  providers: [GoogleAdsService],
  exports: [GoogleAdsService],
})
export class AdsModule {}
