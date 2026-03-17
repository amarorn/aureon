import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(configDir, "../..");
loadEnvConfig(workspaceRoot);

const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/+$/, "");
const apiPrefix = process.env.API_PREFIX?.replace(/^\/+/, "").replace(/\/+$/, "");
const derivedApiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  (apiBaseUrl ? [apiBaseUrl, apiPrefix].filter(Boolean).join("/") : undefined);

const publicEnv = {
  ...(derivedApiUrl ? { NEXT_PUBLIC_API_URL: derivedApiUrl } : {}),
  ...(process.env.NEXT_PUBLIC_TENANT_ID || process.env.DEFAULT_TENANT_ID
    ? {
        NEXT_PUBLIC_TENANT_ID:
          process.env.NEXT_PUBLIC_TENANT_ID ?? process.env.DEFAULT_TENANT_ID!,
      }
    : {}),
  ...(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
  process.env.WHATSAPP_BUSINESS_NUMBER ||
  process.env.WHATSAPP_NUMBER
    ? {
        NEXT_PUBLIC_WHATSAPP_NUMBER:
          process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ??
          process.env.WHATSAPP_BUSINESS_NUMBER ??
          process.env.WHATSAPP_NUMBER!,
      }
    : {}),
  NEXT_PUBLIC_WHATSAPP_MESSAGE:
    process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE ??
    process.env.WHATSAPP_PREFILL_TEXT ??
    "Olá! Vim pelo site do Aureon e gostaria de saber mais.",
};

const nextConfig: NextConfig = {
  env: publicEnv,
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
