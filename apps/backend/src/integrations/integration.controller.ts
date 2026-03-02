import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { IntegrationService } from './integration.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { IntegrationProvider } from './entities/integration.entity';

@Controller('integrations')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

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

  @Get('oauth/url/:provider')
  @UseGuards(TenantGuard)
  getOAuthUrl(
    @TenantId() tenantId: string,
    @Param('provider') provider: IntegrationProvider,
  ) {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const prefix = process.env.API_PREFIX || 'api/v1';
    const redirectUri = `${baseUrl}/${prefix}/integrations/oauth/callback`;
    const url = this.integrationService.getOAuthUrl(
      provider,
      tenantId,
      redirectUri,
    );
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

      await this.integrationService.handleOAuthCallback(
        provider,
        tenantId,
        code,
        redirectUri,
      );
      return res.redirect(`${integrationsPath}?success=${provider}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return res.redirect(`${integrationsPath}?error=${encodeURIComponent(message)}`);
    }
  }

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
