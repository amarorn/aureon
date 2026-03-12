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
import { AppointmentService } from './appointment.service';
import { GoogleCalendarService } from './google-calendar.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('appointments')
@UseGuards(TenantGuard)
export class AppointmentController {
  constructor(
    private readonly service: AppointmentService,
    private readonly googleCalendar: GoogleCalendarService,
  ) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateAppointmentDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.findAll(tenantId, startDate, endDate);
  }

  @Get('google-calendar/status')
  async googleStatus(@TenantId() tenantId: string) {
    const diagnostics = await this.googleCalendar.getDiagnostics(tenantId);
    return {
      connected: diagnostics.ready,
      ...diagnostics,
    };
  }

  @Post('google-calendar/sync')
  syncToGoogle(@TenantId() tenantId: string) {
    return this.service.syncAllToGoogle(tenantId);
  }

  @Post('google-calendar/import')
  importFromGoogle(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start =
      startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end =
      endDate ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    return this.service.importFromGoogle(tenantId, start, end);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
