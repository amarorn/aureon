import { NextRequest } from "next/server";
import {
  createSupportStream,
  extractSupportActions,
  getSupportChunkText,
} from "@/lib/support/rag";
import type { SupportChatRequestBody } from "@/lib/support/types";

export const runtime = "nodejs";

function toSsePayload(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
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
