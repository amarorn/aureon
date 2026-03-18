export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export interface LeadData {
  nome?: string;
  email?: string;
  telefone?: string;
  empresa?: string;
  planoInteresse?: string;
  modulosInteresse?: string[];
  tamanhoTime?: string;
  desafioPrincipal?: string;
}

export interface ChatRequestBody {
  sessionId?: string;
  assistantMessageId?: string;
  messages: ChatMessage[];
}
