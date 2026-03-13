import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Call } from './entities/call.entity';
import { CallQueueItem } from './entities/call-queue-item.entity';
import { SmsMessage } from './entities/sms-message.entity';
import { CallService } from './call.service';
import { CallController } from './call.controller';
import { CallQueueService } from './call-queue.service';
import { CallQueueController } from './call-queue.controller';
import { TwilioCallService } from './twilio-call.service';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, CallQueueItem, SmsMessage]),
    IntegrationsModule,
  ],
  controllers: [CallController, CallQueueController, TwilioWebhookController],
  providers: [CallService, CallQueueService, TwilioCallService],
})
export class TelephonyModule {}
