import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('tasks')
@UseGuards(TenantGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateTaskDto) {
    return this.taskService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('contactId') contactId?: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    return this.taskService.findAll(tenantId, contactId, opportunityId);
  }

  @Delete('bulk/automatic')
  deleteAutomaticTasks(@TenantId() tenantId: string) {
    return this.taskService.deleteByTitle(tenantId, 'Tarefa automática');
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.taskService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.update(tenantId, id, dto);
  }

  @Put(':id/toggle')
  toggleComplete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.taskService.toggleComplete(tenantId, id);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.taskService.remove(tenantId, id);
  }
}
