import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from './entities/integration.entity';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';
import { WhatsAppService } from './whatsapp.service';
import { AsaasService } from './asaas.service';
import { LinkedInService } from './linkedin.service';
import { LinkedInController } from './linkedin.controller';
import { ZoomService } from './zoom.service';
import { ZoomController } from './zoom.controller';
import { CrmModule } from '../crm/crm.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TypeOrmModule.forFeature([Integration]), CrmModule, TenantModule],
  controllers: [IntegrationController, LinkedInController, ZoomController],
  providers: [
    IntegrationService,
    WhatsAppService,
    AsaasService,
    LinkedInService,
    ZoomService,
  ],
  exports: [
    IntegrationService,
    WhatsAppService,
    AsaasService,
    LinkedInService,
    ZoomService,
  ],
})
export class IntegrationsModule {}
