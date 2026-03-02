import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InteractionService } from './interaction.service';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('interactions')
@UseGuards(TenantGuard)
export class InteractionController {
  constructor(private readonly interactionService: InteractionService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateInteractionDto) {
    return this.interactionService.create(tenantId, dto);
  }

  @Get()
  find(
    @TenantId() tenantId: string,
    @Query('contactId') contactId?: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    if (opportunityId) {
      return this.interactionService.findByOpportunity(tenantId, opportunityId);
    }
    if (contactId) {
      return this.interactionService.findByContact(tenantId, contactId);
    }
    return [];
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.interactionService.remove(tenantId, id);
  }
}
