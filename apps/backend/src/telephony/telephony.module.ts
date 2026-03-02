import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Call } from './entities/call.entity';
import { CallQueueItem } from './entities/call-queue-item.entity';
import { CallService } from './call.service';
import { CallController } from './call.controller';
import { CallQueueService } from './call-queue.service';
import { CallQueueController } from './call-queue.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, CallQueueItem]),
  ],
  controllers: [CallController, CallQueueController],
  providers: [CallService, CallQueueService],
})
export class TelephonyModule {}
