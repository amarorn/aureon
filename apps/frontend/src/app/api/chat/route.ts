import { NextRequest } from "next/server";
import {
  createAssistantStream,
  extractLeadData,
  getChunkText,
  hasLeadContactInfo,
  persistLeadConversation,
} from "@/lib/assistant/rag";
import type { ChatMessage, ChatRequestBody } from "@/lib/assistant/types";

export const runtime = "nodejs";

function toSsePayload(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, assistantMessageId, sessionId }: ChatRequestBody =
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
          const { config, stream } = await createAssistantStream(messages);

          for await (const chunk of stream) {
            const text = getChunkText(chunk);
            if (text) {
              fullText += text;
              controller.enqueue(encoder.encode(toSsePayload({ text })));
            }
          }

          const lead = await extractLeadData({
            config,
            messages,
            assistantReply: fullText,
          });

          if (hasLeadContactInfo(lead)) {
            controller.enqueue(encoder.encode(toSsePayload({ lead })));
            void persistLeadConversation({
              config,
              lead,
              messages,
              assistantReply: fullText,
              assistantMessageId:
                assistantMessageId?.trim() || `assistant-${Date.now()}`,
              sessionId,
            }).catch((error) => {
              console.error("[assistant][persistLeadConversation]", error);
            });
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("[assistant][stream]", err);
          controller.enqueue(
            encoder.encode(
              toSsePayload({ error: "Erro ao processar resposta." })
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
  } catch (err) {
    console.error("[/api/chat]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
