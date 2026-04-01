import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { IntegrationService } from './integration.service';
import { WhatsAppService } from './whatsapp.service';
import { AsaasService } from './asaas.service';
import { MercadoPagoService } from './mercadopago.service';
import { StripeService } from './stripe.service';
import { TwilioService } from './twilio.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';
import { IntegrationProvider } from './entities/integration.entity';
import { EmailDeliveryService } from './email-delivery.service';
import { ProposalSignatureService } from './proposal-signature.service';
import { TeamNotificationService } from './team-notification.service';
import { TelegramService } from './telegram.service';

@Controller('integrations')
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly whatsApp: WhatsAppService,
    private readonly asaas: AsaasService,
    private readonly mercadopago: MercadoPagoService,
    private readonly stripe: StripeService,
    private readonly twilio: TwilioService,
    private readonly emailDelivery: EmailDeliveryService,
    private readonly proposalSignature: ProposalSignatureService,
    private readonly teamNotifications: TeamNotificationService,
    private readonly telegram: TelegramService,
  ) {}

  @Post()
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  create(@TenantId() tenantId: string, @Body() dto: CreateIntegrationDto) {
    return this.integrationService.create(tenantId, dto);
  }

  @Get()
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  findAll(@TenantId() tenantId: string) {
    return this.integrationService.findAll(tenantId);
  }

  // ── OAuth flow ─────────────────────────────────────────────────────────────

  @Put('oauth-credentials')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async setTenantOAuthCredentials(
    @TenantId() tenantId: string,
    @Body()
    body: Record<string, unknown>,
  ) {
    await this.integrationService.updateTenantOAuthConfig(tenantId, body);
    return { ok: true };
  }

  @Get('oauth/url/:provider')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async getOAuthUrl(
    @TenantId() tenantId: string,
    @Param('provider') provider: IntegrationProvider,
  ) {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const prefix = process.env.API_PREFIX || 'api/v1';
    const redirectUri = `${baseUrl}/${prefix}/integrations/oauth/callback`;
    const url = await this.integrationService.getOAuthUrl(provider, tenantId, redirectUri);
    return { url };
  }

  @Get('oauth/callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('auth_code') authCode: string, // TikTok uses auth_code instead of code
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    // TikTok Ads sends auth_code, not code — normalise here
    if (!code && authCode) code = authCode;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const integrationsPath = `${frontendUrl}/app/integrations`;

    if (error) {
      return res.redirect(`${integrationsPath}?error=${encodeURIComponent(error)}`);
    }

    try {
      const { tenantId, provider } = JSON.parse(
        Buffer.from(state, 'base64url').toString(),
      );
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
      const prefix = process.env.API_PREFIX || 'api/v1';
      const redirectUri = `${baseUrl}/${prefix}/integrations/oauth/callback`;

      await this.integrationService.handleOAuthCallback(provider, tenantId, code, redirectUri);
      return res.redirect(`${integrationsPath}?success=${provider}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return res.redirect(`${integrationsPath}?error=${encodeURIComponent(message)}`);
    }
  }

  // ── WhatsApp ───────────────────────────────────────────────────────────────

  @Get('whatsapp/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async whatsappStatus(@TenantId() tenantId: string) {
    const connected = await this.whatsApp.isConnected(tenantId);
    return { connected };
  }

  @Post('whatsapp/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async saveWhatsAppConfig(
    @TenantId() tenantId: string,
    @Body() body: { phoneNumberId: string; accessToken: string },
  ) {
    await this.whatsApp.saveConfig(tenantId, body.phoneNumberId, body.accessToken);
    return { ok: true };
  }

  @Post('whatsapp/messages')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  sendWhatsApp(
    @TenantId() tenantId: string,
    @Body() body: { to: string; text: string },
  ) {
    return this.whatsApp.sendTextMessage(tenantId, { to: body.to, text: body.text });
  }

  @Post('whatsapp/template')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  sendTemplate(
    @TenantId() tenantId: string,
    @Body()
    body: {
      to: string;
      templateName: string;
      languageCode?: string;
      components?: unknown[];
    },
  ) {
    return this.whatsApp.sendTemplate(tenantId, body);
  }

  // ── Asaas ──────────────────────────────────────────────────────────────────

  @Get('asaas/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async asaasStatus(@TenantId() tenantId: string) {
    const connected = await this.asaas.isConnected(tenantId);
    return { connected };
  }

  @Post('asaas/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async saveAsaasConfig(
    @TenantId() tenantId: string,
    @Body() body: { apiKey: string; environment?: 'sandbox' | 'production' },
  ) {
    await this.asaas.saveConfig(tenantId, body.apiKey, body.environment ?? 'sandbox');
    return { ok: true };
  }

  @Post('asaas/charges')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  createCharge(
    @TenantId() tenantId: string,
    @Body()
    body: {
      customerName: string;
      customerEmail?: string;
      customerCpfCnpj?: string;
      value: number;
      dueDate: string;
      description?: string;
      billingType?: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
    },
  ) {
    return this.asaas.createCharge(tenantId, body);
  }

  @Get('asaas/charges/:chargeId')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  getCharge(@TenantId() tenantId: string, @Param('chargeId') chargeId: string) {
    return this.asaas.getCharge(tenantId, chargeId);
  }

  // ── Mercado Pago ───────────────────────────────────────────────────────

  @Get('mercadopago/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async mercadopagoStatus(@TenantId() tenantId: string) {
    const connected = await this.mercadopago.isConnected(tenantId);
    return { connected };
  }

  @Post('mercadopago/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async saveMercadoPagoConfig(
    @TenantId() tenantId: string,
    @Body() body: { accessToken: string },
  ) {
    await this.mercadopago.saveConfig(tenantId, body.accessToken);
    return { ok: true };
  }

  // ── Stripe ─────────────────────────────────────────────────────────────

  @Get('stripe/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async stripeStatus(@TenantId() tenantId: string) {
    const connected = await this.stripe.isConnected(tenantId);
    return { connected };
  }

  @Post('stripe/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async saveStripeConfig(
    @TenantId() tenantId: string,
    @Body() body: { secretKey: string },
  ) {
    await this.stripe.saveConfig(tenantId, body.secretKey);
    return { ok: true };
  }

  // ── Team notifications ────────────────────────────────────────────────────

  @Get('slack/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async slackStatus(@TenantId() tenantId: string) {
    const connected = await this.teamNotifications.isConnected(
      tenantId,
      IntegrationProvider.SLACK,
    );
    return { connected };
  }

  @Post('slack/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async saveSlackConfig(
    @TenantId() tenantId: string,
    @Body() body: { webhookUrl: string },
  ) {
    await this.teamNotifications.saveSlackConfig(tenantId, body.webhookUrl);
    return { ok: true };
  }

  @Get('microsoft-teams/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async microsoftTeamsStatus(@TenantId() tenantId: string) {
    const connected = await this.teamNotifications.isConnected(
      tenantId,
      IntegrationProvider.MICROSOFT_TEAMS,
    );
    return { connected };
  }

  @Post('microsoft-teams/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async saveMicrosoftTeamsConfig(
    @TenantId() tenantId: string,
    @Body() body: { webhookUrl: string },
  ) {
    await this.teamNotifications.saveTeamsConfig(tenantId, body.webhookUrl);
    return { ok: true };
  }

  // ── Telegram ──────────────────────────────────────────────────────────────

  @Get('telegram/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async telegramStatus(@TenantId() tenantId: string) {
    const connected = await this.telegram.isConnected(tenantId);
    return { connected };
  }

  @Post('telegram/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async saveTelegramConfig(
    @TenantId() tenantId: string,
    @Body() body: { botToken: string },
  ) {
    await this.telegram.saveConfig(tenantId, body.botToken);
    return { ok: true };
  }

  @Post('telegram/messages')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  sendTelegram(
    @TenantId() tenantId: string,
    @Body() body: { chatId: string; text: string },
  ) {
    return this.telegram.sendMessage(tenantId, { chatId: body.chatId, text: body.text });
  }

  // ── Twilio (SMS + VoIP) ───────────────────────────────────────────────────

  @Get('twilio/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async twilioStatus(@TenantId() tenantId: string) {
    const connected = await this.twilio.isConnected(tenantId);
    return { connected };
  }

  @Post('twilio/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async saveTwilioConfig(
    @TenantId() tenantId: string,
    @Body() body: { accountSid: string; authToken: string; phoneNumber: string },
  ) {
    await this.twilio.saveConfig(
      tenantId,
      body.accountSid,
      body.authToken,
      body.phoneNumber,
    );
    return { ok: true };
  }

  @Post('twilio/sms')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async sendTwilioSms(
    @TenantId() tenantId: string,
    @Body() body: { to: string; body: string },
  ) {
    return this.twilio.sendSms(tenantId, body.to, body.body);
  }

  // ── Email providers ───────────────────────────────────────────────────────

  @Get('sendgrid/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async sendGridStatus(@TenantId() tenantId: string) {
    const connected = await this.emailDelivery.isConnected(
      tenantId,
      IntegrationProvider.SENDGRID,
    );
    return { connected };
  }

  @Post('sendgrid/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async saveSendGridConfig(
    @TenantId() tenantId: string,
    @Body()
    body: {
      apiKey: string;
      fromEmail?: string;
      fromName?: string;
      replyToEmail?: string;
    },
  ) {
    await this.emailDelivery.saveSendGridConfig(tenantId, body);
    return { ok: true };
  }

  @Get('amazon-ses/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async amazonSesStatus(@TenantId() tenantId: string) {
    const connected = await this.emailDelivery.isConnected(
      tenantId,
      IntegrationProvider.AMAZON_SES,
    );
    return { connected };
  }

  @Post('amazon-ses/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async saveAmazonSesConfig(
    @TenantId() tenantId: string,
    @Body()
    body: {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      fromEmail?: string;
      fromName?: string;
      replyToEmail?: string;
      configurationSetName?: string;
    },
  ) {
    await this.emailDelivery.saveAmazonSesConfig(tenantId, body);
    return { ok: true };
  }

  @Post('email/test')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async sendTestEmail(
    @TenantId() tenantId: string,
    @Body()
    body: {
      to: string;
      subject: string;
      html: string;
      text?: string;
      fromEmail?: string;
      fromName?: string;
      replyToEmail?: string;
    },
  ) {
    const delivery = await this.emailDelivery.send(tenantId, body);
    return { ok: true, ...delivery };
  }

  // ── Signature providers ───────────────────────────────────────────────────

  @Get('clicksign/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async clickSignStatus(@TenantId() tenantId: string) {
    const connected = await this.proposalSignature.isConnected(
      tenantId,
      IntegrationProvider.CLICKSIGN,
    );
    return { connected };
  }

  @Post('clicksign/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async saveClickSignConfig(
    @TenantId() tenantId: string,
    @Body()
    body: {
      accessToken: string;
      baseUrl?: string;
    },
  ) {
    await this.proposalSignature.saveClickSignConfig(tenantId, body);
    return { ok: true };
  }

  @Get('docusign/status')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async docuSignStatus(@TenantId() tenantId: string) {
    const connected = await this.proposalSignature.isConnected(
      tenantId,
      IntegrationProvider.DOCUSIGN,
    );
    return { connected };
  }

  @Post('docusign/config')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  async saveDocuSignConfig(
    @TenantId() tenantId: string,
    @Body()
    body: {
      accessToken: string;
      accountId: string;
      basePath: string;
      returnUrl?: string;
    },
  ) {
    await this.proposalSignature.saveDocuSignConfig(tenantId, body);
    return { ok: true };
  }

  // ── Generic ────────────────────────────────────────────────────────────────

  @Get(':id')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.integrationService.findOne(tenantId, id);
  }

  @Post(':id/disconnect')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  disconnect(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.integrationService.disconnect(tenantId, id);
  }

  @Delete(':id')
  @UseGuards(TenantGuard, FeaturesGuard)
  @RequireFeature('integrations.core')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.integrationService.remove(tenantId, id);
  }
}
