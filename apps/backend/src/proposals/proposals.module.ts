import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proposal } from './entities/proposal.entity';
import { ProposalItem } from './entities/proposal-item.entity';
import { ProposalService } from './proposal.service';
import { ProposalController } from './proposal.controller';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Proposal, ProposalItem]), IntegrationsModule],
  providers: [ProposalService],
  controllers: [ProposalController],
})
export class ProposalsModule {}
