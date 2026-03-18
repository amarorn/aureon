import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Channel,
  Conversation,
  Message,
  MessageAttachment,
  MessageTemplate,
} from './entities';
import { CrmModule } from '../crm/crm.module';
import { Contact } from '../crm/entities/contact.entity';
import { EmailInboxModule } from '../email-inbox/email-inbox.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ChannelService } from './channel.service';
import { ChannelController } from './channel.controller';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MessageTemplateService } from './message-template.service';
import { MessageTemplateController } from './message-template.controller';
import { WebchatSyncController } from './webchat-sync.controller';
import { WebchatSyncService } from './webchat-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Channel,
      Conversation,
      Message,
      MessageAttachment,
      MessageTemplate,
      Contact,
    ]),
    CrmModule,
    IntegrationsModule,
    EmailInboxModule,
  ],
  controllers: [
    ChannelController,
    ConversationController,
    MessageController,
    MessageTemplateController,
    WebchatSyncController,
  ],
  providers: [
    ChannelService,
    ConversationService,
    MessageService,
    MessageTemplateService,
    WebchatSyncService,
  ],
})
export class ConversationsModule {}
