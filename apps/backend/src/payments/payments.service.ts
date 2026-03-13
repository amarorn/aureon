import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentProvider } from './entities/payment.entity';
import { AsaasService } from '../integrations/asaas.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';
import { MercadoPagoService } from '../integrations/mercadopago.service';
import { StripeService } from '../integrations/stripe.service';

export interface CreatePaymentDto {
  provider: PaymentProvider;
  opportunityId: string;
  contactId?: string;
  customerName: string;
  customerEmail?: string;
  customerCpfCnpj?: string;
  value: number;
  dueDate: string;
  description?: string;
  billingType?: string;
  currency?: string;
}

export interface PaymentDto {
  id: string;
  opportunityId: string;
  contactId: string | null;
  provider: PaymentProvider;
  externalId: string;
  value: number;
  currency: string;
  status: string;
  paymentUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly asaas: AsaasService,
    private readonly mercadopago: MercadoPagoService,
    private readonly stripe: StripeService,
  ) {}

  async findByOpportunity(tenantId: string, opportunityId: string): Promise<PaymentDto[]> {
    const rows = await this.paymentRepo.find({
      where: { tenantId, opportunityId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(this.toDto);
  }

  async findByPipeline(
    tenantId: string,
    pipelineId: string,
  ): Promise<PaymentDto[]> {
    const rows = await this.paymentRepo
      .createQueryBuilder('p')
      .innerJoin('p.opportunity', 'o')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('o.pipeline_id = :pipelineId', { pipelineId })
      .orderBy('p.created_at', 'DESC')
      .getMany();
    return rows.map(this.toDto);
  }

  async getProviderStatus(
    tenantId: string,
  ): Promise<{ asaas: boolean; mercadopago: boolean; stripe: boolean }> {
    const [asaas, mercadopago, stripe] = await Promise.all([
      this.asaas.isConnected(tenantId),
      this.mercadopago.isConnected(tenantId),
      this.stripe.isConnected(tenantId),
    ]);
    return { asaas, mercadopago, stripe };
  }

  async create(
    tenantId: string,
    dto: CreatePaymentDto,
  ): Promise<{ payment: PaymentDto | null; error?: string }> {
    switch (dto.provider) {
      case 'asaas':
        return this.createViaAsaas(tenantId, dto);
      case 'mercadopago':
        return this.createViaMercadoPago(tenantId, dto);
      case 'stripe':
        return this.createViaStripe(tenantId, dto);
      default:
        return { payment: null, error: `Provider ${dto.provider} não suportado` };
    }
  }

  private async createViaAsaas(
    tenantId: string,
    dto: CreatePaymentDto,
  ): Promise<{ payment: PaymentDto | null; error?: string }> {
    const result = await this.asaas.createCharge(tenantId, {
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerCpfCnpj: dto.customerCpfCnpj,
      value: dto.value,
      dueDate: dto.dueDate,
      description: dto.description,
      billingType: (dto.billingType as 'PIX' | 'BOLETO' | 'CREDIT_CARD') ?? 'PIX',
    });

    if (!result.charge || result.error) {
      return { payment: null, error: result.error };
    }

    const paymentUrl =
      result.charge.invoiceUrl ??
      result.charge.bankSlipUrl ??
      result.charge.pixQrCodeUrl ??
      null;

    const payment = this.paymentRepo.create({
      tenantId,
      opportunityId: dto.opportunityId,
      contactId: dto.contactId ?? null,
      provider: 'asaas',
      externalId: result.charge.id,
      value: result.charge.value,
      currency: 'BRL',
      status: result.charge.status ?? 'PENDING',
      paymentUrl,
      metadata: { asaas: result.charge },
    });

    const saved = await this.paymentRepo.save(payment);
    this.logger.log(`Payment created asaas id=${saved.id} opportunity=${dto.opportunityId}`);
    return { payment: this.toDto(saved) };
  }

  private async createViaMercadoPago(
    tenantId: string,
    dto: CreatePaymentDto,
  ): Promise<{ payment: PaymentDto | null; error?: string }> {
    const result = await this.mercadopago.createPreference(tenantId, {
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      value: dto.value,
      description: dto.description ?? dto.opportunityId,
    });

    if (!result.preference || result.error) {
      return { payment: null, error: result.error };
    }

    const payment = this.paymentRepo.create({
      tenantId,
      opportunityId: dto.opportunityId,
      contactId: dto.contactId ?? null,
      provider: 'mercadopago',
      externalId: result.preference.id,
      value: dto.value,
      currency: 'BRL',
      status: 'pending',
      paymentUrl: result.preference.init_point ?? null,
      metadata: { mercadopago: result.preference },
    });

    const saved = await this.paymentRepo.save(payment);
    this.logger.log(`Payment created mercadopago id=${saved.id} opportunity=${dto.opportunityId}`);
    return { payment: this.toDto(saved) };
  }

  private async createViaStripe(
    tenantId: string,
    dto: CreatePaymentDto,
  ): Promise<{ payment: PaymentDto | null; error?: string }> {
    const result = await this.stripe.createCheckoutSession(tenantId, {
      customerEmail: dto.customerEmail,
      value: dto.value,
      description: dto.description ?? dto.opportunityId,
      currency: (dto.currency ?? 'usd').toLowerCase(),
      successUrl: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/app/opportunities/${dto.opportunityId}?payment=success`
        : undefined,
      cancelUrl: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/app/opportunities/${dto.opportunityId}`
        : undefined,
    });

    if (!result.session || result.error) {
      return { payment: null, error: result.error };
    }

    const amount = dto.currency?.toLowerCase() === 'brl' ? dto.value : dto.value;

    const payment = this.paymentRepo.create({
      tenantId,
      opportunityId: dto.opportunityId,
      contactId: dto.contactId ?? null,
      provider: 'stripe',
      externalId: result.session.id,
      value: amount,
      currency: dto.currency ?? 'usd',
      status: 'pending',
      paymentUrl: result.session.url ?? null,
      metadata: { stripe: { sessionId: result.session.id } },
    });

    const saved = await this.paymentRepo.save(payment);
    this.logger.log(`Payment created stripe id=${saved.id} opportunity=${dto.opportunityId}`);
    return { payment: this.toDto(saved) };
  }

  private toDto(p: Payment): PaymentDto {
    return {
      id: p.id,
      opportunityId: p.opportunityId,
      contactId: p.contactId,
      provider: p.provider as PaymentProvider,
      externalId: p.externalId,
      value: Number(p.value),
      currency: p.currency,
      status: p.status,
      paymentUrl: p.paymentUrl,
      metadata: p.metadata,
      createdAt: p.createdAt.toISOString(),
    };
  }
}
