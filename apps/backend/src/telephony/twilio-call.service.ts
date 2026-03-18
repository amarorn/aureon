import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call, CallDirection, CallStatus } from './entities/call.entity';
import { TwilioService } from '../integrations/twilio.service';
import { Contact } from '../crm/entities/contact.entity';

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
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    private readonly twilio: TwilioService,
  ) {}

  async initiateCall(
    tenantId: string,
    dto: InitiateTwilioCallDto,
  ): Promise<{ call: Call | null; error?: string }> {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const prefix = process.env.API_PREFIX || 'api/v1';
    const contact = await this.contactRepo.findOne({
      where: { id: dto.contactId, tenantId },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    const phoneNumber = dto.to?.trim() || contact.phone?.trim() || '';
    if (!phoneNumber) {
      return { call: null, error: 'Contato sem telefone para discagem' };
    }

    const call = this.callRepo.create({
      tenantId,
      contactId: contact.id,
      phoneNumber,
      direction: CallDirection.OUTBOUND,
      status: CallStatus.IN_PROGRESS,
      startedAt: new Date(),
      metadata: { agentPhoneNumber: dto.agentPhoneNumber },
    });
    const saved = await this.callRepo.save(call);

    const connectUrl = `${baseUrl}/${prefix}/telephony/twilio/connect?callId=${saved.id}`;
    const statusCallback = `${baseUrl}/${prefix}/telephony/twilio/status?callId=${saved.id}`;

    const result = await this.twilio.createCall(tenantId, {
      to: phoneNumber,
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
