import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ReviewRequestService } from './review-request.service';
import { CreateReviewRequestDto, CompleteReviewDto } from './dto/create-review-request.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { FeaturesGuard } from '../auth/features.guard';
import { RequireFeature } from '../auth/features.decorator';

@Controller('reputation')
@UseGuards(TenantGuard, FeaturesGuard)
@RequireFeature('reputation.core')
export class ReviewRequestController {
  constructor(private readonly service: ReviewRequestService) {}

  @Get('stats')
  getStats(@TenantId() tenantId: string) {
    return this.service.getStats(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateReviewRequestDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post(':id/send')
  send(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.send(tenantId, id);
  }

  @Post(':id/complete')
  complete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CompleteReviewDto,
  ) {
    return this.service.complete(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
