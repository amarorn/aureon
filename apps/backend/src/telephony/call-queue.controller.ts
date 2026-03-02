import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CallQueueService } from './call-queue.service';
import { AddToQueueDto } from './dto/add-to-queue.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('call-queue')
@UseGuards(TenantGuard)
export class CallQueueController {
  constructor(private readonly queueService: CallQueueService) {}

  @Post()
  add(@TenantId() tenantId: string, @Body() dto: AddToQueueDto) {
    return this.queueService.add(tenantId, dto);
  }

  @Get()
  getQueue(@TenantId() tenantId: string) {
    return this.queueService.getQueue(tenantId);
  }

  @Get('next')
  getNext(@TenantId() tenantId: string) {
    return this.queueService.getNext(tenantId);
  }

  @Post(':id/calling')
  markCalling(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.queueService.markCalling(tenantId, id);
  }

  @Post(':id/completed')
  markCompleted(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.queueService.markCompleted(tenantId, id);
  }

  @Post(':id/skipped')
  markSkipped(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.queueService.markSkipped(tenantId, id);
  }

  @Delete('clear')
  clear(@TenantId() tenantId: string) {
    return this.queueService.clear(tenantId);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.queueService.remove(tenantId, id);
  }
}
