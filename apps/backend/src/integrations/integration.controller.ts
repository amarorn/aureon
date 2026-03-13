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
import { IntegrationProvider } from './entities/integration.entity';
import { EmailDeliveryService } from './email-delivery.service';
import { ProposalSignatureService } from './proposal-signature.service';
import { TeamNotificationService } from './team-notification.service';

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
  ) {}

  @Post()
  @UseGuards(TenantGuard)
  create(@TenantId() tenantId: string, @Body() dto: CreateIntegrationDto) {
    return this.integrationService.create(tenantId, dto);
  }

  @Get()
  @UseGuards(TenantGuard)
  findAll(@TenantId() tenantId: string) {
    return this.integrationService.findAll(tenantId);
  }

  // ── OAuth flow ─────────────────────────────────────────────────────────────

  @Put('oauth-credentials')
  @UseGuards(TenantGuard)
  async setTenantOAuthCredentials(
    @TenantId() tenantId: string,
    @Body()
    body: Record<string, unknown>,
  ) {
    await this.integrationService.updateTenantOAuthConfig(tenantId, body);
    return { ok: true };
  }

  @Get('oauth/url/:provider')
  @UseGuards(TenantGuard)
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
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
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
  @UseGuards(TenantGuard)
  async whatsappStatus(@TenantId() tenantId: string) {
    const connected = await this.whatsApp.isConnected(tenantId);
    return { connected };
  }

  @Post('whatsapp/config')
  @UseGuards(TenantGuard)
  async saveWhatsAppConfig(
    @TenantId() tenantId: string,
    @Body() body: { phoneNumberId: string; accessToken: string },
  ) {
    await this.whatsApp.saveConfig(tenantId, body.phoneNumberId, body.accessToken);
    return { ok: true };
  }

  @Post('whatsapp/messages')
  @UseGuards(TenantGuard)
  sendWhatsApp(
    @TenantId() tenantId: string,
    @Body() body: { to: string; text: string },
  ) {
    return this.whatsApp.sendTextMessage(tenantId, { to: body.to, text: body.text });
  }

  @Post('whatsapp/template')
  @UseGuards(TenantGuard)
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
  @UseGuards(TenantGuard)
  async asaasStatus(@TenantId() tenantId: string) {
    const connected = await this.asaas.isConnected(tenantId);
    return { connected };
  }

  @Post('asaas/config')
  @UseGuards(TenantGuard)
  async saveAsaasConfig(
    @TenantId() tenantId: string,
    @Body() body: { apiKey: string; environment?: 'sandbox' | 'production' },
  ) {
    await this.asaas.saveConfig(tenantId, body.apiKey, body.environment ?? 'sandbox');
    return { ok: true };
  }

  @Post('asaas/charges')
  @UseGuards(TenantGuard)
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
  @UseGuards(TenantGuard)
  getCharge(@TenantId() tenantId: string, @Param('chargeId') chargeId: string) {
    return this.asaas.getCharge(tenantId, chargeId);
  }

  // ── Mercado Pago ───────────────────────────────────────────────────────

  @Get('mercadopago/status')
  @UseGuards(TenantGuard)
  async mercadopagoStatus(@TenantId() tenantId: string) {
    const connected = await this.mercadopago.isConnected(tenantId);
    return { connected };
  }

  @Post('mercadopago/config')
  @UseGuards(TenantGuard)
  async saveMercadoPagoConfig(
    @TenantId() tenantId: string,
    @Body() body: { accessToken: string },
  ) {
    await this.mercadopago.saveConfig(tenantId, body.accessToken);
    return { ok: true };
  }

  // ── Stripe ─────────────────────────────────────────────────────────────

  @Get('stripe/status')
  @UseGuards(TenantGuard)
  async stripeStatus(@TenantId() tenantId: string) {
    const connected = await this.stripe.isConnected(tenantId);
    return { connected };
  }

  @Post('stripe/config')
  @UseGuards(TenantGuard)
  async saveStripeConfig(
    @TenantId() tenantId: string,
    @Body() body: { secretKey: string },
  ) {
    await this.stripe.saveConfig(tenantId, body.secretKey);
    return { ok: true };
  }

  // ── Email providers ───────────────────────────────────────────────────────

  @Get('sendgrid/status')
  @UseGuards(TenantGuard)
  async sendGridStatus(@TenantId() tenantId: string) {
    const connected = await this.emailDelivery.isConnected(
      tenantId,
      IntegrationProvider.SENDGRID,
    );
    return { connected };
  }

  @Post('sendgrid/config')
  @UseGuards(TenantGuard)
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
  @UseGuards(TenantGuard)
  async amazonSesStatus(@TenantId() tenantId: string) {
    const connected = await this.emailDelivery.isConnected(
      tenantId,
      IntegrationProvider.AMAZON_SES,
    );
    return { connected };
  }

  @Post('amazon-ses/config')
  @UseGuards(TenantGuard)
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
  @UseGuards(TenantGuard)
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
  @UseGuards(TenantGuard)
  async clickSignStatus(@TenantId() tenantId: string) {
    const connected = await this.proposalSignature.isConnected(
      tenantId,
      IntegrationProvider.CLICKSIGN,
    );
    return { connected };
  }

  @Post('clicksign/config')
  @UseGuards(TenantGuard)
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
  @UseGuards(TenantGuard)
  async docuSignStatus(@TenantId() tenantId: string) {
    const connected = await this.proposalSignature.isConnected(
      tenantId,
      IntegrationProvider.DOCUSIGN,
    );
    return { connected };
  }

  @Post('docusign/config')
  @UseGuards(TenantGuard)
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
  @UseGuards(TenantGuard)
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.integrationService.findOne(tenantId, id);
  }

  @Post(':id/disconnect')
  @UseGuards(TenantGuard)
  disconnect(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.integrationService.disconnect(tenantId, id);
  }

  @Delete(':id')
  @UseGuards(TenantGuard)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.integrationService.remove(tenantId, id);
  }
}
