import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'path';
import { TenantModule } from './tenant/tenant.module';
import { HealthModule } from './health/health.module';
import { CrmModule } from './crm/crm.module';
import { ConversationsModule } from './conversations/conversations.module';
import { TelephonyModule } from './telephony/telephony.module';
import { AutomationModule } from './automation/automation.module';
import { EventsModule } from './common/events/events.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { CalendarModule } from './calendar/calendar.module';
import { EmailMarketingModule } from './email-marketing/email-marketing.module';
import { ReputationModule } from './reputation/reputation.module';
import { ProposalsModule } from './proposals/proposals.module';

@Module({
  imports: [
    EventsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../.env'),
        resolve(process.cwd(), '../../.env'),
        resolve(__dirname, '../../../.env'),
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get('DB_PORT', 5433),
        username: config.get('DB_USER', 'aureon'),
        password: config.get('DB_PASSWORD', 'aureon'),
        database: config.get('DB_NAME', 'aureon'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') === 'development',
        logging:
          config.get('DB_LOGGING', 'true') !== 'false' &&
          config.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    TenantModule,
    HealthModule,
    CrmModule,
    ConversationsModule,
    TelephonyModule,
    AutomationModule,
    DashboardModule,
    IntegrationsModule,
    CalendarModule,
    EmailMarketingModule,
    ReputationModule,
    ProposalsModule,
  ],
})
export class AppModule {}
