import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MessageTemplateService } from './message-template.service';
import { CreateMessageTemplateDto } from './dto/create-message-template.dto';
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';

@Controller('message-templates')
@UseGuards(TenantGuard, FeaturesGuard)
@RequireFeature('inbox.core')
export class MessageTemplateController {
  constructor(private readonly templateService: MessageTemplateService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateMessageTemplateDto) {
    return this.templateService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.templateService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.templateService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMessageTemplateDto,
  ) {
    return this.templateService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.templateService.remove(tenantId, id);
  }
}
