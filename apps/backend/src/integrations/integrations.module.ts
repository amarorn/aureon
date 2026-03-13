import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from './entities/integration.entity';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';
import { WhatsAppService } from './whatsapp.service';
import { AsaasService } from './asaas.service';
import { MercadoPagoService } from './mercadopago.service';
import { StripeService } from './stripe.service';
import { LinkedInService } from './linkedin.service';
import { LinkedInController } from './linkedin.controller';
import { ZoomService } from './zoom.service';
import { ZoomController } from './zoom.controller';
import { EmailDeliveryService } from './email-delivery.service';
import { ProposalSignatureService } from './proposal-signature.service';
import { InstagramService } from './instagram.service';
import { InstagramController } from './instagram.controller';
import { Channel } from '../conversations/entities/channel.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { Contact } from '../crm/entities/contact.entity';
import { CrmModule } from '../crm/crm.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Integration, Channel, Conversation, Message, Contact]),
    CrmModule,
    TenantModule,
  ],
  controllers: [IntegrationController, LinkedInController, ZoomController, InstagramController],
  providers: [
    IntegrationService,
    WhatsAppService,
    AsaasService,
    MercadoPagoService,
    StripeService,
    LinkedInService,
    ZoomService,
    EmailDeliveryService,
    ProposalSignatureService,
    InstagramService,
  ],
  exports: [
    IntegrationService,
    WhatsAppService,
    AsaasService,
    MercadoPagoService,
    StripeService,
    LinkedInService,
    ZoomService,
    EmailDeliveryService,
    ProposalSignatureService,
    InstagramService,
  ],
})
export class IntegrationsModule {}
