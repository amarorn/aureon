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
import { ChannelService } from './channel.service';
import { ChannelController } from './channel.controller';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MessageTemplateService } from './message-template.service';
import { MessageTemplateController } from './message-template.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Channel,
      Conversation,
      Message,
      MessageAttachment,
      MessageTemplate,
    ]),
    CrmModule,
  ],
  controllers: [
    ChannelController,
    ConversationController,
    MessageController,
    MessageTemplateController,
  ],
  providers: [
    ChannelService,
    ConversationService,
    MessageService,
    MessageTemplateService,
  ],
})
export class ConversationsModule {}
