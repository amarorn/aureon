import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';
import { SmsMessageService } from './sms-message.service';

@Controller('telephony')
@UseGuards(TenantGuard, FeaturesGuard)
@RequireFeature('telephony.core')
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
