import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewRequest } from './entities/review-request.entity';
import { ReviewRequestService } from './review-request.service';
import { ReviewRequestController } from './review-request.controller';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([ReviewRequest])],
  providers: [ReviewRequestService],
  controllers: [ReviewRequestController],
})
export class ReputationModule {}
