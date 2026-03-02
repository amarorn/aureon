import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailCampaign } from './entities/email-campaign.entity';
import { EmailCampaignRecipient } from './entities/email-campaign-recipient.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailCampaignService } from './email-campaign.service';
import { EmailTemplateService } from './email-template.service';
import { EmailCampaignController } from './email-campaign.controller';
import { EmailTemplateController } from './email-template.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailCampaign, EmailCampaignRecipient, EmailTemplate]),
  ],
  providers: [EmailCampaignService, EmailTemplateService],
  controllers: [EmailCampaignController, EmailTemplateController],
})
export class EmailMarketingModule {}
