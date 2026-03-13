import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { OutlookCalendarService } from './outlook-calendar.service';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { IntegrationsModule } from '../integrations/integrations.module';
import { Contact } from '../crm/entities/contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Contact]), IntegrationsModule],
  providers: [AppointmentService, GoogleCalendarService, OutlookCalendarService, BookingService],
  controllers: [AppointmentController, BookingController],
})
export class CalendarModule {}
