import { ChatAnthropic } from "@langchain/anthropic";
import {
  AIMessage,
  type AIMessageChunk,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { WeaviateStore } from "@langchain/weaviate";
import weaviate, { ApiKey, type WeaviateClient } from "weaviate-client";
import { z } from "zod";
import { formatDocumentsForPrompt, getAssistantSystemPrompt, getKnowledgeDocuments } from "@/lib/aureon-knowledge";
import { getAssistantConfig, type AssistantConfig } from "@/lib/assistant/config";
import type { ChatMessage, LeadData } from "@/lib/assistant/types";
import type { Document } from "@langchain/core/documents";

type ChatModel = ChatAnthropic | ChatOpenAI;

interface RetrieverHandle {
  strategy: AssistantConfig["vectorProvider"];
  retrieve: (query: string) => Promise<Document[]>;
}

interface WeaviateFactory {
  connectToWeaviateCloud?: (
    clusterUrl: string,
    options?: Record<string, unknown>
  ) => Promise<WeaviateClient>;
  client?: (options: Record<string, unknown>) => Promise<WeaviateClient>;
}

const leadCaptureSchema = z.object({
  nome: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  empresa: z.string().nullable().optional(),
  planoInteresse: z.string().nullable().optional(),
  modulosInteresse: z.array(z.string()).nullable().optional(),
  tamanhoTime: z.string().nullable().optional(),
  desafioPrincipal: z.string().nullable().optional(),
});

let retrieverPromise: Promise<RetrieverHandle> | null = null;

function createChatModel(
  config: AssistantConfig,
  overrides?: {
    temperature?: number;
    maxTokens?: number;
  }
): ChatModel {
  const temperature = overrides?.temperature ?? 0.2;
  const maxTokens = overrides?.maxTokens ?? 700;

  if (config.llmProvider === "openai") {
    return new ChatOpenAI({
      apiKey: config.openaiApiKey,
      model: config.llmModel,
      temperature,
      maxTokens,
      maxRetries: 2,
    });
  }

  return new ChatAnthropic({
    apiKey: config.anthropicApiKey,
    model: config.llmModel,
    temperature,
    maxTokens,
    maxRetries: 2,
  });
}

function createEmbeddings(config: AssistantConfig) {
  if (!config.openaiApiKey) {
    return undefined;
  }

  return new OpenAIEmbeddings({
    apiKey: config.openaiApiKey,
    model: config.embeddingsModel,
  });
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lexicalRetrieve(query: string, documents: Document[], limit = 4) {
  const stopWords = new Set([
    "para",
    "como",
    "mais",
    "sobre",
    "qual",
    "quais",
    "com",
    "sem",
    "uma",
    "das",
    "dos",
    "que",
    "tem",
    "por",
    "ser",
    "sao",
    "são",
  ]);

  const terms = normalizeText(query)
    .split(" ")
    .filter((term) => term.length > 2 && !stopWords.has(term));

  const scored = documents
    .map((document) => {
      const searchableText = normalizeText(
        `${String(document.metadata.sectionTitle ?? "")} ${String(document.metadata.category ?? "")} ${document.pageContent}`
      );

      const score = terms.reduce((total, term) => {
        return searchableText.includes(term) ? total + 2 : total;
      }, 0);

      return { document, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => item.document);

  return scored.length ? scored : documents.slice(0, limit);
}

async function createWeaviateClient(config: AssistantConfig) {
  const factory = weaviate as unknown as WeaviateFactory;
  const headers = config.openaiApiKey
    ? { "X-OpenAI-Api-Key": config.openaiApiKey }
    : undefined;

  if (config.weaviateUrl && factory.connectToWeaviateCloud) {
    return factory.connectToWeaviateCloud(config.weaviateUrl, {
      authCredentials: config.weaviateApiKey ? new ApiKey(config.weaviateApiKey) : undefined,
      headers,
      skipInitChecks: true,
    });
  }

  if (factory.client) {
    return factory.client({
      scheme: config.weaviateScheme,
      host: config.weaviateHost,
      apiKey: config.weaviateApiKey ? new ApiKey(config.weaviateApiKey) : undefined,
      headers,
      skipInitChecks: true,
    });
  }

  throw new Error("Cliente Weaviate não disponível na instalação atual.");
}

async function createRetriever(config: AssistantConfig): Promise<RetrieverHandle> {
  const documents = getKnowledgeDocuments(config);
  const embeddings = createEmbeddings(config);

  if (config.vectorProvider === "pinecone" && embeddings && config.pineconeApiKey && config.pineconeIndex) {
    try {
      const client = new Pinecone({ apiKey: config.pineconeApiKey });
      const store = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex: client.Index(config.pineconeIndex),
        namespace: config.pineconeNamespace,
      });

      return {
        strategy: "pinecone",
        retrieve: (query) => store.similaritySearch(query, 4),
      };
    } catch (error) {
      console.error("[assistant][pinecone]", error);
    }
  }

  if (config.vectorProvider === "weaviate" && embeddings && (config.weaviateUrl || config.weaviateHost)) {
    try {
      const client = await createWeaviateClient(config);
      const store = await WeaviateStore.fromExistingIndex(embeddings, {
        client,
        indexName: config.weaviateIndexName,
        textKey: config.weaviateTextKey,
        metadataKeys: ["sectionId", "sectionTitle", "category", "chunk"],
      });

      return {
        strategy: "weaviate",
        retrieve: (query) => store.similaritySearch(query, 4),
      };
    } catch (error) {
      console.error("[assistant][weaviate]", error);
    }
  }

  return {
    strategy: "lexical",
    retrieve: async (query) => lexicalRetrieve(query, documents, 4),
  };
}

async function getRetriever(config: AssistantConfig) {
  if (!retrieverPromise) {
    retrieverPromise = createRetriever(config);
  }

  return retrieverPromise;
}

function toLangChainMessage(message: ChatMessage): BaseMessage {
  return message.role === "assistant"
    ? new AIMessage(message.content)
    : new HumanMessage(message.content);
}

function buildPromptMessages(
  messages: ChatMessage[],
  retrievedContext: string,
  config: AssistantConfig
) {
  const history = messages.slice(0, -1).map(toLangChainMessage);
  const latestMessage = messages.at(-1);

  if (!latestMessage) {
    throw new Error("Nenhuma mensagem recebida para o assistente.");
  }

  return [
    new SystemMessage(getAssistantSystemPrompt(config)),
    ...history,
    new HumanMessage(
      `Contexto recuperado da base de conhecimento:\n${retrievedContext}\n\nPergunta atual do visitante:\n${latestMessage.content}\n\nResponda primeiro à pergunta atual. Se houver intenção comercial, faça apenas a próxima pergunta de qualificação mais útil.`
    ),
  ];
}

function cleanValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanEmail(value?: string | null) {
  const email = cleanValue(value)?.toLowerCase();
  return email && /\S+@\S+\.\S+/.test(email) ? email : undefined;
}

function cleanPhone(value?: string | null) {
  const phone = cleanValue(value);
  if (!phone) {
    return undefined;
  }

  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? phone : undefined;
}

function sanitizeLeadData(
  data: z.infer<typeof leadCaptureSchema>
): LeadData {
  const modulosInteresse = (data.modulosInteresse ?? [])
    .map((item) => cleanValue(item))
    .filter((item): item is string => Boolean(item));

  return {
    ...(cleanValue(data.nome) ? { nome: cleanValue(data.nome) } : {}),
    ...(cleanEmail(data.email) ? { email: cleanEmail(data.email) } : {}),
    ...(cleanPhone(data.telefone) ? { telefone: cleanPhone(data.telefone) } : {}),
    ...(cleanValue(data.empresa) ? { empresa: cleanValue(data.empresa) } : {}),
    ...(cleanValue(data.planoInteresse)
      ? { planoInteresse: cleanValue(data.planoInteresse) }
      : {}),
    ...(modulosInteresse.length ? { modulosInteresse } : {}),
    ...(cleanValue(data.tamanhoTime)
      ? { tamanhoTime: cleanValue(data.tamanhoTime) }
      : {}),
    ...(cleanValue(data.desafioPrincipal)
      ? { desafioPrincipal: cleanValue(data.desafioPrincipal) }
      : {}),
  };
}

export function getChunkText(chunk: AIMessageChunk) {
  if (typeof chunk.content === "string") {
    return chunk.content;
  }

  if (!Array.isArray(chunk.content)) {
    return "";
  }

  return chunk.content
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object" && "text" in item) {
        return typeof item.text === "string" ? item.text : "";
      }

      return "";
    })
    .join("");
}

export function hasLeadContactInfo(lead: LeadData) {
  return Boolean(lead.email || lead.telefone);
}

export function latestMessageContainsLeadSignal(value: string) {
  const normalized = value.toLowerCase();

  return (
    /\S+@\S+\.\S+/.test(value) ||
    value.replace(/\D/g, "").length >= 10 ||
    /(meu nome e|meu nome é|me chamo|sou da empresa|trabalho na|telefone|whatsapp|email)/i.test(
      normalized
    )
  );
}

export async function createAssistantStream(messages: ChatMessage[]) {
  const config = getAssistantConfig();
  const retriever = await getRetriever(config);
  const latestQuestion = messages.at(-1)?.content ?? "";
  const retrievedDocuments = await retriever.retrieve(latestQuestion);
  const promptMessages = buildPromptMessages(
    messages,
    formatDocumentsForPrompt(retrievedDocuments),
    config
  );
  const model = createChatModel(config);
  const stream = await model.stream(promptMessages);

  return {
    config,
    retrievedDocuments,
    retrievalStrategy: retriever.strategy,
    stream,
  };
}

export async function extractLeadData(params: {
  config: AssistantConfig;
  messages: ChatMessage[];
  assistantReply: string;
}) {
  const { config, messages, assistantReply } = params;
  const model = createChatModel(config, { temperature: 0, maxTokens: 400 });
  const extractor = model.withStructuredOutput(leadCaptureSchema);

  const transcript = messages
    .map((message) => `${message.role === "assistant" ? "Assistente" : "Visitante"}: ${message.content}`)
    .join("\n");

  const extracted = await extractor.invoke([
    new SystemMessage(
      "Extraia somente dados de lead informados explicitamente ou confirmados durante a conversa. Se um campo não estiver claro, devolva null. Não invente dados."
    ),
    new HumanMessage(
      `Conversa até agora:\n${transcript}\n\nResposta final do assistente:\n${assistantReply}`
    ),
  ]);

  return sanitizeLeadData(extracted);
}

export async function persistLeadConversation(params: {
  config: AssistantConfig;
  lead: LeadData;
  messages: ChatMessage[];
  assistantReply: string;
  assistantMessageId: string;
  sessionId?: string;
}) {
  const { config, lead, messages, assistantReply, assistantMessageId, sessionId } =
    params;

  if (!config.backendBaseUrl || !config.tenantId || !hasLeadContactInfo(lead)) {
    return;
  }

  const transcript: ChatMessage[] = [
    ...messages.filter((message) => message.content.trim()),
    {
      id: assistantMessageId,
      role: "assistant",
      content: assistantReply,
    },
  ];

  await fetch(`${config.backendBaseUrl}/conversations/webchat/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Id": config.tenantId,
    },
    body: JSON.stringify({
      sessionId,
      lead: {
        nome: lead.nome,
        email: lead.email,
        telefone: lead.telefone,
        empresa: lead.empresa,
        planoInteresse: lead.planoInteresse,
        modulosInteresse: lead.modulosInteresse,
        tamanhoTime: lead.tamanhoTime,
        desafioPrincipal: lead.desafioPrincipal,
      },
      messages: transcript,
    }),
  });
}
