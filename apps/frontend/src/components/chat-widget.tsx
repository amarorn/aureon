"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type {
  ChatMessage,
  ChatRequestBody,
  LeadData,
} from "@/lib/assistant/types";

/* ── Types ──────────────────────────────────────────────────────── */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/* ── Suggestion chips shown before first message ─────────────────── */
const SUGGESTIONS = [
  "Quais módulos o Aureon tem?",
  "Quanto custa o plano Pro?",
  "Tem integração com WhatsApp?",
  "Como funciona o trial grátis?",
];

/* ── Opening message ─────────────────────────────────────────────── */
const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Olá! Sou a **Auri**, assistente virtual do Aureon.\n\nPosso te ajudar com dúvidas sobre a plataforma, sugerir módulos e indicar o plano ideal para o seu time. Como posso te ajudar hoje?",
  timestamp: new Date(),
};

/* ── Helpers ─────────────────────────────────────────────────────── */

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/** Render **bold** and \n in message content */
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j} className="font-semibold text-foreground">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                part
              )
            )}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

/* ── Message bubble ──────────────────────────────────────────────── */
function Bubble({
  message,
  streaming,
}: {
  message: Message;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary/20 text-primary"
            : "bg-violet-500/20 text-violet-400"
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>

      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary/20 text-foreground"
            : "rounded-tl-sm bg-white/[0.06] text-foreground/90"
        )}
      >
        <RichText text={message.content} />
        {streaming && (
          <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse rounded-sm bg-primary align-middle" />
        )}
      </div>
    </div>
  );
}

/* ── Lead capture confirmation banner ───────────────────────────── */
function LeadBanner({ lead }: { lead: LeadData }) {
  if (!lead.email && !lead.telefone && !lead.empresa) return null;
  return (
    <div className="mx-3 mb-3 flex items-start gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
      <div className="text-[12px]">
        <div className="font-semibold text-emerald-400">Dados recebidos!</div>
        <div className="text-muted-foreground/70">
          Um especialista vai entrar em contato em breve
          {lead.nome && `, ${lead.nome}`}.
        </div>
        {lead.email && (
          <div className="mt-1 text-muted-foreground/50">Email: {lead.email}</div>
        )}
        {lead.telefone && (
          <div className="text-muted-foreground/50">Telefone: {lead.telefone}</div>
        )}
        {lead.empresa && (
          <div className="text-muted-foreground/50">Empresa: {lead.empresa}</div>
        )}
      </div>
    </div>
  );
}

/* ── Main widget ─────────────────────────────────────────────────── */
export function ChatWidget() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const whatsappMessage =
    process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE ??
    "Olá! Vim pelo site do Aureon e gostaria de saber mais.";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState<LeadData | null>(null);
  const [unread, setUnread] = useState(1); // welcome message
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef(uid());

  // Clear unread when opened
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setInput("");

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      // Build conversation history for the API
      const history: ChatMessage[] = [
        ...messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
        { id: userMsg.id, role: "user", content: trimmed },
      ];

      // Placeholder for streaming assistant message
      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const payload: ChatRequestBody = {
          sessionId: sessionIdRef.current,
          assistantMessageId: assistantId,
          messages: history,
        };

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error("Request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);

              if (parsed.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.text }
                      : m
                  )
                );
              }

              if (parsed.lead) {
                setLead(parsed.lead);
                if (!open) setUnread((n) => n + 1);
              }

              if (parsed.error) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: "Desculpe, ocorreu um erro. Tente novamente." }
                      : m
                  )
                );
              }
            } catch {
              // Incomplete JSON chunk — skip
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Erro de conexão. Por favor, tente novamente." }
                : m
            )
          );
        }
      } finally {
        setLoading(false);
        abortRef.current = null;
        if (!open) setUnread((n) => n + 1);
      }
    },
    [loading, messages, open]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasSpoken = messages.length > 1;

  return (
    <>
      {/* ── Chat panel ── */}
      <div
        className={cn(
          "fixed bottom-20 right-4 z-[80] flex w-[360px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[oklch(0.10_0.013_268)] shadow-[0_24px_80px_oklch(0_0_0/60%),0_0_40px_oklch(0.62_0.26_268/8%)] transition-all duration-300 sm:right-6",
          open
            ? "scale-100 opacity-100 translate-y-0"
            : "pointer-events-none scale-95 opacity-0 translate-y-4"
        )}
        style={{ maxHeight: "min(580px, calc(100vh - 100px))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-[oklch(0.12_0.015_268)] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-9 items-center justify-center rounded-xl gradient-primary">
              <Sparkles className="size-4 text-white" />
              <span className="absolute -right-0.5 -top-0.5 flex size-2.5 items-center justify-center rounded-full bg-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400" style={{ animation: "lp-badge-blink 2s ease-in-out infinite" }} />
              </span>
            </div>
            <div>
              <div className="text-[13px] font-bold leading-none">Auri</div>
              <div className="mt-0.5 text-[11px] text-emerald-400">Online agora</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 scroll-smooth">
          {messages.map((msg, i) => (
            <Bubble
              key={msg.id}
              message={msg}
              streaming={
                loading &&
                i === messages.length - 1 &&
                msg.role === "assistant"
              }
            />
          ))}

          {/* Typing indicator when loading but no assistant message yet */}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-2.5">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
                <Bot className="size-3.5" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3">
                {[0, 0.2, 0.4].map((d, i) => (
                  <div
                    key={i}
                    className="size-1.5 rounded-full bg-muted-foreground/50"
                    style={{ animation: `lp-badge-blink 1.4s ease-in-out ${d}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Lead capture banner */}
          {lead && <LeadBanner lead={lead} />}

          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips (only before first user message) */}
        {!hasSpoken && (
          <div className="flex flex-wrap gap-1.5 border-t border-white/[0.05] px-4 py-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/[0.06] hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* WhatsApp CTA */}
        {lead && whatsappNumber && (
          <div className="border-t border-white/[0.05] px-4 py-2.5">
            <a
              href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366]/15 py-2.5 text-[12px] font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/25"
            >
              <svg viewBox="0 0 24 24" className="size-4 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Continuar no WhatsApp
            </a>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-end gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 focus-within:border-primary/30 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="max-h-24 flex-1 resize-none bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              style={{ scrollbarWidth: "none" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg gradient-primary text-white transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/30">
            Powered by Aureon AI · <Link href="/login" className="hover:text-muted-foreground transition-colors">Acessar plataforma</Link>
          </p>
        </div>
      </div>

      {/* ── Floating toggle button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-4 right-4 z-[80] flex size-14 items-center justify-center rounded-full gradient-primary text-white shadow-[0_8px_30px_oklch(0.62_0.26_268/40%)] transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_40px_oklch(0.62_0.26_268/60%)] sm:right-6",
          open && "rotate-90"
        )}
        aria-label="Abrir chat"
      >
        {open ? (
          <X className="size-5 transition-transform" />
        ) : (
          <MessageCircle className="size-5 transition-transform" />
        )}

        {/* Unread badge */}
        {unread > 0 && !open && (
          <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg">
            {unread}
          </span>
        )}

        {/* Pulse ring */}
        {!open && (
          <div
            className="absolute inset-0 rounded-full bg-primary/30"
            style={{ animation: "lp-pulse-ring 3s ease-out infinite" }}
          />
        )}
      </button>
    </>
  );
}
