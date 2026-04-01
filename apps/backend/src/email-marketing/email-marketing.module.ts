import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailCampaign } from './entities/email-campaign.entity';
import { EmailCampaignRecipient } from './entities/email-campaign-recipient.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailCampaignService } from './email-campaign.service';
import { EmailTemplateService } from './email-template.service';
import { EmailCampaignController } from './email-campaign.controller';
import { EmailCampaignTrackingController } from './email-campaign-tracking.controller';
import { EmailTemplateController } from './email-template.controller';
import { Contact } from '../crm/entities';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      EmailCampaign,
      EmailCampaignRecipient,
      EmailTemplate,
      Contact,
    ]),
    IntegrationsModule,
  ],
  providers: [EmailCampaignService, EmailTemplateService],
  controllers: [
    EmailCampaignController,
    EmailCampaignTrackingController,
    EmailTemplateController,
  ],
})
export class EmailMarketingModule {}
