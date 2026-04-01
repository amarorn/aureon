import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workflow } from './entities/workflow.entity';
import { WorkflowRun } from './entities/workflow-run.entity';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { AuthModule } from '../auth/auth.module';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Workflow, WorkflowRun]),
    forwardRef(() => CrmModule),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class AutomationModule {}
