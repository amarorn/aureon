import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('notifications')
@UseGuards(TenantGuard)
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? Math.min(100, parseInt(limit, 10) || 50) : 50;
    return this.service.findAll(tenantId, take);
  }

  @Patch('all/read')
  markAllRead(@TenantId() tenantId: string) {
    return this.service.markAllRead(tenantId);
  }

  @Patch(':id/read')
  markRead(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.markRead(tenantId, id);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
