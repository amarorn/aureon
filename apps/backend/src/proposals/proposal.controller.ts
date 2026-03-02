import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ProposalService } from './proposal.service';
import {
  CreateProposalDto,
  ProposalItemDto,
  UpdateProposalStatusDto,
} from './dto/create-proposal.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('proposals')
@UseGuards(TenantGuard)
export class ProposalController {
  constructor(private readonly service: ProposalService) {}

  @Get('stats')
  getStats(@TenantId() tenantId: string) {
    return this.service.getStats(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateProposalDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  @Put(':id/status')
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProposalStatusDto,
  ) {
    return this.service.updateStatus(tenantId, id, dto);
  }

  @Put(':id/items')
  updateItems(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { items: ProposalItemDto[] },
  ) {
    return this.service.updateItems(tenantId, id, body.items);
  }

  @Post(':id/duplicate')
  duplicate(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.duplicate(tenantId, id);
  }

  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }
}
