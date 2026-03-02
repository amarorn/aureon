import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('conversations/:conversationId/messages')
@UseGuards(TenantGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  send(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messageService.send(tenantId, conversationId, dto);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messageService.findAll(tenantId, conversationId);
  }

  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Param('id') id: string,
  ) {
    return this.messageService.findOne(tenantId, id);
  }
}
