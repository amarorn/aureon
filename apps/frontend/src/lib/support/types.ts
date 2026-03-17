import type { ChatMessage } from "@/lib/assistant/types";

export interface SupportRuntimeContext {
  tenantId?: string;
  tenantName?: string;
  hasTutorial?: boolean;
  connectedIntegrations?: string[];
  disconnectedIntegrations?: string[];
}

export interface SupportChatRequestBody {
  currentPath?: string;
  runtimeContext?: SupportRuntimeContext;
  messages: ChatMessage[];
}
