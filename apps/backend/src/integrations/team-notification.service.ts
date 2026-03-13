import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { AppEventsService, APP_EVENTS } from '../common/events/app-events.service';
import { Contact } from '../crm/entities/contact.entity';
import { Opportunity } from '../crm/entities/opportunity.entity';
import { Stage } from '../crm/entities/stage.entity';
import { Task } from '../crm/entities/task.entity';
import { IntegrationProvider } from './entities/integration.entity';
import { IntegrationService } from './integration.service';
import type { WorkflowEventPayload } from '../automation/workflow.types';

type TeamNotificationProvider =
  | IntegrationProvider.SLACK
  | IntegrationProvider.MICROSOFT_TEAMS;

interface SlackConfig {
  webhookUrl: string;
}

interface TeamsConfig {
  webhookUrl: string;
}

interface NotificationMessage {
  title: string;
  summary: string;
  facts?: Array<{ name: string; value: string }>;
  linkUrl?: string | null;
  linkLabel?: string | null;
  severity?: 'good' | 'warning' | 'attention' | 'info';
}

@Injectable()
export class TeamNotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TeamNotificationService.name);
  private overdueTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly integrationService: IntegrationService,
    private readonly config: ConfigService,
    private readonly appEvents: AppEventsService,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(Stage)
    private readonly stageRepo: Repository<Stage>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  onModuleInit(): void {
    this.appEvents.on(APP_EVENTS.CONTACT_CREATED, (payload) =>
      this.handleContactCreated(payload),
    );
    this.appEvents.on(APP_EVENTS.OPPORTUNITY_MOVED, (payload) =>
      this.handleOpportunityMoved(payload),
    );

    const scanMs = Math.max(
      60_000,
      Number(this.config.get('CRM_ALERTS_OVERDUE_SCAN_MS', 300_000)),
    );
    this.overdueTimer = setInterval(() => {
      void this.scanOverdueTasks();
    }, scanMs);
    void this.scanOverdueTasks();
  }

  onModuleDestroy(): void {
    if (this.overdueTimer) clearInterval(this.overdueTimer);
  }

  async isConnected(
    tenantId: string,
    provider: TeamNotificationProvider,
  ): Promise<boolean> {
    const cfg = await this.getProviderConfig(tenantId, provider);
    return !!cfg?.webhookUrl;
  }

  async saveSlackConfig(tenantId: string, webhookUrl: string): Promise<void> {
    await this.upsertProvider(tenantId, IntegrationProvider.SLACK, {
      webhookUrl: webhookUrl.trim(),
    });
  }

  async saveTeamsConfig(tenantId: string, webhookUrl: string): Promise<void> {
    await this.upsertProvider(tenantId, IntegrationProvider.MICROSOFT_TEAMS, {
      webhookUrl: webhookUrl.trim(),
    });
  }

  private async handleContactCreated(payload: WorkflowEventPayload): Promise<void> {
    if (!payload.contactId) return;
    const contact = await this.contactRepo.findOne({
      where: { id: payload.contactId, tenantId: payload.tenantId },
    });
    if (!contact) return;

    await this.broadcast(payload.tenantId, {
      title: 'Novo lead no CRM',
      summary: `${contact.name} entrou no pipeline`,
      severity: 'good',
      facts: [
        { name: 'Nome', value: contact.name },
        { name: 'Email', value: contact.email || 'Nao informado' },
        { name: 'Telefone', value: contact.phone || 'Nao informado' },
        { name: 'Origem', value: contact.source || 'Nao informada' },
      ],
      linkUrl: `${this.frontendBaseUrl()}/app/contacts/${contact.id}`,
      linkLabel: 'Abrir contato',
    });
  }

  private async handleOpportunityMoved(
    payload: WorkflowEventPayload,
  ): Promise<void> {
    if (!payload.opportunityId || !payload.toStageId) return;

    const [opportunity, stage] = await Promise.all([
      this.opportunityRepo.findOne({
        where: { id: payload.opportunityId, tenantId: payload.tenantId },
        relations: ['contact', 'pipeline', 'stage'],
      }),
      this.stageRepo.findOne({
        where: { id: payload.toStageId, tenantId: payload.tenantId },
      }),
    ]);

    if (!opportunity || !stage?.isWon) return;

    await this.broadcast(payload.tenantId, {
      title: 'Deal fechado',
      summary: `${opportunity.title} foi marcada como ganha`,
      severity: 'attention',
      facts: [
        {
          name: 'Cliente',
          value: opportunity.contact?.name || 'Nao vinculado',
        },
        { name: 'Pipeline', value: opportunity.pipeline?.name || 'Nao informado' },
        { name: 'Etapa', value: stage.name },
        { name: 'Valor', value: this.formatCurrency(Number(opportunity.value)) },
      ],
      linkUrl: `${this.frontendBaseUrl()}/app/opportunities/${opportunity.id}`,
      linkLabel: 'Abrir oportunidade',
    });
  }

  private async scanOverdueTasks(): Promise<void> {
    const now = new Date();
    const overdueTasks = await this.taskRepo.find({
      where: {
        isCompleted: false,
        dueDate: LessThanOrEqual(now),
        overdueNotifiedAt: IsNull(),
      },
      relations: ['contact', 'opportunity'],
      order: { dueDate: 'ASC' },
      take: 50,
    });

    for (const task of overdueTasks) {
      await this.broadcast(task.tenantId, {
        title: 'Tarefa vencida',
        summary: task.title,
        severity: 'warning',
        facts: [
          {
            name: 'Contato',
            value: task.contact?.name || 'Nao vinculado',
          },
          {
            name: 'Oportunidade',
            value: task.opportunity?.title || 'Nao vinculada',
          },
          {
            name: 'Vencimento',
            value: task.dueDate ? this.formatDateTime(task.dueDate) : 'Sem prazo',
          },
        ],
        linkUrl: task.opportunityId
          ? `${this.frontendBaseUrl()}/app/opportunities/${task.opportunityId}`
          : task.contactId
            ? `${this.frontendBaseUrl()}/app/contacts/${task.contactId}`
            : `${this.frontendBaseUrl()}/app`,
        linkLabel: task.opportunityId
          ? 'Abrir oportunidade'
          : task.contactId
            ? 'Abrir contato'
            : 'Abrir CRM',
      });

      task.overdueNotifiedAt = new Date();
      await this.taskRepo.save(task);
    }
  }

  private async broadcast(
    tenantId: string,
    message: NotificationMessage,
  ): Promise<void> {
    const providers: TeamNotificationProvider[] = [
      IntegrationProvider.SLACK,
      IntegrationProvider.MICROSOFT_TEAMS,
    ];

    for (const provider of providers) {
      const cfg = await this.getProviderConfig(tenantId, provider);
      if (!cfg?.webhookUrl) continue;

      try {
        if (provider === IntegrationProvider.SLACK) {
          await this.sendSlack(cfg.webhookUrl, message);
        } else {
          await this.sendTeams(cfg.webhookUrl, message);
        }
      } catch (error) {
        this.logger.warn(
          `Notification failed provider=${provider} tenant=${tenantId}: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }
  }

  private async upsertProvider(
    tenantId: string,
    provider: TeamNotificationProvider,
    config: Record<string, string>,
  ): Promise<void> {
    const existing = await this.integrationService.findByProvider(tenantId, provider);
    if (existing) {
      await this.integrationService.updateConfig(tenantId, provider, config);
      await this.integrationService.setStatus(tenantId, existing.id, 'connected');
      return;
    }

    await this.integrationService.create(tenantId, { provider, config });
    const created = await this.integrationService.findByProvider(tenantId, provider);
    if (created) {
      await this.integrationService.setStatus(tenantId, created.id, 'connected');
    }
  }

  private async getProviderConfig(
    tenantId: string,
    provider: TeamNotificationProvider,
  ): Promise<SlackConfig | TeamsConfig | null> {
    const integration = await this.integrationService.findByProvider(tenantId, provider);
    if (integration?.status === 'connected' && integration.config) {
      return integration.config as unknown as SlackConfig | TeamsConfig;
    }

    if (provider === IntegrationProvider.SLACK) {
      const webhookUrl = this.config
        .get<string>('INTEGRATION_SLACK_WEBHOOK_URL', '')
        .trim();
      return webhookUrl ? { webhookUrl } : null;
    }

    const webhookUrl = this.config
      .get<string>('INTEGRATION_MICROSOFT_TEAMS_WEBHOOK_URL', '')
      .trim();
    return webhookUrl ? { webhookUrl } : null;
  }

  private async sendSlack(
    webhookUrl: string,
    message: NotificationMessage,
  ): Promise<void> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${message.title}: ${message.summary}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: message.title,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message.summary,
            },
          },
          ...(message.facts?.length
            ? [
                {
                  type: 'section',
                  fields: message.facts.map((fact) => ({
                    type: 'mrkdwn',
                    text: `*${fact.name}*\n${fact.value}`,
                  })),
                },
              ]
            : []),
          ...(message.linkUrl
            ? [
                {
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: {
                        type: 'plain_text',
                        text: message.linkLabel || 'Abrir CRM',
                      },
                      url: message.linkUrl,
                    },
                  ],
                },
              ]
            : []),
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  }

  private async sendTeams(
    webhookUrl: string,
    message: NotificationMessage,
  ): Promise<void> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              type: 'AdaptiveCard',
              version: '1.2',
              body: [
                {
                  type: 'TextBlock',
                  text: message.title,
                  weight: 'Bolder',
                  size: 'Medium',
                  wrap: true,
                },
                {
                  type: 'TextBlock',
                  text: message.summary,
                  wrap: true,
                },
                ...(message.facts?.length
                  ? [
                      {
                        type: 'FactSet',
                        facts: message.facts,
                      },
                    ]
                  : []),
              ],
              actions: message.linkUrl
                ? [
                    {
                      type: 'Action.OpenUrl',
                      title: message.linkLabel || 'Abrir CRM',
                      url: message.linkUrl,
                    },
                  ]
                : [],
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  }

  private frontendBaseUrl(): string {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private formatDateTime(value: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(value);
  }
}
