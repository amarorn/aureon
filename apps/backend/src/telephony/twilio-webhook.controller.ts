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
import { TwilioService } from '../integrations/twilio.service';
import { IntegrationService } from '../integrations/integration.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';
import { SmsMessageService } from './sms-message.service';

interface TwilioTenantConfig {
  authToken: string;
  phoneNumber: string;
}

@Controller('telephony/twilio')
export class TwilioWebhookController {
  private readonly logger = new Logger(TwilioWebhookController.name);

  constructor(
    @InjectRepository(Call)
    private readonly callRepo: Repository<Call>,
    private readonly twilio: TwilioService,
    private readonly integrationService: IntegrationService,
    private readonly smsMessageService: SmsMessageService,
  ) {}

  @Get('connect')
  async connect(
    @Req() req: Request,
    @Query('callId') callId: string,
    @Headers('x-twilio-signature') signature: string | undefined,
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

    const twilioConfig = await this.getTenantTwilioConfig(call.tenantId);
    const isValid = await this.isValidWebhookSignature(
      twilioConfig,
      this.buildWebhookUrl(req, 'telephony/twilio/connect', { callId }),
      this.requestParamsToRecord(req.query),
      signature,
    );
    if (!twilioConfig || !isValid) {
      res.type('text/xml').status(403).send('<Response><Say>Assinatura inválida.</Say></Response>');
      return;
    }

    const agentPhone = (call.metadata as { agentPhoneNumber?: string }).agentPhoneNumber;
    if (!agentPhone) {
      res.type('text/xml').send('<Response><Say>Conectando. Aguarde.</Say></Response>');
      return;
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" callerId="${escapeXml(twilioConfig.phoneNumber)}"><Number>${escapeXml(agentPhone)}</Number></Dial>
</Response>`;
    res.type('text/xml').send(twiml);
  }

  @Post('status')
  async status(
    @Req() req: Request,
    @Query('callId') callId: string,
    @Body() body: Record<string, string>,
    @Headers('x-twilio-signature') signature: string | undefined,
    @Res() res: Response,
  ) {
    if (!callId) {
      res.type('text/xml').status(400).send('<Response></Response>');
      return;
    }

    const call = await this.callRepo.findOne({ where: { id: callId } });
    if (!call) {
      res.type('text/xml').status(404).send('<Response></Response>');
      return;
    }

    const twilioConfig = await this.getTenantTwilioConfig(call.tenantId);
    const isValid = await this.isValidWebhookSignature(
      twilioConfig,
      this.buildWebhookUrl(req, 'telephony/twilio/status', { callId }),
      body,
      signature,
    );
    if (!isValid) {
      res.type('text/xml').status(403).send('<Response></Response>');
      return;
    }

    res.type('text/xml').send('<Response></Response>');

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
    @Req() req: Request,
    @Body() body: Record<string, string>,
    @Headers('x-twilio-signature') signature: string | undefined,
    @Res() res: Response,
  ) {
    const from = body.From || '';
    const bodyText = body.Body || '';
    const messageSid = body.MessageSid || null;
    const to = body.To || '';

    const integration = await this.integrationService.findTwilioByPhoneNumber(to);
    const tenantId = integration?.tenantId;
    const config = this.extractTwilioConfig(integration?.config);
    const isValid = await this.isValidWebhookSignature(
      config,
      this.buildWebhookUrl(req, 'telephony/twilio/inbound-sms'),
      body,
      signature,
    );
    if (!tenantId || !isValid) {
      res.type('text/xml').status(403).send('<Response></Response>');
      return;
    }

    await this.smsMessageService.createInbound(
      tenantId,
      from,
      bodyText,
      messageSid,
    );

    res.type('text/xml').send('<Response></Response>');
  }

  private async getTenantTwilioConfig(
    tenantId: string,
  ): Promise<TwilioTenantConfig | null> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.TWILIO,
    );
    return this.extractTwilioConfig(integration?.config, integration?.status);
  }

  private extractTwilioConfig(
    config: unknown,
    status?: string,
  ): TwilioTenantConfig | null {
    if (status && status !== 'connected') {
      return null;
    }

    const twilioConfig = config as Partial<TwilioTenantConfig> | null;
    if (!twilioConfig?.authToken || !twilioConfig.phoneNumber) {
      return null;
    }

    return {
      authToken: twilioConfig.authToken,
      phoneNumber: twilioConfig.phoneNumber,
    };
  }

  private async isValidWebhookSignature(
    config: TwilioTenantConfig | null,
    url: string,
    params: Record<string, string>,
    signature?: string,
  ): Promise<boolean> {
    if (!config?.authToken || !signature) {
      return false;
    }

    return this.twilio.validateWebhookSignature(
      config.authToken,
      url,
      params,
      signature,
    );
  }

  private buildWebhookUrl(
    req: Request,
    path: string,
    query?: Record<string, string>,
  ): string {
    const baseUrl =
      process.env.API_BASE_URL?.replace(/\/+$/, '') ||
      `${req.protocol}://${req.get('host')}`;
    const prefix = (process.env.API_PREFIX || '').replace(/^\/+|\/+$/g, '');
    const normalizedPath = path.replace(/^\/+/, '');
    const fullPath = prefix ? `${baseUrl}/${prefix}/${normalizedPath}` : `${baseUrl}/${normalizedPath}`;

    if (!query || Object.keys(query).length === 0) {
      return fullPath;
    }

    const search = new URLSearchParams(query);
    return `${fullPath}?${search.toString()}`;
  }

  private requestParamsToRecord(
    params: Request['query'],
  ): Record<string, string> {
    return Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
      if (Array.isArray(value)) {
        const v = value[0];
        acc[key] = typeof v === 'string' ? v : (v != null ? String(v) : '');
        return acc;
      }
      if (typeof value === 'string') {
        acc[key] = value;
        return acc;
      }
      if (value != null) {
        acc[key] = String(value);
      }
      return acc;
    }, {});
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
