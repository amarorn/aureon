import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { SmsMessageService } from './sms-message.service';

@Controller('telephony')
@UseGuards(TenantGuard)
export class TelephonyController {
  constructor(private readonly smsMessageService: SmsMessageService) {}

  @Get('sms')
  findSmsMessages(
    @TenantId() tenantId: string,
    @Query('contactId') contactId?: string,
  ) {
    return this.smsMessageService.findAll(tenantId, contactId);
  }
}
