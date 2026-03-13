import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel } from '../conversations/entities/channel.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { Contact } from '../crm/entities/contact.entity';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GmailService } from './gmail.service';
import { OutlookService } from './outlook.service';
import { EmailInboxController } from './email-inbox.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel, Conversation, Message, Contact]),
    IntegrationsModule,
    NotificationsModule,
  ],
  controllers: [EmailInboxController],
  providers: [GmailService, OutlookService],
  exports: [GmailService, OutlookService],
})
export class EmailInboxModule {}
