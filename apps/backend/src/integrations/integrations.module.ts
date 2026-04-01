import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from './entities/integration.entity';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';
import { WhatsAppService } from './whatsapp.service';
import { AsaasService } from './asaas.service';
import { MercadoPagoService } from './mercadopago.service';
import { StripeService } from './stripe.service';
import { TwilioService } from './twilio.service';
import { LinkedInService } from './linkedin.service';
import { LinkedInController } from './linkedin.controller';
import { RdStationService } from './rd-station.service';
import { RdStationController } from './rd-station.controller';
import { ZoomService } from './zoom.service';
import { ZoomController } from './zoom.controller';
import { EmailDeliveryService } from './email-delivery.service';
import { ProposalSignatureService } from './proposal-signature.service';
import { TeamNotificationService } from './team-notification.service';
import { InstagramService } from './instagram.service';
import { InstagramController } from './instagram.controller';
import { TelegramService } from './telegram.service';
import { Channel } from '../conversations/entities/channel.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { Contact } from '../crm/entities/contact.entity';
import { Opportunity } from '../crm/entities/opportunity.entity';
import { Stage } from '../crm/entities/stage.entity';
import { Task } from '../crm/entities/task.entity';
import { CrmModule } from '../crm/crm.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Integration,
      Channel,
      Conversation,
      Message,
      Contact,
      Opportunity,
      Stage,
      Task,
    ]),
    CrmModule,
    TenantModule,
  ],
  controllers: [
    IntegrationController,
    LinkedInController,
    RdStationController,
    ZoomController,
    InstagramController,
  ],
  providers: [
    IntegrationService,
    WhatsAppService,
    AsaasService,
    MercadoPagoService,
    StripeService,
    TwilioService,
    LinkedInService,
    RdStationService,
    ZoomService,
    EmailDeliveryService,
    ProposalSignatureService,
    TeamNotificationService,
    InstagramService,
    TelegramService,
  ],
  exports: [
    IntegrationService,
    WhatsAppService,
    AsaasService,
    MercadoPagoService,
    StripeService,
    TwilioService,
    LinkedInService,
    RdStationService,
    ZoomService,
    EmailDeliveryService,
    ProposalSignatureService,
    TeamNotificationService,
    InstagramService,
    TelegramService,
  ],
})
export class IntegrationsModule {}
