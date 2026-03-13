import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('payments')
@UseGuards(TenantGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  async list(
    @TenantId() tenantId: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('pipelineId') pipelineId?: string,
  ) {
    if (opportunityId) {
      return this.payments.findByOpportunity(tenantId, opportunityId);
    }
    if (pipelineId) {
      return this.payments.findByPipeline(tenantId, pipelineId);
    }
    return [];
  }

  @Get('providers')
  async providers(@TenantId() tenantId: string) {
    return this.payments.getProviderStatus(tenantId);
  }

  @Post()
  async create(
    @TenantId() tenantId: string,
    @Body()
    body: {
      provider: 'asaas' | 'mercadopago' | 'stripe';
      opportunityId: string;
      contactId?: string;
      customerName: string;
      customerEmail?: string;
      customerCpfCnpj?: string;
      value: number;
      dueDate?: string;
      description?: string;
      billingType?: string;
      currency?: string;
    },
  ) {
    return this.payments.create(tenantId, {
      provider: body.provider,
      opportunityId: body.opportunityId,
      contactId: body.contactId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerCpfCnpj: body.customerCpfCnpj,
      value: body.value,
      dueDate: body.dueDate ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: body.description,
      billingType: body.billingType,
      currency: body.currency,
    });
  }
}
