import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment]), IntegrationsModule],
  providers: [AppointmentService, GoogleCalendarService],
  controllers: [AppointmentController],
})
export class CalendarModule {}
