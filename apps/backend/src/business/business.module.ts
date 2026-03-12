import { Module } from '@nestjs/common';
import { GoogleBusinessProfileService } from './google-business-profile.service';
import { GoogleBusinessProfileController } from './google-business-profile.controller';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  controllers: [GoogleBusinessProfileController],
  providers: [GoogleBusinessProfileService],
  exports: [GoogleBusinessProfileService],
})
export class BusinessModule {}
