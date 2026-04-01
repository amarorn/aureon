import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';

@Controller('pipelines')
@UseGuards(TenantGuard, FeaturesGuard)
@RequireFeature('crm.opportunities')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreatePipelineDto) {
    return this.pipelineService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.pipelineService.findAll(tenantId);
  }

  @Get('default')
  findDefault(@TenantId() tenantId: string) {
    return this.pipelineService.findDefault(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pipelineService.findOne(tenantId, id);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pipelineService.remove(tenantId, id);
  }
}
