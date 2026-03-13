import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationProvider } from './entities/integration.entity';

interface StripeConfig {
  secretKey: string;
}

export interface CreateCheckoutSessionDto {
  customerEmail?: string;
  value: number;
  description?: string;
  currency?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface StripeCheckoutSession {
  id: string;
  url?: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly baseUrl = 'https://api.stripe.com/v1';

  constructor(private readonly integrationService: IntegrationService) {}

  async isConnected(tenantId: string): Promise<boolean> {
    const cfg = await this.getConfig(tenantId);
    return !!cfg?.secretKey;
  }

  private async getConfig(tenantId: string): Promise<StripeConfig | null> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.STRIPE,
    );
    if (!integration || integration.status !== 'connected') return null;
    const cfg = integration.config as StripeConfig | null;
    if (!cfg?.secretKey) return null;
    return cfg;
  }

  async saveConfig(tenantId: string, secretKey: string): Promise<void> {
    const existing = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.STRIPE,
    );

    if (existing) {
      await this.integrationService.updateConfig(tenantId, IntegrationProvider.STRIPE, {
        secretKey,
      });
      await this.integrationService.setStatus(tenantId, existing.id, 'connected');
    } else {
      await this.integrationService.create(tenantId, {
        provider: IntegrationProvider.STRIPE,
        config: { secretKey },
      });
      const created = await this.integrationService.findByProvider(
        tenantId,
        IntegrationProvider.STRIPE,
      );
      if (created) {
        await this.integrationService.setStatus(tenantId, created.id, 'connected');
      }
    }
  }

  async createCheckoutSession(
    tenantId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<{ session: StripeCheckoutSession | null; error?: string }> {
    const cfg = await this.getConfig(tenantId);
    if (!cfg) {
      return { session: null, error: 'Stripe não configurado' };
    }

    const currency = (dto.currency ?? 'usd').toLowerCase();
    const amount = Math.round(dto.value * 100);

    const body = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: dto.description ?? 'Pagamento' },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      ...(dto.customerEmail && { customer_email: dto.customerEmail }),
      ...(dto.successUrl && { success_url: dto.successUrl }),
      ...(dto.cancelUrl && { cancel_url: dto.cancelUrl }),
    };

    const res = await fetch(`${this.baseUrl}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = (errData as { error?: { message?: string } })?.error?.message ?? (await res.text());
      this.logger.warn(`Stripe createCheckoutSession failed: ${errMsg}`);
      return { session: null, error: errMsg };
    }

    const data = (await res.json()) as { id: string; url?: string };
    this.logger.log(`Stripe checkout session created id=${data.id} amount=${dto.value}`);
    return { session: { id: data.id, url: data.url } };
  }
}
