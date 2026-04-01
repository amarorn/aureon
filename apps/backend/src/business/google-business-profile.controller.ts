import { Controller, Get, UseGuards } from '@nestjs/common';
import { GoogleBusinessProfileService } from './google-business-profile.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';

@Controller('business/google')
@UseGuards(TenantGuard, FeaturesGuard)
@RequireFeature('business.google')
export class GoogleBusinessProfileController {
  constructor(private readonly gbp: GoogleBusinessProfileService) {}

  @Get('status')
  status(@TenantId() tenantId: string) {
    return this.gbp.getStatus(tenantId);
  }
}
