import { Module } from '@nestjs/common';
import { GoogleAnalyticsService } from './google-analytics.service';
import { GoogleAnalyticsController } from './google-analytics.controller';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  controllers: [GoogleAnalyticsController],
  providers: [GoogleAnalyticsService],
  exports: [GoogleAnalyticsService],
})
export class AnalyticsModule {}
