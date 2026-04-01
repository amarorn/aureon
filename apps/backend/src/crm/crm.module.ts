import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../common/events/events.module';
import {
  Contact,
  Tag,
  Pipeline,
  Stage,
  Opportunity,
  Interaction,
  Task,
} from './entities';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { OpportunityService } from './opportunity.service';
import { OpportunityController } from './opportunity.controller';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';
import { TagService } from './tag.service';
import { TagController } from './tag.controller';
import { InteractionService } from './interaction.service';
import { InteractionController } from './interaction.controller';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    EventsModule,
    TypeOrmModule.forFeature([
      Contact,
      Tag,
      Pipeline,
      Stage,
      Opportunity,
      Interaction,
      Task,
    ]),
  ],
  controllers: [
    ContactController,
    OpportunityController,
    PipelineController,
    TagController,
    InteractionController,
    TaskController,
  ],
  providers: [
    ContactService,
    OpportunityService,
    PipelineService,
    TagService,
    InteractionService,
    TaskService,
  ],
  exports: [
    TaskService,
    OpportunityService,
    PipelineService,
    ContactService,
  ],
})
export class CrmModule {}
