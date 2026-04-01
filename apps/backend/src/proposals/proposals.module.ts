import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proposal } from './entities/proposal.entity';
import { ProposalItem } from './entities/proposal-item.entity';
import { ProposalService } from './proposal.service';
import { ProposalController } from './proposal.controller';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { Contact } from '../crm/entities/contact.entity';
import { Opportunity } from '../crm/entities/opportunity.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Proposal, ProposalItem, Contact, Opportunity]),
    IntegrationsModule,
  ],
  providers: [ProposalService],
  controllers: [ProposalController],
})
export class ProposalsModule {}
