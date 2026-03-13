import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationService } from './integration.service';
import { IntegrationProvider } from './entities/integration.entity';
import { Channel, ChannelType } from '../conversations/entities/channel.entity';
import { Conversation, ConversationStatus } from '../conversations/entities/conversation.entity';
import { Message, MessageDirection } from '../conversations/entities/message.entity';
import { Contact } from '../crm/entities/contact.entity';

interface InstagramConfig {
  igUserId: string;      // Instagram Business Account ID
  pageAccessToken: string;
}

interface IgParticipant {
  id: string;
  name?: string;
  username?: string;
}

interface IgConversation {
  id: string;
  updated_time?: string;
  participants?: { data: IgParticipant[] };
}

interface IgMessage {
  id: string;
  from?: { id: string; name?: string; username?: string };
  to?: { data: IgParticipant[] };
  message?: string;
  timestamp?: string;
}

export interface InstagramSyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly integrationService: IntegrationService,
    private readonly configService: ConfigService,
    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  // ── Config & Status ────────────────────────────────────────────────────────

  async isConnected(tenantId: string): Promise<boolean> {
    const cfg = await this.getConfig(tenantId);
    return !!(cfg?.igUserId && cfg?.pageAccessToken);
  }

  private async getConfig(tenantId: string): Promise<InstagramConfig | null> {
    const integration = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.INSTAGRAM,
    );
    if (!integration || integration.status !== 'connected') return null;
    const cfg = integration.config as InstagramConfig | null;
    if (!cfg?.igUserId || !cfg?.pageAccessToken) return null;
    return cfg;
  }

  async saveConfig(
    tenantId: string,
    igUserId: string,
    pageAccessToken: string,
  ): Promise<{ igUserId: string; username?: string }> {
    // Validate token + get account info
    const info = await this.fetchAccountInfo(igUserId, pageAccessToken);

    const existing = await this.integrationService.findByProvider(
      tenantId,
      IntegrationProvider.INSTAGRAM,
    );
    if (existing) {
      await this.integrationService.updateConfig(tenantId, IntegrationProvider.INSTAGRAM, {
        igUserId,
        pageAccessToken,
        username: info.username,
        name: info.name,
      });
      await this.integrationService.setStatus(tenantId, existing.id, 'connected');
    } else {
      await this.integrationService.create(tenantId, {
        provider: IntegrationProvider.INSTAGRAM,
        config: { igUserId, pageAccessToken, username: info.username, name: info.name },
      });
      const created = await this.integrationService.findByProvider(
        tenantId,
        IntegrationProvider.INSTAGRAM,
      );
      if (created) {
        await this.integrationService.setStatus(tenantId, created.id, 'connected');
      }
    }
    return { igUserId, username: info.username };
  }

  async getAccountInfo(tenantId: string): Promise<{ igUserId: string; username?: string; name?: string } | null> {
    const cfg = await this.getConfig(tenantId);
    if (!cfg) return null;
    const integration = await this.integrationService.findByProvider(tenantId, IntegrationProvider.INSTAGRAM);
    const storedConfig = integration?.config as Record<string, unknown> | null;
    return {
      igUserId: cfg.igUserId,
      username: storedConfig?.username as string | undefined,
      name: storedConfig?.name as string | undefined,
    };
  }

  private async fetchAccountInfo(
    igUserId: string,
    token: string,
  ): Promise<{ username?: string; name?: string }> {
    try {
      const res = await fetch(
        `${GRAPH_BASE}/${igUserId}?fields=id,name,username&access_token=${token}`,
      );
      if (!res.ok) return {};
      const data = (await res.json()) as { username?: string; name?: string };
      return data;
    } catch {
      return {};
    }
  }

  // ── Webhook verification (Meta challenge) ──────────────────────────────────

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken =
      this.configService.get<string>('INSTAGRAM_WEBHOOK_VERIFY_TOKEN') ?? 'aureon_instagram_verify';
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  }

  // ── Webhook event processor ────────────────────────────────────────────────

  async processWebhookEvent(
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (payload.object !== 'instagram') return;
    const entries = payload.entry as Array<{
      id?: string;
      messaging?: IgWebhookMessaging[];
    }>;
    if (!Array.isArray(entries)) return;

    const cfg = await this.getConfig(tenantId);
    if (!cfg) return;

    for (const entry of entries) {
      for (const event of entry.messaging ?? []) {
        if (!event.message?.text) continue;
        try {
          await this.processInboundMessage(tenantId, cfg, event);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Instagram webhook processing error: ${msg}`);
        }
      }
    }
  }

  private async processInboundMessage(
    tenantId: string,
    cfg: InstagramConfig,
    event: IgWebhookMessaging,
  ): Promise<void> {
    const senderIgsid = event.sender?.id;
    const recipientId = event.recipient?.id;
    const messageId = event.message?.mid;
    const text = event.message?.text ?? '';

    if (!senderIgsid || !messageId) return;

    // Skip messages sent by the page itself (outbound echo)
    const isOutbound = recipientId !== cfg.igUserId;
    if (isOutbound) return;

    // Avoid duplicate processing
    const existing = await this.messageRepo.findOne({
      where: { tenantId, externalId: messageId },
    });
    if (existing) return;

    // Fetch sender info
    const senderInfo = await this.fetchUserInfo(senderIgsid, cfg.pageAccessToken);
    const contact = await this.findOrCreateContact(tenantId, senderIgsid, senderInfo.name || senderIgsid);
    const channel = await this.ensureInstagramChannel(tenantId);
    const conversation = await this.findOrCreateConversation(tenantId, contact.id, channel.id, senderIgsid);

    await this.messageRepo.save(
      this.messageRepo.create({
        tenantId,
        conversationId: conversation.id,
        content: text,
        direction: MessageDirection.INBOUND,
        externalId: messageId,
        metadata: {
          senderIgsid,
          senderName: senderInfo.name,
          provider: 'instagram',
          timestamp: event.timestamp,
        },
        templateId: null,
      }),
    );

    this.logger.log(`Instagram DM saved: from=${senderIgsid} mid=${messageId}`);
  }

  // ── Sync (poll) ────────────────────────────────────────────────────────────

  async syncConversations(tenantId: string): Promise<InstagramSyncResult> {
    const result: InstagramSyncResult = { synced: 0, skipped: 0, errors: [] };
    const cfg = await this.getConfig(tenantId);
    if (!cfg) throw new Error('Instagram não configurado para este tenant.');

    const listRes = await fetch(
      `${GRAPH_BASE}/${cfg.igUserId}/conversations?platform=instagram&fields=id,participants,updated_time&limit=25&access_token=${cfg.pageAccessToken}`,
    );
    if (!listRes.ok) {
      result.errors.push(`Instagram conversations error: ${await listRes.text()}`);
      return result;
    }
    const list = (await listRes.json()) as { data?: IgConversation[] };
    const conversations = list.data ?? [];

    const channel = await this.ensureInstagramChannel(tenantId);

    for (const igConv of conversations) {
      try {
        // Identify the other participant (not our page)
        const otherParticipant = igConv.participants?.data?.find(
          (p) => p.id !== cfg.igUserId,
        );
        if (!otherParticipant) continue;

        const contact = await this.findOrCreateContact(
          tenantId,
          otherParticipant.id,
          otherParticipant.name || otherParticipant.username || otherParticipant.id,
        );
        const conversation = await this.findOrCreateConversation(
          tenantId,
          contact.id,
          channel.id,
          otherParticipant.id,
        );

        // Fetch messages in this conversation
        const msgRes = await fetch(
          `${GRAPH_BASE}/${igConv.id}/messages?fields=id,from,to,message,timestamp&limit=50&access_token=${cfg.pageAccessToken}`,
        );
        if (!msgRes.ok) {
          result.errors.push(`Messages for ${igConv.id}: ${await msgRes.text()}`);
          continue;
        }
        const msgData = (await msgRes.json()) as { data?: IgMessage[] };
        for (const msg of msgData.data ?? []) {
          if (!msg.message) continue;
          const existingMsg = await this.messageRepo.findOne({
            where: { tenantId, externalId: msg.id },
          });
          if (existingMsg) { result.skipped++; continue; }

          const isOutbound = msg.from?.id === cfg.igUserId;
          await this.messageRepo.save(
            this.messageRepo.create({
              tenantId,
              conversationId: conversation.id,
              content: msg.message,
              direction: isOutbound ? MessageDirection.OUTBOUND : MessageDirection.INBOUND,
              externalId: msg.id,
              metadata: {
                fromId: msg.from?.id,
                fromName: msg.from?.name || msg.from?.username,
                provider: 'instagram',
                timestamp: msg.timestamp,
              },
              templateId: null,
            }),
          );
          result.synced++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Conversation ${igConv.id}: ${msg}`);
      }
    }

    return result;
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  async sendDm(
    tenantId: string,
    recipientIgsid: string,
    text: string,
  ): Promise<{ messageId: string | null; error?: string }> {
    const cfg = await this.getConfig(tenantId);
    if (!cfg) return { messageId: null, error: 'Instagram não configurado para este tenant' };

    const res = await fetch(`${GRAPH_BASE}/${cfg.igUserId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.pageAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientIgsid },
        message: { text },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.warn(`Instagram sendDm failed to=${recipientIgsid}: ${err}`);
      return { messageId: null, error: err };
    }

    const data = (await res.json()) as { message_id?: string };
    const messageId = data.message_id ?? null;

    // Persist outbound message
    const channel = await this.ensureInstagramChannel(tenantId);
    const contact = await this.findOrCreateContact(tenantId, recipientIgsid, recipientIgsid);
    const conversation = await this.findOrCreateConversation(tenantId, contact.id, channel.id, recipientIgsid);
    if (messageId) {
      await this.messageRepo.save(
        this.messageRepo.create({
          tenantId,
          conversationId: conversation.id,
          content: text,
          direction: MessageDirection.OUTBOUND,
          externalId: messageId,
          metadata: { recipientIgsid, provider: 'instagram' },
          templateId: null,
        }),
      );
    }

    this.logger.log(`Instagram DM sent to=${recipientIgsid} messageId=${messageId}`);
    return { messageId };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async ensureInstagramChannel(tenantId: string): Promise<Channel> {
    let channel = await this.channelRepo.findOne({
      where: { tenantId, type: ChannelType.INSTAGRAM },
    });
    if (!channel) {
      channel = this.channelRepo.create({
        tenantId,
        type: ChannelType.INSTAGRAM,
        name: 'Instagram DM',
        config: { provider: 'instagram' },
      });
      channel = await this.channelRepo.save(channel);
    }
    return channel;
  }

  private async findOrCreateContact(
    tenantId: string,
    igsid: string,
    name: string,
  ): Promise<Contact> {
    // Use phone field as IGSID identifier (prefixed to avoid collision)
    const igsidKey = `ig:${igsid}`;
    let contact = await this.contactRepo.findOne({ where: { tenantId, phone: igsidKey } });
    if (!contact) {
      contact = this.contactRepo.create({
        tenantId,
        name,
        phone: igsidKey,
        source: 'instagram',
      });
      contact = await this.contactRepo.save(contact);
    }
    return contact;
  }

  private async findOrCreateConversation(
    tenantId: string,
    contactId: string,
    channelId: string,
    igsid: string,
  ): Promise<Conversation> {
    const existing = await this.conversationRepo.findOne({
      where: { tenantId, channelId, externalId: igsid },
    });
    if (existing) return existing;

    const conv = this.conversationRepo.create({
      tenantId,
      contactId,
      channelId,
      externalId: igsid,
      status: ConversationStatus.OPEN,
      assignedTo: null,
    });
    return this.conversationRepo.save(conv);
  }

  private async fetchUserInfo(
    igsid: string,
    token: string,
  ): Promise<{ name?: string; username?: string }> {
    try {
      const res = await fetch(
        `${GRAPH_BASE}/${igsid}?fields=name,username&access_token=${token}`,
      );
      if (!res.ok) return {};
      return (await res.json()) as { name?: string; username?: string };
    } catch {
      return {};
    }
  }
}

// ── Types for webhook payload ─────────────────────────────────────────────────

interface IgWebhookMessaging {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    attachments?: Array<{ type: string; payload: { url?: string } }>;
  };
}
