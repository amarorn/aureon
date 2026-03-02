import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CallService } from './call.service';
import { CreateCallDto } from './dto/create-call.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('calls')
@UseGuards(TenantGuard)
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateCallDto) {
    return this.callService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('contactId') contactId?: string,
  ) {
    return this.callService.findAll(tenantId, contactId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.callService.findOne(tenantId, id);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.callService.remove(tenantId, id);
  }
}
