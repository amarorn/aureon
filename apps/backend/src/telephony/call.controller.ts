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
import { TwilioCallService } from './twilio-call.service';
import { CreateCallDto } from './dto/create-call.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';

@Controller('calls')
@UseGuards(TenantGuard, FeaturesGuard)
@RequireFeature('telephony.core')
export class CallController {
  constructor(
    private readonly callService: CallService,
    private readonly twilioCall: TwilioCallService,
  ) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateCallDto) {
    return this.callService.create(tenantId, dto);
  }

  @Post('initiate')
  async initiateTwilioCall(
    @TenantId() tenantId: string,
    @Body()
    body: {
      contactId: string;
      to: string;
      agentPhoneNumber: string;
      record?: boolean;
      transcribe?: boolean;
    },
  ) {
    return this.twilioCall.initiateCall(tenantId, {
      contactId: body.contactId,
      to: body.to,
      agentPhoneNumber: body.agentPhoneNumber,
      record: body.record,
      transcribe: body.transcribe,
    });
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
