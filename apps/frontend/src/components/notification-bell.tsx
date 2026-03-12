"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle2, UserPlus, ArrowUpRight, X, CheckCheck } from "lucide-react";

interface Notification {
  id: string;
  type: "won" | "contact" | "stage" | "task" | "mention";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n-1",
    type: "won",
    title: "Negócio fechado!",
    body: "Enterprise Suite - TechCorp foi marcado como ganho · R$ 85.000",
    time: "há 2h",
    read: false,
  },
  {
    id: "n-2",
    type: "stage",
    title: "Oportunidade avançou",
    body: "Implementação ERP - Grupo Nexus entrou em Negociação",
    time: "há 4h",
    read: false,
  },
  {
    id: "n-3",
    type: "contact",
    title: "Novo contato adicionado",
    body: "Mariana Costa foi adicionada ao CRM",
    time: "há 6h",
    read: false,
  },
  {
    id: "n-4",
    type: "task",
    title: "Tarefa vencendo hoje",
    body: "Ligar para Rafael Oliveira sobre proposta CRM Pro",
    time: "há 8h",
    read: true,
  },
  {
    id: "n-5",
    type: "won",
    title: "Negócio fechado!",
    body: "CRM Pro - Alfa Sistemas foi marcado como ganho · R$ 42.000",
    time: "ontem",
    read: true,
  },
  {
    id: "n-6",
    type: "stage",
    title: "Oportunidade avançou",
    body: "Plataforma Agro - Eta Partners entrou em Proposta",
    time: "ontem",
    read: true,
  },
];

const TYPE_CONFIG = {
  won: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    bg: "bg-emerald-500/10",
  },
  contact: {
    icon: <UserPlus className="h-4 w-4 text-violet-400" />,
    bg: "bg-violet-500/10",
  },
  stage: {
    icon: <ArrowUpRight className="h-4 w-4 text-amber-400" />,
    bg: "bg-amber-500/10",
  },
  task: {
    icon: (
      <svg className="h-4 w-4 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm5.5 5.5l3-3-.7-.7-2.3 2.3L6 6.6l-.7.7 2.2 2.2z" />
      </svg>
    ),
    bg: "bg-blue-500/10",
  },
  mention: {
    icon: <Bell className="h-4 w-4 text-pink-400" />,
    bg: "bg-pink-500/10",
  },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Notificações"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white leading-none">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-border bg-popover shadow-2xl shadow-black/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Notificações</span>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <CheckCheck className="h-3 w-3" />
                Marcar como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.mention;
                return (
                  <div
                    key={n.id}
                    className={`group flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${
                      n.read ? "opacity-60" : "bg-primary/[0.03]"
                    } hover:bg-accent/50`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}
                    >
                      {cfg.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{n.time}</p>
                    </div>
                    <button
                      onClick={() => dismiss(n.id)}
                      className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {!n.read && (
                      <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5 text-center">
              <button className="text-xs text-primary hover:text-primary/80 transition-colors">
                Ver todas as notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
