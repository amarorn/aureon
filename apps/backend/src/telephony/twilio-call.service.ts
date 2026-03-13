import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call, CallDirection, CallStatus } from './entities/call.entity';
import { TwilioService } from '../integrations/twilio.service';

export interface InitiateTwilioCallDto {
  contactId: string;
  to: string;
  agentPhoneNumber: string;
  record?: boolean;
  transcribe?: boolean;
}

@Injectable()
export class TwilioCallService {
  private readonly logger = new Logger(TwilioCallService.name);

  constructor(
    @InjectRepository(Call)
    private readonly callRepo: Repository<Call>,
    private readonly twilio: TwilioService,
  ) {}

  async initiateCall(
    tenantId: string,
    dto: InitiateTwilioCallDto,
  ): Promise<{ call: Call | null; error?: string }> {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const prefix = process.env.API_PREFIX || 'api/v1';

    const call = this.callRepo.create({
      tenantId,
      contactId: dto.contactId,
      phoneNumber: dto.to,
      direction: CallDirection.OUTBOUND,
      status: CallStatus.IN_PROGRESS,
      startedAt: new Date(),
      metadata: { agentPhoneNumber: dto.agentPhoneNumber },
    });
    const saved = await this.callRepo.save(call);

    const connectUrl = `${baseUrl}/${prefix}/telephony/twilio/connect?callId=${saved.id}`;
    const statusCallback = `${baseUrl}/${prefix}/telephony/twilio/status?callId=${saved.id}`;

    const result = await this.twilio.createCall(tenantId, {
      to: dto.to,
      url: connectUrl,
      statusCallback,
      record: dto.record ?? true,
      transcribe: dto.transcribe ?? false,
    });

    if (!result.callSid || result.error) {
      saved.status = CallStatus.NO_ANSWER;
      await this.callRepo.save(saved);
      return { call: null, error: result.error };
    }

    saved.externalSid = result.callSid;
    await this.callRepo.save(saved);
    return { call: saved };
  }
}
