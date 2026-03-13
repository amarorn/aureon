import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationService } from '../integrations/integration.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';
import { Channel, ChannelType } from '../conversations/entities/channel.entity';
import { Conversation, ConversationStatus } from '../conversations/entities/conversation.entity';
import { Message, MessageDirection } from '../conversations/entities/message.entity';
import { Contact } from '../crm/entities/contact.entity';

interface OutlookEmailAddress {
  name?: string;
  address?: string;
}

interface OutlookRecipient {
  emailAddress?: OutlookEmailAddress;
}

interface OutlookMessage {
  id: string;
  conversationId: string;
  subject?: string;
  from?: OutlookRecipient;
  toRecipients?: OutlookRecipient[];
  ccRecipients?: OutlookRecipient[];
  body?: { content?: string; contentType?: string };
  receivedDateTime?: string;
  isRead?: boolean;
}

export interface EmailSyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

@Injectable()
export class OutlookService {
  private readonly logger = new Logger(OutlookService.name);

  constructor(
    private readonly integrationService: IntegrationService,
    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  // ── Token management ───────────────────────────────────────────────────────

  async getAccessToken(tenantId: string): Promise<string> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.OUTLOOK,
    );
    if (!integration || integration.status !== 'connected') {
      throw new Error('Outlook não conectado para este tenant.');
    }
    const creds = integration.credentials as Record<string, unknown>;
    const expiryDate = creds?.expiry_date as number | undefined;
    const bufferMs = 60_000;
    if (expiryDate && Date.now() < expiryDate - bufferMs) {
      return creds.access_token as string;
    }
    const refreshToken = creds?.refresh_token as string | undefined;
    if (!refreshToken) throw new Error('Outlook: refresh_token não encontrado. Reconecte a conta.');
    const refreshed = await this.integrationService.refreshOutlookAccessToken(tenantId, refreshToken);
    const newCreds = {
      ...creds,
      access_token: refreshed.access_token,
      expiry_date: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
    };
    await this.integrationService.updateCredentials(tenantId, IntegrationProvider.OUTLOOK, newCreds);
    return refreshed.access_token;
  }

  async isConnected(tenantId: string): Promise<boolean> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.OUTLOOK,
    );
    return integration?.status === 'connected';
  }

  async getEmailAddress(tenantId: string): Promise<string | null> {
    try {
      const token = await this.getAccessToken(tenantId);
      const res = await fetch(`${GRAPH_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { mail?: string; userPrincipalName?: string };
      return data.mail ?? data.userPrincipalName ?? null;
    } catch {
      return null;
    }
  }

  // ── Sync ───────────────────────────────────────────────────────────────────

  async syncInbox(tenantId: string, maxMessages = 50): Promise<EmailSyncResult> {
    const result: EmailSyncResult = { synced: 0, skipped: 0, errors: [] };
    const token = await this.getAccessToken(tenantId);
    const myEmail = await this.getEmailAddress(tenantId);

    const listRes = await fetch(
      `${GRAPH_BASE}/me/mailFolders/inbox/messages?$top=${maxMessages}&$orderby=receivedDateTime desc&$select=id,conversationId,subject,from,toRecipients,ccRecipients,body,receivedDateTime,isRead`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!listRes.ok) {
      result.errors.push(`Outlook list error: ${await listRes.text()}`);
      return result;
    }
    const list = (await listRes.json()) as { value?: OutlookMessage[] };
    const messages = list.value ?? [];

    const channel = await this.ensureEmailChannel(tenantId);

    for (const msg of messages) {
      try {
        const existing = await this.messageRepo.findOne({
          where: { tenantId, externalId: msg.id },
        });
        if (existing) {
          result.skipped++;
          continue;
        }
        await this.processOutlookMessage(tenantId, channel, msg, myEmail);
        result.synced++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Message ${msg.id}: ${errMsg}`);
        this.logger.warn(`Outlook sync error for message ${msg.id}: ${errMsg}`);
      }
    }

    return result;
  }

  private async processOutlookMessage(
    tenantId: string,
    channel: Channel,
    msg: OutlookMessage,
    myEmail: string | null,
  ): Promise<void> {
    const fromEmail = msg.from?.emailAddress?.address ?? '';
    const fromName = msg.from?.emailAddress?.name ?? fromEmail;
    const toEmail = msg.toRecipients?.[0]?.emailAddress?.address ?? '';
    const toName = msg.toRecipients?.[0]?.emailAddress?.name ?? toEmail;
    const subject = msg.subject ?? '(sem assunto)';
    const conversationId = msg.conversationId;

    const direction =
      myEmail && fromEmail.toLowerCase() === myEmail.toLowerCase()
        ? MessageDirection.OUTBOUND
        : MessageDirection.INBOUND;

    const contactEmail = direction === MessageDirection.INBOUND ? fromEmail : toEmail;
    const contactName = direction === MessageDirection.INBOUND ? fromName : toName;

    if (!contactEmail) return;

    const contact = await this.findOrCreateContact(tenantId, contactEmail, contactName);
    const conversation = await this.findOrCreateEmailConversation(
      tenantId,
      contact.id,
      channel.id,
      conversationId,
      subject,
    );

    const body = msg.body?.content ?? '(sem conteúdo)';
    const ccList = (msg.ccRecipients ?? [])
      .map((r) => r.emailAddress?.address)
      .filter(Boolean)
      .join(', ');

    await this.messageRepo.save(
      this.messageRepo.create({
        tenantId,
        conversationId: conversation.id,
        content: body,
        direction,
        externalId: msg.id,
        metadata: {
          subject,
          from: fromEmail,
          to: toEmail,
          cc: ccList || undefined,
          conversationId,
          contentType: msg.body?.contentType,
          provider: 'outlook',
        },
        templateId: null,
      }),
    );

    await this.conversationRepo.update(conversation.id, { subject });
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  async sendEmail(
    tenantId: string,
    to: string,
    subject: string,
    bodyHtml: string,
    options?: { cc?: string },
  ): Promise<void> {
    const token = await this.getAccessToken(tenantId);
    const myEmail = await this.getEmailAddress(tenantId);

    const toRecipients: OutlookRecipient[] = [{ emailAddress: { address: to } }];
    const ccRecipients: OutlookRecipient[] = options?.cc
      ? [{ emailAddress: { address: options.cc } }]
      : [];

    const payload = {
      message: {
        subject,
        body: { contentType: 'HTML', content: bodyHtml },
        toRecipients,
        ...(ccRecipients.length ? { ccRecipients } : {}),
      },
      saveToSentItems: true,
    };

    const res = await fetch(`${GRAPH_BASE}/me/sendMail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Outlook send failed: ${await res.text()}`);

    // Save outbound message to conversations
    const channel = await this.ensureEmailChannel(tenantId);
    const contact = await this.findOrCreateContact(tenantId, to, to);
    // For sent messages, conversationId is unknown until synced; use a placeholder
    const conversation = await this.findOrCreateEmailConversation(
      tenantId,
      contact.id,
      channel.id,
      `sent-${Date.now()}-${to}`,
      subject,
    );
    await this.messageRepo.save(
      this.messageRepo.create({
        tenantId,
        conversationId: conversation.id,
        content: bodyHtml,
        direction: MessageDirection.OUTBOUND,
        externalId: null,
        metadata: { subject, to, from: myEmail ?? 'me', provider: 'outlook' },
        templateId: null,
      }),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async ensureEmailChannel(tenantId: string): Promise<Channel> {
    let channel = await this.channelRepo.findOne({
      where: { tenantId, type: ChannelType.EMAIL, name: 'Outlook' },
    });
    if (!channel) {
      channel = this.channelRepo.create({
        tenantId,
        type: ChannelType.EMAIL,
        name: 'Outlook',
        config: { provider: 'outlook' },
      });
      channel = await this.channelRepo.save(channel);
    }
    return channel;
  }

  private async findOrCreateContact(
    tenantId: string,
    email: string,
    name?: string,
  ): Promise<Contact> {
    let contact = await this.contactRepo.findOne({ where: { tenantId, email } });
    if (!contact) {
      contact = this.contactRepo.create({ tenantId, email, name: name || email, source: 'outlook' });
      contact = await this.contactRepo.save(contact);
    }
    return contact;
  }

  private async findOrCreateEmailConversation(
    tenantId: string,
    contactId: string,
    channelId: string,
    externalId: string,
    subject: string,
  ): Promise<Conversation> {
    const existing = await this.conversationRepo.findOne({
      where: { tenantId, channelId, externalId },
    });
    if (existing) return existing;

    const conv = this.conversationRepo.create({
      tenantId,
      contactId,
      channelId,
      externalId,
      subject,
      status: ConversationStatus.OPEN,
      assignedTo: null,
    });
    return this.conversationRepo.save(conv);
  }
}
