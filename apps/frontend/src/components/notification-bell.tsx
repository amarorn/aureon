"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, UserPlus, ArrowUpRight, X, CheckCheck, Mail } from "lucide-react";
import { getApiHeaders, API_URL } from "@/lib/api";

interface Notification {
  id: string;
  type: "won" | "contact" | "stage" | "task" | "mention" | "email";
  title: string;
  body: string;
  read: boolean;
  linkUrl: string | null;
  createdAt: string;
}

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffH < 24) return `há ${diffH}h`;
  if (diffD === 1) return "ontem";
  if (diffD < 7) return `há ${diffD} dias`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const TYPE_CONFIG: Record<
  Notification["type"],
  { icon: React.ReactNode; bg: string }
> = {
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
  email: {
    icon: <Mail className="h-4 w-4 text-sky-400" />,
    bg: "bg-sky-500/10",
  },
};

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () =>
      fetch(`${API_URL}/notifications`, { headers: getApiHeaders() }).then((r) =>
        r.ok ? r.json() : [],
      ),
    refetchInterval: 45_000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/notifications/all/read`, {
        method: "PATCH",
        headers: getApiHeaders(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/notifications/${id}`, {
        method: "DELETE",
        headers: getApiHeaders(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

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
    markAllReadMutation.mutate();
  }

  function dismiss(id: string) {
    dismissMutation.mutate(id);
  }

  function handleNotificationClick(n: Notification) {
    if (n.linkUrl) {
      router.push(n.linkUrl);
      setOpen(false);
    }
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
                    role={n.linkUrl ? "button" : undefined}
                    onClick={() => n.linkUrl && handleNotificationClick(n)}
                    className={`group flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${
                      n.read ? "opacity-60" : "bg-primary/[0.03]"
                    } hover:bg-accent/50 ${n.linkUrl ? "cursor-pointer" : ""}`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}
                    >
                      {cfg.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        {formatTimeAgo(n.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismiss(n.id);
                      }}
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
