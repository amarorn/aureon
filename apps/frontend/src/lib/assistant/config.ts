import path from "node:path";
import { loadEnvConfig } from "@next/env";

export type AssistantLlmProvider = "openai" | "anthropic";
export type AssistantVectorProvider = "pinecone" | "weaviate" | "lexical";

export interface AssistantConfig {
  companyName: string;
  websiteUrl: string;
  llmProvider: AssistantLlmProvider;
  llmModel: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  embeddingsModel: string;
  vectorProvider: AssistantVectorProvider;
  backendBaseUrl?: string;
  tenantId?: string;
  whatsappNumber?: string;
  whatsappPrefillText: string;
  pineconeApiKey?: string;
  pineconeIndex?: string;
  pineconeNamespace?: string;
  weaviateUrl?: string;
  weaviateHost?: string;
  weaviateScheme: "http" | "https";
  weaviateApiKey?: string;
  weaviateIndexName: string;
  weaviateTextKey: string;
}

let envLoaded = false;

function ensureEnvLoaded() {
  if (envLoaded) {
    return;
  }

  const currentDir = process.cwd();
  const candidateDirs = [currentDir, path.resolve(currentDir, "../..")];

  for (const dir of new Set(candidateDirs)) {
    try {
      loadEnvConfig(dir);
    } catch {
      continue;
    }
  }

  envLoaded = true;
}

function readEnv(name: string) {
  ensureEnvLoaded();

  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readFirstEnv(...names: string[]) {
  return names.map(readEnv).find(Boolean);
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizePathSegment(value: string) {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
}

function buildBackendBaseUrl() {
  const explicitUrl = readFirstEnv("NEXT_PUBLIC_API_URL", "ASSISTANT_BACKEND_URL");
  if (explicitUrl) {
    return normalizeBaseUrl(explicitUrl);
  }

  const apiBaseUrl = readEnv("API_BASE_URL");
  if (!apiBaseUrl) {
    return undefined;
  }

  const apiPrefix = readEnv("API_PREFIX");
  if (!apiPrefix) {
    return normalizeBaseUrl(apiBaseUrl);
  }

  return `${normalizeBaseUrl(apiBaseUrl)}/${normalizePathSegment(apiPrefix)}`;
}

function looksLikeAnthropicKey(value?: string) {
  return Boolean(value?.startsWith("sk-ant-"));
}

function looksLikeOpenAIKey(value?: string) {
  if (!value) {
    return false;
  }

  return value.startsWith("sk-proj-") || (value.startsWith("sk-") && !value.startsWith("sk-ant-"));
}

function resolveLlmProvider(
  preferredProvider: string | undefined,
  openaiApiKey: string | undefined,
  anthropicApiKey: string | undefined
): AssistantLlmProvider | undefined {
  if (preferredProvider === "openai" && openaiApiKey) {
    return "openai";
  }

  if (preferredProvider === "anthropic" && anthropicApiKey) {
    return "anthropic";
  }

  if (openaiApiKey) {
    return "openai";
  }

  if (anthropicApiKey) {
    return "anthropic";
  }

  return undefined;
}

function resolveVectorProvider(params: {
  preferredProvider?: string;
  pineconeApiKey?: string;
  pineconeIndex?: string;
  weaviateUrl?: string;
  weaviateHost?: string;
  embeddingsReady: boolean;
}): AssistantVectorProvider {
  const {
    preferredProvider,
    pineconeApiKey,
    pineconeIndex,
    weaviateUrl,
    weaviateHost,
    embeddingsReady,
  } = params;

  if (preferredProvider === "pinecone" && embeddingsReady && pineconeApiKey && pineconeIndex) {
    return "pinecone";
  }

  if (preferredProvider === "weaviate" && embeddingsReady && (weaviateUrl || weaviateHost)) {
    return "weaviate";
  }

  if (embeddingsReady && pineconeApiKey && pineconeIndex) {
    return "pinecone";
  }

  if (embeddingsReady && (weaviateUrl || weaviateHost)) {
    return "weaviate";
  }

  return "lexical";
}

export function getAssistantConfig(): AssistantConfig {
  const rawOpenAIKey = readEnv("OPENAI_API_KEY");
  const rawAnthropicKey = readEnv("ANTHROPIC_API_KEY");

  const openaiApiKey =
    rawOpenAIKey ?? (looksLikeOpenAIKey(rawAnthropicKey) ? rawAnthropicKey : undefined);
  const anthropicApiKey = looksLikeAnthropicKey(rawAnthropicKey)
    ? rawAnthropicKey
    : undefined;

  const llmProvider = resolveLlmProvider(
    readEnv("ASSISTANT_LLM_PROVIDER"),
    openaiApiKey,
    anthropicApiKey
  );

  if (!llmProvider) {
    throw new Error(
      "Nenhuma chave de LLM configurada. Defina OPENAI_API_KEY ou ANTHROPIC_API_KEY no .env raiz."
    );
  }

  const pineconeApiKey = readEnv("PINECONE_API_KEY");
  const pineconeIndex = readFirstEnv("PINECONE_INDEX", "PINECONE_INDEX_NAME");
  const weaviateUrl = readFirstEnv("WEAVIATE_URL", "WEAVIATE_CLUSTER_URL");
  const weaviateHost = readEnv("WEAVIATE_HOST");

  return {
    companyName: readEnv("ASSISTANT_COMPANY_NAME") ?? "Aureon",
    websiteUrl: readEnv("ASSISTANT_WEBSITE_URL") ?? "https://aureon.app",
    llmProvider,
    llmModel:
      readEnv("ASSISTANT_LLM_MODEL") ??
      (llmProvider === "openai" ? "gpt-4.1-mini" : "claude-sonnet-4-5-20250929"),
    openaiApiKey,
    anthropicApiKey,
    embeddingsModel: readEnv("ASSISTANT_EMBEDDINGS_MODEL") ?? "text-embedding-3-small",
    vectorProvider: resolveVectorProvider({
      preferredProvider: readEnv("ASSISTANT_VECTOR_PROVIDER"),
      pineconeApiKey,
      pineconeIndex,
      weaviateUrl,
      weaviateHost,
      embeddingsReady: Boolean(openaiApiKey),
    }),
    backendBaseUrl: buildBackendBaseUrl(),
    tenantId: readFirstEnv("NEXT_PUBLIC_TENANT_ID", "DEFAULT_TENANT_ID"),
    whatsappNumber: readFirstEnv(
      "NEXT_PUBLIC_WHATSAPP_NUMBER",
      "WHATSAPP_BUSINESS_NUMBER",
      "WHATSAPP_NUMBER"
    ),
    whatsappPrefillText:
      readFirstEnv("NEXT_PUBLIC_WHATSAPP_MESSAGE", "WHATSAPP_PREFILL_TEXT") ??
      "Olá! Vim pelo site do Aureon e gostaria de saber mais.",
    pineconeApiKey,
    pineconeIndex,
    pineconeNamespace: readEnv("PINECONE_NAMESPACE"),
    weaviateUrl,
    weaviateHost,
    weaviateScheme: (readEnv("WEAVIATE_SCHEME") ?? "https") as "http" | "https",
    weaviateApiKey: readEnv("WEAVIATE_API_KEY"),
    weaviateIndexName: readEnv("WEAVIATE_INDEX") ?? "AureonKnowledge",
    weaviateTextKey: readEnv("WEAVIATE_TEXT_KEY") ?? "text",
  };
}
