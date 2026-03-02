import {
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
import { OpportunityService } from './opportunity.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('opportunities')
@UseGuards(TenantGuard)
export class OpportunityController {
  constructor(private readonly opportunityService: OpportunityService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateOpportunityDto) {
    return this.opportunityService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('pipelineId') pipelineId?: string,
  ) {
    return this.opportunityService.findAll(tenantId, pipelineId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.opportunityService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.opportunityService.update(tenantId, id, dto);
  }

  @Put(':id/stage')
  moveStage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body('stageId') stageId: string,
  ) {
    return this.opportunityService.moveStage(tenantId, id, stageId);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.opportunityService.remove(tenantId, id);
  }
}
