import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationProvider } from './entities/integration.entity';

interface MercadoPagoConfig {
  accessToken: string;
}

export interface CreatePreferenceDto {
  customerName: string;
  customerEmail?: string;
  value: number;
  description?: string;
}

export interface MercadoPagoPreference {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly baseUrl = 'https://api.mercadopago.com';

  constructor(private readonly integrationService: IntegrationService) {}

  async isConnected(tenantId: string): Promise<boolean> {
    const cfg = await this.getConfig(tenantId);
    return !!cfg?.accessToken;
  }

  private async getConfig(tenantId: string): Promise<MercadoPagoConfig | null> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.MERCADOPAGO,
    );
    if (!integration || integration.status !== 'connected') return null;
    const cfg = integration.config as MercadoPagoConfig | null;
    if (!cfg?.accessToken) return null;
    return cfg;
  }

  async saveConfig(tenantId: string, accessToken: string): Promise<void> {
    const existing = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.MERCADOPAGO,
    );

    if (existing) {
      await this.integrationService.updateConfig(tenantId, IntegrationProvider.MERCADOPAGO, {
        accessToken,
      });
      await this.integrationService.setStatus(tenantId, existing.id, 'connected');
    } else {
      await this.integrationService.create(tenantId, {
        provider: IntegrationProvider.MERCADOPAGO,
        config: { accessToken },
      });
      const created = await this.integrationService.findByProvider(
        tenantId,
        IntegrationProvider.MERCADOPAGO,
      );
      if (created) {
        await this.integrationService.setStatus(tenantId, created.id, 'connected');
      }
    }
  }

  async createPreference(
    tenantId: string,
    dto: CreatePreferenceDto,
  ): Promise<{ preference: MercadoPagoPreference | null; error?: string }> {
    const cfg = await this.getConfig(tenantId);
    if (!cfg) {
      return { preference: null, error: 'Mercado Pago não configurado' };
    }

    const res = await fetch(`${this.baseUrl}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: dto.description ?? 'Cobrança',
            quantity: 1,
            unit_price: dto.value,
            currency_id: 'BRL',
          },
        ],
        payer: {
          name: dto.customerName,
          email: dto.customerEmail ?? undefined,
        },
        auto_return: 'approved',
        back_urls: {
          success: process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/app/opportunities?payment=success`
            : undefined,
          failure: process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/app/opportunities?payment=failure`
            : undefined,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.warn(`Mercado Pago createPreference failed: ${err}`);
      return { preference: null, error: err };
    }

    const preference = (await res.json()) as MercadoPagoPreference;
    const paymentUrl = preference.init_point ?? preference.sandbox_init_point ?? null;
    if (paymentUrl) {
      (preference as MercadoPagoPreference & { init_point?: string }).init_point = paymentUrl;
    }
    this.logger.log(`Mercado Pago preference created id=${preference.id} value=${dto.value}`);
    return { preference };
  }
}
