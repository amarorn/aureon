import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationStatus } from './entities/conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { CreateTaskFromConversationDto } from './dto/create-task-from-conversation.dto';
import { CreateOpportunityFromConversationDto } from './dto/create-opportunity-from-conversation.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TaskService } from '../crm/task.service';
import { OpportunityService } from '../crm/opportunity.service';
import { PipelineService } from '../crm/pipeline.service';

@Controller('conversations')
@UseGuards(TenantGuard)
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly taskService: TaskService,
    private readonly opportunityService: OpportunityService,
    private readonly pipelineService: PipelineService,
  ) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateConversationDto) {
    return this.conversationService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: ConversationStatus,
    @Query('contactId') contactId?: string,
    @Query('channelId') channelId?: string,
  ) {
    return this.conversationService.findAll(tenantId, {
      status,
      contactId,
      channelId,
    });
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.conversationService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationService.update(tenantId, id, dto);
  }

  @Put(':id/assign')
  assign(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { assignedTo: string | null },
  ) {
    return this.conversationService.assign(tenantId, id, body.assignedTo ?? null);
  }

  @Put(':id/close')
  close(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.conversationService.close(tenantId, id);
  }

  @Put(':id/reopen')
  reopen(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.conversationService.reopen(tenantId, id);
  }

  @Post(':id/create-task')
  async createTask(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateTaskFromConversationDto,
  ) {
    const conversation = await this.conversationService.findOne(tenantId, id);
    return this.taskService.create(tenantId, {
      contactId: conversation.contactId,
      opportunityId: dto.opportunityId,
      title: dto.title,
      description: dto.description,
      dueDate: dto.dueDate,
    });
  }

  @Post(':id/create-opportunity')
  async createOpportunity(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateOpportunityFromConversationDto,
  ) {
    const conversation = await this.conversationService.findOne(tenantId, id);
    const pipeline = dto.pipelineId
      ? await this.pipelineService.findOne(tenantId, dto.pipelineId)
      : await this.pipelineService.findDefault(tenantId);
    if (!pipeline?.stages?.length) {
      throw new BadRequestException('Pipeline não encontrado ou sem estágios');
    }
    const firstStage = [...pipeline.stages].sort((a, b) => a.order - b.order)[0];
    return this.opportunityService.create(tenantId, {
      contactId: conversation.contactId,
      pipelineId: dto.pipelineId ?? pipeline.id,
      stageId: firstStage.id,
      title: dto.title,
      value: dto.value ?? 0,
      expectedCloseDate: dto.expectedCloseDate,
      notes: dto.notes,
    });
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.conversationService.remove(tenantId, id);
  }
}
