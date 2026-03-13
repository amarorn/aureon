import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  Res,
  Headers,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call, CallStatus } from './entities/call.entity';
import { SmsMessage } from './entities/sms-message.entity';
import { TwilioService } from '../integrations/twilio.service';
import { IntegrationService } from '../integrations/integration.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';

@Controller('telephony/twilio')
export class TwilioWebhookController {
  private readonly logger = new Logger(TwilioWebhookController.name);

  constructor(
    @InjectRepository(Call)
    private readonly callRepo: Repository<Call>,
    @InjectRepository(SmsMessage)
    private readonly smsRepo: Repository<SmsMessage>,
    private readonly twilio: TwilioService,
    private readonly integrationService: IntegrationService,
  ) {}

  @Get('connect')
  async connect(
    @Query('callId') callId: string,
    @Res() res: Response,
  ) {
    if (!callId) {
      res.type('text/xml').status(400).send('<Response><Say>Erro: callId ausente.</Say></Response>');
      return;
    }

    const call = await this.callRepo.findOne({ where: { id: callId } });
    if (!call?.metadata || typeof call.metadata !== 'object') {
      res.type('text/xml').status(404).send('<Response><Say>Chamada não encontrada.</Say></Response>');
      return;
    }

    const agentPhone = (call.metadata as { agentPhoneNumber?: string }).agentPhoneNumber;
    if (!agentPhone) {
      res.type('text/xml').send('<Response><Say>Conectando. Aguarde.</Say></Response>');
      return;
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" callerId="${escapeXml(call.phoneNumber)}"><Number>${escapeXml(agentPhone)}</Number></Dial>
</Response>`;
    res.type('text/xml').send(twiml);
  }

  @Post('status')
  async status(
    @Query('callId') callId: string,
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ) {
    res.type('text/xml').send('<Response></Response>');

    if (!callId) return;

    const call = await this.callRepo.findOne({ where: { id: callId } });
    if (!call) return;

    const callStatus = body.CallStatus;
    const duration = body.CallDuration ? parseInt(body.CallDuration, 10) : null;
    const recordingUrl = body.RecordingUrl || null;

    const statusMap: Record<string, CallStatus> = {
      completed: CallStatus.COMPLETED,
      busy: CallStatus.BUSY,
      failed: CallStatus.NO_ANSWER,
      'no-answer': CallStatus.NO_ANSWER,
      canceled: CallStatus.MISSED,
    };

    call.status = statusMap[callStatus] ?? call.status;
    call.durationSeconds = duration;
    call.endedAt = callStatus === 'completed' || callStatus === 'busy' || callStatus === 'no-answer' || callStatus === 'failed' || callStatus === 'canceled'
      ? new Date()
      : call.endedAt;
    if (recordingUrl) call.recordingUrl = recordingUrl;

    await this.callRepo.save(call);
    this.logger.log(`Call ${callId} status=${callStatus} duration=${duration}`);
  }

  @Post('inbound-sms')
  async inboundSms(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ) {
    const from = body.From || '';
    const bodyText = body.Body || '';
    const messageSid = body.MessageSid || null;
    const to = body.To || '';

    const integration = await this.integrationService.findTwilioByPhoneNumber(to);
    const tenantId = integration?.tenantId;
    if (!tenantId) {
      res.type('text/xml').send('<Response></Response>');
      return;
    }

    const sms = this.smsRepo.create({
      tenantId,
      contactId: null,
      phoneNumber: from,
      direction: 'inbound',
      body: bodyText,
      externalSid: messageSid,
      status: 'received',
    });
    await this.smsRepo.save(sms);

    res.type('text/xml').send('<Response></Response>');
  }
}

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
