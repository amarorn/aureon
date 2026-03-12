import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationProvider } from './entities/integration.entity';

type AsaasEnv = 'sandbox' | 'production';

interface AsaasConfig {
  apiKey: string;
  environment: AsaasEnv;
}

export interface CreateChargeDto {
  customerName: string;
  customerEmail?: string;
  customerCpfCnpj?: string;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  billingType?: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
}

export interface AsaasCharge {
  id: string;
  status: string;
  value: number;
  netValue?: number;
  dueDate: string;
  billingType: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeUrl?: string;
  pixKey?: string;
  description?: string;
}

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);

  constructor(private readonly integrationService: IntegrationService) {}

  async isConnected(tenantId: string): Promise<boolean> {
    const cfg = await this.getConfig(tenantId);
    return !!cfg?.apiKey;
  }

  private getBaseUrl(env: AsaasEnv): string {
    return env === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';
  }

  private async getConfig(tenantId: string): Promise<AsaasConfig | null> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.ASAAS,
    );
    if (!integration || integration.status !== 'connected') return null;
    const cfg = integration.config as AsaasConfig | null;
    if (!cfg?.apiKey) return null;
    return cfg;
  }

  async saveConfig(
    tenantId: string,
    apiKey: string,
    environment: AsaasEnv = 'sandbox',
  ): Promise<void> {
    const existing = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.ASAAS,
    );

    if (existing) {
      await this.integrationService.updateConfig(tenantId, IntegrationProvider.ASAAS, {
        apiKey,
        environment,
      });
      await this.integrationService.setStatus(tenantId, existing.id, 'connected');
    } else {
      await this.integrationService.create(tenantId, {
        provider: IntegrationProvider.ASAAS,
        config: { apiKey, environment },
      });
      const created = await this.integrationService.findByProvider(
        tenantId,
        IntegrationProvider.ASAAS,
      );
      if (created) {
        await this.integrationService.setStatus(tenantId, created.id, 'connected');
      }
    }
  }

  /** Create or find a customer in Asaas, then create a charge linked to them. */
  async createCharge(
    tenantId: string,
    dto: CreateChargeDto,
  ): Promise<{ charge: AsaasCharge | null; error?: string }> {
    const cfg = await this.getConfig(tenantId);
    if (!cfg) {
      return { charge: null, error: 'Asaas não configurado para este tenant' };
    }

    const base = this.getBaseUrl(cfg.environment);
    const headers = {
      access_token: cfg.apiKey,
      'Content-Type': 'application/json',
    };

    // Step 1: find or create customer
    let customerId: string | null = null;

    if (dto.customerCpfCnpj || dto.customerEmail) {
      const searchParam = dto.customerCpfCnpj
        ? `cpfCnpj=${encodeURIComponent(dto.customerCpfCnpj)}`
        : `email=${encodeURIComponent(dto.customerEmail!)}`;

      const searchRes = await fetch(`${base}/customers?${searchParam}`, { headers });
      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as { data?: Array<{ id: string }> };
        customerId = searchData.data?.[0]?.id ?? null;
      }
    }

    if (!customerId) {
      const custRes = await fetch(`${base}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: dto.customerName,
          email: dto.customerEmail ?? undefined,
          cpfCnpj: dto.customerCpfCnpj ?? undefined,
        }),
      });

      if (!custRes.ok) {
        const err = await custRes.text();
        this.logger.warn(`Asaas createCustomer failed: ${err}`);
        return { charge: null, error: err };
      }

      const custData = (await custRes.json()) as { id: string };
      customerId = custData.id;
    }

    // Step 2: create charge
    const chargeRes = await fetch(`${base}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: dto.billingType ?? 'PIX',
        value: dto.value,
        dueDate: dto.dueDate,
        description: dto.description ?? undefined,
      }),
    });

    if (!chargeRes.ok) {
      const err = await chargeRes.text();
      this.logger.warn(`Asaas createCharge failed customerId=${customerId}: ${err}`);
      return { charge: null, error: err };
    }

    const charge = (await chargeRes.json()) as AsaasCharge;
    this.logger.log(
      `Asaas charge created id=${charge.id} value=${charge.value} tenant=${tenantId}`,
    );
    return { charge };
  }

  async getCharge(
    tenantId: string,
    chargeId: string,
  ): Promise<{ charge: AsaasCharge | null; error?: string }> {
    const cfg = await this.getConfig(tenantId);
    if (!cfg) return { charge: null, error: 'Asaas não configurado' };

    const base = this.getBaseUrl(cfg.environment);
    const res = await fetch(`${base}/payments/${chargeId}`, {
      headers: { access_token: cfg.apiKey },
    });

    if (!res.ok) {
      return { charge: null, error: await res.text() };
    }

    const charge = (await res.json()) as AsaasCharge;
    return { charge };
  }
}
