import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from '../crm/entities/opportunity.entity';
import { Stage } from '../crm/entities/stage.entity';
import { Contact } from '../crm/entities/contact.entity';
import { Pipeline } from '../crm/entities/pipeline.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Opportunity, Stage, Contact, Pipeline]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
