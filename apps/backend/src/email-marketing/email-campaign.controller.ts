import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EmailCampaignService } from './email-campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('email-campaigns')
@UseGuards(TenantGuard)
export class EmailCampaignController {
  constructor(private readonly service: EmailCampaignService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateCampaignDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post(':id/send')
  send(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.send(tenantId, id);
  }

  @Post(':id/duplicate')
  duplicate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.duplicate(tenantId, id);
  }

  @Get(':id/recipients')
  getRecipients(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getRecipients(tenantId, id);
  }

  @Post(':id/recipients')
  addRecipient(
    @TenantId() tenantId: string,
    @Param('id') campaignId: string,
    @Body() body: { email: string; contactId?: string; contactName?: string },
  ) {
    return this.service.addRecipient(tenantId, campaignId, body.email, body.contactId, body.contactName);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
