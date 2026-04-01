import { NextRequest } from "next/server";
import {
  createSupportStream,
  extractSupportActions,
  getSupportChunkText,
} from "@/lib/support/rag";
import type { SupportChatRequestBody } from "@/lib/support/types";

export const runtime = "nodejs";

const AI_ASSISTANT_FEATURE = "ai.assistant";

function toSsePayload(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

async function verifyAiAssistantAccess(
  req: NextRequest,
): Promise<Response | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({
        error: "Autenticação necessária para o assistente IA.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  const apiBase = (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api/v1"
  ).replace(/\/$/, "");
  const tenantHeader = req.headers.get("x-tenant-id");
  const meHeaders: Record<string, string> = { Authorization: auth };
  if (tenantHeader?.trim()) {
    meHeaders["X-Tenant-Id"] = tenantHeader.trim();
  }
  const me = await fetch(`${apiBase}/auth/me`, { headers: meHeaders });
  if (!me.ok) {
    return new Response(JSON.stringify({ error: "Sessão inválida." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const data = (await me.json()) as {
    user?: { isPlatformUser?: boolean };
    features?: string[];
  };
  const impersonating = Boolean(tenantHeader?.trim());
  if (data.user?.isPlatformUser === true && !impersonating) {
    return null;
  }
  if (!data.features?.includes(AI_ASSISTANT_FEATURE)) {
    return new Response(
      JSON.stringify({
        error:
          "Assistente IA não está no plano. Contrate o add-on ou solicite liberação ao administrador.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const authError = await verifyAiAssistantAccess(req);
    if (authError) {
      return authError;
    }

    const { messages, currentPath, runtimeContext }: SupportChatRequestBody =
      await req.json();

    if (!messages?.length) {
      return new Response("Missing messages", { status: 400 });
    }

    const latestMessage = messages.at(-1);
    if (!latestMessage || latestMessage.role !== "user") {
      return new Response("Last message must be from user", { status: 400 });
    }

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";

        try {
          const { stream, routeContext } = await createSupportStream({
            messages,
            currentPath,
            runtimeContext,
          });

          if (routeContext) {
            controller.enqueue(
              encoder.encode(
                toSsePayload({
                  context: {
                    label: routeContext.label,
                  },
                })
              )
            );
          }

          for await (const chunk of stream) {
            const text = getSupportChunkText(chunk);
            if (text) {
              fullText += text;
              controller.enqueue(encoder.encode(toSsePayload({ text })));
            }
          }

          const actions = await extractSupportActions({
            messages,
            currentPath,
            runtimeContext,
            assistantReply: fullText,
          });

          if (actions.length) {
            controller.enqueue(encoder.encode(toSsePayload({ actions })));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          console.error("[support-chat][stream]", error);
          controller.enqueue(
            encoder.encode(
              toSsePayload({
                error: "Erro ao processar a orientação do suporte.",
              })
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[/api/support-chat]", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao iniciar o suporte." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
