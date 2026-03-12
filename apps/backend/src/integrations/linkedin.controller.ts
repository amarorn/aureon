import { Controller, Get, Post, Put, Body, Query, UseGuards } from '@nestjs/common';
import { LinkedInService } from './linkedin.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('integrations/linkedin')
@UseGuards(TenantGuard)
export class LinkedInController {
  constructor(private readonly linkedin: LinkedInService) {}

  @Get('status')
  async status(@TenantId() tenantId: string) {
    const connected = await this.linkedin.isConnected(tenantId);
    return { connected };
  }

  @Get('userinfo')
  async userinfo(@TenantId() tenantId: string) {
    const data = await this.linkedin.fetchUserInfo(tenantId);
    if (!data) return { ok: false, error: 'not_connected_or_failed' };
    return { ok: true, data };
  }

  @Post('sync-leads')
  async syncLeads(@TenantId() tenantId: string) {
    return this.linkedin.syncLeadsToContacts(tenantId);
  }

  @Put('leadgen-config')
  async leadGenConfig(
    @TenantId() tenantId: string,
    @Body()
    body: {
      ownerUrn: string;
      leadType?: 'SPONSORED' | 'ORGANIZATION_PRODUCT' | 'COMPANY' | 'EVENT';
      versionedLeadGenFormUrn?: string;
    },
  ) {
    if (!body?.ownerUrn) return { ok: false, error: 'ownerUrn required' };
    await this.linkedin.saveLeadGenConfig(tenantId, body);
    return { ok: true };
  }

  @Get('leadgen-config')
  async getLeadGenConfig(@TenantId() tenantId: string) {
    return this.linkedin.getLeadGenConfig(tenantId);
  }

  @Get('lead-form-responses')
  async leadFormResponses(
    @TenantId() tenantId: string,
    @Query('ownerUrn') ownerUrn?: string,
    @Query('leadType') leadType?: string,
    @Query('formUrn') formUrn?: string,
    @Query('count') count?: string,
  ): Promise<{ elements?: unknown[]; error?: string; ok?: boolean }> {
    const cfg = await this.linkedin.getLeadGenConfig(tenantId);
    const owner = ownerUrn ?? cfg.ownerUrn;
    if (!owner) return { ok: false, error: 'ownerUrn required (query or leadgen-config)' };
    const lt = (leadType ?? cfg.leadType) as
      | 'SPONSORED'
      | 'ORGANIZATION_PRODUCT'
      | 'COMPANY'
      | 'EVENT';
    const formUrnResolved = formUrn ?? cfg.versionedLeadGenFormUrn;
    return this.linkedin.listLeadFormResponses(tenantId, {
      ownerUrn: owner,
      leadType: lt,
      ...(formUrnResolved ? { versionedLeadGenFormUrn: formUrnResolved } : {}),
      count: count ? parseInt(count, 10) : 25,
    });
  }

  @Post('sync-leadgen-batch')
  async syncLeadGenBatch(
    @TenantId() tenantId: string,
    @Body()
    body?: {
      ownerUrn?: string;
      leadType?: string;
      versionedLeadGenFormUrn?: string;
      maxResponses?: number;
    },
  ) {
    return this.linkedin.syncLeadGenBatch(tenantId, {
      ownerUrn: body?.ownerUrn,
      leadType: body?.leadType as
        | 'SPONSORED'
        | 'ORGANIZATION_PRODUCT'
        | 'COMPANY'
        | 'EVENT'
        | undefined,
      versionedLeadGenFormUrn: body?.versionedLeadGenFormUrn,
      maxResponses: body?.maxResponses,
    });
  }
}
