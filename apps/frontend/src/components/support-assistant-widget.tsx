"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  ChevronDown,
  LifeBuoy,
  Loader2,
  Send,
  User,
} from "lucide-react";
import { API_URL, TENANT_ID, apiHeaders } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/assistant/types";
import { resolveSupportRouteContext } from "@/lib/support/route-context";
import type {
  SupportChatRequestBody,
  SupportRuntimeContext,
} from "@/lib/support/types";
import {
  queueSupportPrefillDraft,
  type SupportUiAction,
} from "@/lib/support/ui-actions";

interface Message extends ChatMessage {
  timestamp: Date;
  actions?: SupportUiAction[];
}

interface TenantRecord {
  id: string;
  name: string;
}

interface IntegrationRecord {
  provider: string;
  status: string;
}

const DEFAULT_PROMPTS = [
  "Qual é o melhor fluxo para este caso?",
  "Como fazer isso passo a passo?",
  "Essa é a melhor funcionalidade para essa necessidade?",
];

const DIRECT_ACTION_INTENT_REGEX =
  /me leve|me direciona|me direcione|abra|abrir|vá para|vai para|ir para|crie|criar|cadastre|cadastrar|configure|configurar|preencha|preencher|assuma o controle|faça|faz/i;

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function formatProviderLabel(provider: string) {
  return provider
    .split("_")
    .map((segment) => {
      if (segment.toLowerCase() === "ads") return "Ads";
      if (segment.toLowerCase() === "ses") return "SES";
      if (segment.toLowerCase() === "rd") return "RD";
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(" ");
}

function buildWelcomeMessage(label?: string): Message {
  return {
    id: "support-welcome",
    role: "assistant",
    content: label
      ? `Sou a **Auri Support**. Posso te orientar sobre processos no Aureon, explicar passos e indicar a melhor escolha para a sua necessidade.\n\nVocê está em **${label}**.`
      : "Sou a **Auri Support**. Posso te orientar sobre processos no Aureon, explicar passos e indicar a melhor escolha para a sua necessidade.",
    timestamp: new Date(),
  };
}

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

function Bubble({
  message,
  streaming,
  onAction,
}: {
  message: Message;
  streaming?: boolean;
  onAction?: (action: SupportUiAction) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary/15 text-primary"
            : "bg-sky-500/15 text-sky-500"
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>

      <div
        className={cn(
          "max-w-[84%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary/12 text-foreground"
            : "rounded-tl-sm border border-border/60 bg-card text-foreground/90"
        )}
      >
        <RichText text={message.content} />
        {streaming && (
          <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse rounded-sm bg-primary align-middle" />
        )}
        {!isUser && message.actions?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action, index) => (
              <button
                key={`${message.id}-${action.type}-${index}`}
                type="button"
                onClick={() => onAction?.(action)}
                className="rounded-full border border-primary/30 bg-primary/8 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/12"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SupportAssistantWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const routeContext = useMemo(
    () => resolveSupportRouteContext(pathname),
    [pathname]
  );
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    buildWelcomeMessage(routeContext?.label),
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [runtimeContext, setRuntimeContext] = useState<SupportRuntimeContext>({
    tenantId: TENANT_ID,
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const prompts = routeContext?.quickPrompts?.length
    ? routeContext.quickPrompts
    : DEFAULT_PROMPTS;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 ? [buildWelcomeMessage(routeContext?.label)] : prev
    );
  }, [routeContext?.id, routeContext?.label]);

  const loadRuntimeContext = useCallback(async () => {
    const nextContext: SupportRuntimeContext = {
      tenantId: TENANT_ID,
    };

    const [tenantsResult, integrationsResult] = await Promise.allSettled([
      fetch(`${API_URL}/tenants`),
      fetch(`${API_URL}/integrations`, { headers: apiHeaders }),
    ]);

    if (
      tenantsResult.status === "fulfilled" &&
      tenantsResult.value.ok
    ) {
      const tenants = (await tenantsResult.value.json()) as TenantRecord[];
      const currentTenant = tenants.find((tenant) => tenant.id === TENANT_ID);
      if (currentTenant) {
        nextContext.tenantName = currentTenant.name;
      }
    }

    if (
      integrationsResult.status === "fulfilled" &&
      integrationsResult.value.ok
    ) {
      const integrations = (await integrationsResult.value.json()) as IntegrationRecord[];
      nextContext.connectedIntegrations = integrations
        .filter((integration) => integration.status === "connected")
        .map((integration) => formatProviderLabel(integration.provider));
      nextContext.disconnectedIntegrations = integrations
        .filter((integration) => integration.status !== "connected")
        .map((integration) => formatProviderLabel(integration.provider));
    }

    setRuntimeContext(nextContext);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadRuntimeContext();
  }, [open, loadRuntimeContext]);

  const executeAction = useCallback((action: SupportUiAction) => {
    if (action.type === "navigate") {
      setOpen(false);
      router.push(action.path);
      return;
    }

    if (action.type === "prefill_form") {
      queueSupportPrefillDraft({
        formType: action.formType,
        values: action.values,
      });
      setOpen(false);
      router.push(action.path);
    }
  }, [router]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) {
        return;
      }

      setInput("");

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const history: ChatMessage[] = [
        ...messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        })),
        {
          id: userMsg.id,
          role: "user",
          content: trimmed,
        },
      ];

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);

      try {
        const payload: SupportChatRequestBody = {
          currentPath: pathname,
          runtimeContext,
          messages: history,
        };

        const res = await fetch("/api/support-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok || !res.body) {
          throw new Error("Request failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) {
              continue;
            }

            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.text) {
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantId
                      ? {
                          ...message,
                          content: message.content + parsed.text,
                        }
                      : message
                  )
                );
              }

              if (parsed.actions) {
                const actions = parsed.actions as SupportUiAction[];

                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantId
                      ? {
                          ...message,
                          actions,
                        }
                      : message
                  )
                );

                if (
                  DIRECT_ACTION_INTENT_REGEX.test(trimmed) &&
                  actions.length === 1 &&
                  (actions[0].type === "navigate" ||
                    actions[0].type === "prefill_form")
                ) {
                  setTimeout(() => executeAction(actions[0]), 180);
                }
              }

              if (parsed.error) {
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantId
                      ? {
                          ...message,
                          content:
                            "Não consegui montar a orientação agora. Tente novamente em instantes.",
                        }
                      : message
                  )
                );
              }
            } catch {
              continue;
            }
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: "Erro de conexão. Tente novamente.",
                }
              : message
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      messages,
      pathname,
      runtimeContext,
      executeAction,
    ]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const hasSpoken = messages.length > 1;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-36 right-6 z-50 flex w-[380px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition-all duration-200 sm:max-w-[380px]",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-4 scale-95 opacity-0"
        )}
        style={{ maxHeight: "min(620px, calc(100vh - 120px))" }}
      >
        <div className="border-b border-border bg-card px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-sky-500/12 text-sky-500">
                  <LifeBuoy className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Auri Support</div>
                  <div className="text-[11px] text-muted-foreground">
                    Suporte técnico do produto
                  </div>
                </div>
              </div>
              <div className="mt-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                Contexto atual:{" "}
                <span className="font-medium text-foreground">
                  {routeContext?.label ?? "Área interna"}
                </span>
              </div>
              {(runtimeContext.tenantName || runtimeContext.connectedIntegrations?.length) && (
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  {runtimeContext.tenantName && (
                    <span className="rounded-full bg-background px-2 py-1">
                      Tenant:{" "}
                      <span className="font-medium text-foreground">
                        {runtimeContext.tenantName}
                      </span>
                    </span>
                  )}
                  {runtimeContext.connectedIntegrations?.length ? (
                    <span className="rounded-full bg-background px-2 py-1">
                      Integrações ativas:{" "}
                      <span className="font-medium text-foreground">
                        {runtimeContext.connectedIntegrations.length}
                      </span>
                    </span>
                  ) : null}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Fechar suporte"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {messages.map((message, index) => (
            <Bubble
              key={message.id}
              message={message}
              onAction={executeAction}
              streaming={
                loading &&
                index === messages.length - 1 &&
                message.role === "assistant"
              }
            />
          ))}

          {!hasSpoken && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
              <div className="mb-2 text-[11px] font-medium text-muted-foreground">
                Perguntas úteis para esta área
              </div>
              <div className="flex flex-wrap gap-2">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border bg-card p-3">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/40">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Pergunte como fazer um processo no Aureon..."
              className="max-h-28 flex-1 resize-none bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              style={{ scrollbarWidth: "none" }}
            />
            <button
              type="button"
              onClick={() => void sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Enviar mensagem"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
          <div className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Explico o processo, te levo para a tela certa e preparo formulários quando fizer sentido.
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "fixed bottom-20 right-6 z-50 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl",
          open && "rotate-90"
        )}
        aria-label="Abrir suporte técnico"
      >
        {open ? <ChevronDown className="size-5" /> : <LifeBuoy className="size-5" />}
      </button>
    </>
  );
}
