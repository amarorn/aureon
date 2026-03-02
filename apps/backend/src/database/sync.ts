import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../.env') });

import { DataSource } from 'typeorm';
import { Tenant } from '../tenant/tenant.entity';
import {
  Contact,
  Tag,
  Pipeline,
  Stage,
  Opportunity,
  Interaction,
  Task,
} from '../crm/entities';
import {
  Channel,
  Conversation,
  Message,
  MessageAttachment,
  MessageTemplate,
} from '../conversations/entities';
import { Call } from '../telephony/entities/call.entity';
import { CallQueueItem } from '../telephony/entities/call-queue-item.entity';
import { Workflow } from '../automation/entities/workflow.entity';
import { WorkflowRun } from '../automation/entities/workflow-run.entity';
import { Integration } from '../integrations/entities/integration.entity';
import { Appointment } from '../calendar/entities/appointment.entity';
import { EmailCampaign } from '../email-marketing/entities/email-campaign.entity';
import { EmailCampaignRecipient } from '../email-marketing/entities/email-campaign-recipient.entity';
import { EmailTemplate } from '../email-marketing/entities/email-template.entity';
import { ReviewRequest } from '../reputation/entities/review-request.entity';
import { Proposal } from '../proposals/entities/proposal.entity';
import { ProposalItem } from '../proposals/entities/proposal-item.entity';

const entities = [
  Tenant,
  Contact,
  Tag,
  Pipeline,
  Stage,
  Opportunity,
  Interaction,
  Task,
  Channel,
  Conversation,
  Message,
  MessageAttachment,
  MessageTemplate,
  Call,
  CallQueueItem,
  Workflow,
  WorkflowRun,
  Integration,
  Appointment,
  EmailCampaign,
  EmailCampaignRecipient,
  EmailTemplate,
  ReviewRequest,
  Proposal,
  ProposalItem,
];

async function sync() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'aureon',
    password: process.env.DB_PASSWORD || 'aureon',
    database: process.env.DB_NAME || 'aureon',
    entities,
    synchronize: true,
  });

  await ds.initialize();
  console.log('Schema sincronizado com sucesso.');
  await ds.destroy();
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
