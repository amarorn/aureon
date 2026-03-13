import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationService } from '../integrations/integration.service';
import { IntegrationProvider } from '../integrations/entities/integration.entity';
import { Channel, ChannelType } from '../conversations/entities/channel.entity';
import { Conversation, ConversationStatus } from '../conversations/entities/conversation.entity';
import { Message, MessageDirection } from '../conversations/entities/message.entity';
import { Contact } from '../crm/entities/contact.entity';

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  payload?: {
    headers?: GmailHeader[];
    body?: { data?: string };
    parts?: GmailPart[];
    mimeType?: string;
  };
  internalDate?: string;
}

export interface EmailSyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

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
      IntegrationProvider.GMAIL,
    );
    if (!integration || integration.status !== 'connected') {
      throw new Error('Gmail não conectado para este tenant.');
    }
    const creds = integration.credentials as Record<string, unknown>;
    const expiryDate = creds?.expiry_date as number | undefined;
    const bufferMs = 60_000;
    if (expiryDate && Date.now() < expiryDate - bufferMs) {
      return creds.access_token as string;
    }
    // Refresh
    const refreshToken = creds?.refresh_token as string | undefined;
    if (!refreshToken) throw new Error('Gmail: refresh_token não encontrado. Reconecte a conta.');
    const refreshed = await this.integrationService.refreshGoogleAccessToken(tenantId, refreshToken);
    const newCreds = {
      ...creds,
      access_token: refreshed.access_token,
      expiry_date: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
    };
    await this.integrationService.updateCredentials(tenantId, IntegrationProvider.GMAIL, newCreds);
    return refreshed.access_token;
  }

  async isConnected(tenantId: string): Promise<boolean> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.GMAIL,
    );
    return integration?.status === 'connected';
  }

  async getEmailAddress(tenantId: string): Promise<string | null> {
    try {
      const token = await this.getAccessToken(tenantId);
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { emailAddress?: string };
      return data.emailAddress ?? null;
    } catch {
      return null;
    }
  }

  // ── Sync ───────────────────────────────────────────────────────────────────

  async syncInbox(tenantId: string, maxMessages = 50): Promise<EmailSyncResult> {
    const result: EmailSyncResult = { synced: 0, skipped: 0, errors: [] };
    const token = await this.getAccessToken(tenantId);
    const myEmail = await this.getEmailAddress(tenantId);

    // List recent inbox messages
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxMessages}&labelIds=INBOX`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!listRes.ok) {
      result.errors.push(`Gmail list error: ${await listRes.text()}`);
      return result;
    }
    const list = (await listRes.json()) as { messages?: { id: string; threadId: string }[] };
    const messages = list.messages ?? [];

    const channel = await this.ensureEmailChannel(tenantId);

    for (const { id } of messages) {
      try {
        // Skip if already synced
        const existing = await this.messageRepo.findOne({
          where: { tenantId, externalId: id },
        });
        if (existing) {
          result.skipped++;
          continue;
        }

        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!msgRes.ok) {
          result.errors.push(`Failed to fetch message ${id}`);
          continue;
        }
        const gmailMsg = (await msgRes.json()) as GmailMessage;
        await this.processGmailMessage(tenantId, channel, gmailMsg, myEmail);
        result.synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Message ${id}: ${msg}`);
        this.logger.warn(`Gmail sync error for message ${id}: ${msg}`);
      }
    }

    return result;
  }

  private async processGmailMessage(
    tenantId: string,
    channel: Channel,
    gmailMsg: GmailMessage,
    myEmail: string | null,
  ): Promise<void> {
    const headers = gmailMsg.payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

    const fromRaw = getHeader('From');
    const toRaw = getHeader('To');
    const subject = getHeader('Subject') || '(sem assunto)';
    const messageId = getHeader('Message-ID');
    const threadId = gmailMsg.threadId;

    const { email: fromEmail, name: fromName } = parseEmailAddress(fromRaw);
    const direction =
      myEmail && fromEmail.toLowerCase() === myEmail.toLowerCase()
        ? MessageDirection.OUTBOUND
        : MessageDirection.INBOUND;

    const contactEmail = direction === MessageDirection.INBOUND ? fromEmail : parseEmailAddress(toRaw).email;
    const contactName = direction === MessageDirection.INBOUND ? fromName : parseEmailAddress(toRaw).name;

    if (!contactEmail) return;

    const contact = await this.findOrCreateContact(tenantId, contactEmail, contactName);
    const conversation = await this.findOrCreateEmailConversation(
      tenantId,
      contact.id,
      channel.id,
      threadId,
      subject,
    );

    const body = extractGmailBody(gmailMsg);

    const message = this.messageRepo.create({
      tenantId,
      conversationId: conversation.id,
      content: body || '(sem conteúdo)',
      direction,
      externalId: gmailMsg.id,
      metadata: {
        subject,
        from: fromRaw,
        to: toRaw,
        cc: getHeader('Cc'),
        messageId,
        threadId,
        provider: 'gmail',
      },
      templateId: null,
    });
    await this.messageRepo.save(message);

    // Update conversation updatedAt
    await this.conversationRepo.update(conversation.id, { subject });
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  async sendEmail(
    tenantId: string,
    to: string,
    subject: string,
    bodyHtml: string,
    options?: { cc?: string; replyToMessageId?: string; threadId?: string },
  ): Promise<{ messageId: string; threadId: string }> {
    const token = await this.getAccessToken(tenantId);
    const myEmail = await this.getEmailAddress(tenantId);

    const headers = [
      `From: ${myEmail ?? 'me'}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
    ];
    if (options?.cc) headers.push(`Cc: ${options.cc}`);
    if (options?.replyToMessageId) headers.push(`In-Reply-To: ${options.replyToMessageId}`);
    if (options?.replyToMessageId) headers.push(`References: ${options.replyToMessageId}`);

    const raw = Buffer.from(headers.join('\r\n') + '\r\n\r\n' + bodyHtml)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const body: Record<string, unknown> = { raw };
    if (options?.threadId) body.threadId = options.threadId;

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Gmail send failed: ${await res.text()}`);
    const sent = (await res.json()) as { id: string; threadId: string };

    // Save outbound message to conversations
    const channel = await this.ensureEmailChannel(tenantId);
    const contact = await this.findOrCreateContact(tenantId, to, to);
    const conversation = await this.findOrCreateEmailConversation(
      tenantId,
      contact.id,
      channel.id,
      sent.threadId,
      subject,
    );
    await this.messageRepo.save(
      this.messageRepo.create({
        tenantId,
        conversationId: conversation.id,
        content: bodyHtml,
        direction: MessageDirection.OUTBOUND,
        externalId: sent.id,
        metadata: { subject, to, from: myEmail ?? 'me', threadId: sent.threadId, provider: 'gmail' },
        templateId: null,
      }),
    );

    return { messageId: sent.id, threadId: sent.threadId };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async ensureEmailChannel(tenantId: string): Promise<Channel> {
    let channel = await this.channelRepo.findOne({
      where: { tenantId, type: ChannelType.EMAIL, name: 'Gmail' },
    });
    if (!channel) {
      channel = this.channelRepo.create({
        tenantId,
        type: ChannelType.EMAIL,
        name: 'Gmail',
        config: { provider: 'gmail' },
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
      contact = this.contactRepo.create({
        tenantId,
        email,
        name: name || email,
        source: 'gmail',
      });
      contact = await this.contactRepo.save(contact);
    }
    return contact;
  }

  private async findOrCreateEmailConversation(
    tenantId: string,
    contactId: string,
    channelId: string,
    threadId: string,
    subject: string,
  ): Promise<Conversation> {
    const existing = await this.conversationRepo.findOne({
      where: { tenantId, channelId, externalId: threadId },
    });
    if (existing) return existing;

    const conv = this.conversationRepo.create({
      tenantId,
      contactId,
      channelId,
      externalId: threadId,
      subject,
      status: ConversationStatus.OPEN,
      assignedTo: null,
    });
    return this.conversationRepo.save(conv);
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function parseEmailAddress(raw: string): { email: string; name: string } {
  if (!raw) return { email: '', name: '' };
  const match = raw.match(/^(.*?)\s*<([^>]+)>/);
  if (match) {
    return { name: match[1].replace(/"/g, '').trim(), email: match[2].trim() };
  }
  return { email: raw.trim(), name: raw.trim() };
}

function extractGmailBody(msg: GmailMessage): string {
  const payload = msg.payload;
  if (!payload) return '';

  // Simple (non-multipart) message
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  // Multipart: prefer text/plain, then text/html
  return findPartBody(payload.parts ?? [], 'text/plain')
    ?? findPartBody(payload.parts ?? [], 'text/html')
    ?? '';
}

function findPartBody(parts: GmailPart[], mimeType: string): string | null {
  for (const part of parts) {
    if (part.mimeType === mimeType && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    if (part.parts) {
      const nested = findPartBody(part.parts, mimeType);
      if (nested) return nested;
    }
  }
  return null;
}
