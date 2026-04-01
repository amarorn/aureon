import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoogleBusinessProfileService } from './google-business-profile.service';
import { GoogleBusinessProfileController } from './google-business-profile.controller';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [AuthModule, IntegrationsModule],
  controllers: [GoogleBusinessProfileController],
  providers: [GoogleBusinessProfileService],
  exports: [GoogleBusinessProfileService],
})
export class BusinessModule {}
