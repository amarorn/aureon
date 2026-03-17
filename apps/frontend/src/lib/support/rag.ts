import { ChatAnthropic } from "@langchain/anthropic";
import {
  AIMessage,
  type AIMessageChunk,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { getAssistantConfig, type AssistantConfig } from "@/lib/assistant/config";
import type { ChatMessage } from "@/lib/assistant/types";
import {
  formatSupportDocumentsForPrompt,
  formatSupportRuntimeContext,
  getSupportKnowledgeDocuments,
  getSupportSystemPrompt,
} from "@/lib/support/knowledge";
import { resolveSupportRouteContext } from "@/lib/support/route-context";
import type { Document } from "@langchain/core/documents";
import type { SupportRuntimeContext } from "@/lib/support/types";
import {
  buildSupportActionInstructions,
  sanitizeSupportActions,
  supportActionResponseSchema,
} from "@/lib/support/action-catalog";
import type { SupportUiAction } from "@/lib/support/ui-actions";

type ChatModel = ChatAnthropic | ChatOpenAI;

function createSupportChatModel(config: AssistantConfig): ChatModel {
  if (config.llmProvider === "openai") {
    return new ChatOpenAI({
      apiKey: config.openaiApiKey,
      model: config.llmModel,
      temperature: 0.2,
      maxTokens: 900,
      maxRetries: 2,
    });
  }

  return new ChatAnthropic({
    apiKey: config.anthropicApiKey,
    model: config.llmModel,
    temperature: 0.2,
    maxTokens: 900,
    maxRetries: 2,
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

function lexicalRetrieve(query: string, documents: Document[], limit = 6) {
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
    "onde",
    "essa",
    "esse",
  ]);

  const terms = normalizeText(query)
    .split(" ")
    .filter((term) => term.length > 2 && !stopWords.has(term));

  const scored = documents
    .map((document) => {
      const searchableText = normalizeText(
        `${String(document.metadata.routeLabel ?? "")} ${String(
          document.metadata.category ?? ""
        )} ${document.pageContent}`
      );

      const score = terms.reduce((total, term) => {
        if (!searchableText.includes(term)) {
          return total;
        }

        return total + 2;
      }, 0);

      return { document, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => item.document);

  return scored.length ? scored : documents.slice(0, limit);
}

function dedupeDocuments(documents: Document[]) {
  const seen = new Set<string>();

  return documents.filter((document) => {
    const key = JSON.stringify(document.metadata) + document.pageContent;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function toLangChainMessage(message: ChatMessage): BaseMessage {
  return message.role === "assistant"
    ? new AIMessage(message.content)
    : new HumanMessage(message.content);
}

function buildPromptMessages(params: {
  messages: ChatMessage[];
  currentPath?: string;
  runtimeContext?: SupportRuntimeContext;
  retrievedContext: string;
}) {
  const { messages, currentPath, retrievedContext, runtimeContext } = params;
  const history = messages.slice(0, -1).map(toLangChainMessage);
  const latestMessage = messages.at(-1);

  if (!latestMessage) {
    throw new Error("Nenhuma mensagem recebida para o suporte.");
  }

  const routeContext = resolveSupportRouteContext(currentPath);

  return [
    new SystemMessage(getSupportSystemPrompt(currentPath)),
    ...history,
    new HumanMessage(
      `Contexto recuperado do produto:\n${retrievedContext}\n\nRota atual: ${
        currentPath ?? "não informada"
      }\nTela interpretada: ${
        routeContext?.label ?? "não mapeada"
      }\n\nContexto adicional do ambiente:\n${formatSupportRuntimeContext(
        runtimeContext
      )}\n\nPergunta do usuário:\n${
        latestMessage.content
      }\n\nResponda com orientação prática, diga o melhor caminho e, quando aplicável, traga um passo a passo curto.`
    ),
  ];
}

export function getSupportChunkText(chunk: AIMessageChunk) {
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

export async function createSupportStream(params: {
  messages: ChatMessage[];
  currentPath?: string;
  runtimeContext?: SupportRuntimeContext;
}) {
  const { messages, currentPath, runtimeContext } = params;
  const config = getAssistantConfig();
  const documents = getSupportKnowledgeDocuments(currentPath);
  const routeContext = resolveSupportRouteContext(currentPath);
  const latestQuestion = messages.at(-1)?.content ?? "";
  const query = routeContext
    ? `${routeContext.label} ${latestQuestion}`
    : latestQuestion;
  const relevantDocuments = dedupeDocuments(lexicalRetrieve(query, documents, 6)).slice(
    0,
    6
  );
  const promptMessages = buildPromptMessages({
    messages,
    currentPath,
    runtimeContext,
    retrievedContext: formatSupportDocumentsForPrompt(relevantDocuments),
  });
  const model = createSupportChatModel(config);
  const stream = await model.stream(promptMessages);

  return {
    stream,
    routeContext,
  };
}

export async function extractSupportActions(params: {
  messages: ChatMessage[];
  currentPath?: string;
  runtimeContext?: SupportRuntimeContext;
  assistantReply: string;
}) {
  const { messages, currentPath, runtimeContext, assistantReply } = params;
  const config = getAssistantConfig();
  const model = createSupportChatModel(config);
  const extractor = model.withStructuredOutput(supportActionResponseSchema);

  const transcript = messages
    .map(
      (message) =>
        `${message.role === "assistant" ? "Assistente" : "Usuário"}: ${message.content}`
    )
    .join("\n");

  const extracted = await extractor.invoke([
    new SystemMessage(buildSupportActionInstructions({ currentPath, runtimeContext })),
    new HumanMessage(
      `Conversa até agora:\n${transcript}\n\nResposta final do assistente:\n${assistantReply}\n\nRetorne apenas ações úteis para a próxima interação do usuário com a interface.`
    ),
  ]);

  return sanitizeSupportActions({
    currentPath,
    actions: extracted.actions,
  }) as SupportUiAction[];
}
