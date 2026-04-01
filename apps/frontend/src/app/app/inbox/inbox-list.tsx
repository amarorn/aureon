"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getApiHeaders, API_URL } from "@/lib/api";
import {
  Search,
  MessageCircle,
  Mail,
  Camera,
  Send,
  MessageSquare,
  Inbox,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChannelType = "whatsapp" | "email" | "instagram" | "telegram" | "other";

const CHANNEL_CONFIG: Record<
  ChannelType,
  { label: string; icon: React.ElementType; color: string; bg: string; badge: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  email: {
    label: "Email",
    icon: Mail,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  instagram: {
    label: "Instagram",
    icon: Camera,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    badge: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  },
  telegram: {
    label: "Telegram",
    icon: Send,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  other: {
    label: "Outro",
    icon: MessageSquare,
    color: "text-muted-foreground",
    bg: "bg-white/[0.04]",
    badge: "bg-white/[0.04] text-muted-foreground border-border",
  },
};

const STATUS_TABS = [
  { value: "open", label: "Abertas" },
  { value: "closed", label: "Fechadas" },
];

const CHANNEL_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
];

interface Conversation {
  id: string;
  contact?: { name: string };
  channel?: { type: string; name: string };
  status: string;
  subject?: string;
  updatedAt: string;
}

export function InboxList() {
  const [statusFilter, setStatusFilter] = useState("open");
  const [channelFilter, setChannelFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["conversations", statusFilter],
    queryFn: () =>
      fetch(`${API_URL}/conversations?status=${statusFilter}`, {
        headers: getApiHeaders(),
      }).then((r) => (r.ok ? r.json() : [])),
  });

  const conversations = useMemo(() => {
    let list: Conversation[] = Array.isArray(data) ? data : [];
    if (channelFilter !== "all") {
      list = list.filter((c) => c.channel?.type === channelFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.contact?.name?.toLowerCase().includes(q) ||
          c.subject?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, channelFilter, search]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por contato ou assunto..."
          className="w-full h-10 pl-10 pr-9 rounded-xl border border-border bg-background/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Status tabs */}
        <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                "px-5 py-1.5 rounded-[10px] text-sm font-medium transition-all",
                statusFilter === tab.value
                  ? "gradient-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Channel pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {CHANNEL_FILTERS.map((f) => {
            const cfg = f.value !== "all" ? CHANNEL_CONFIG[f.value as ChannelType] : null;
            const Icon = cfg?.icon;
            const isActive = channelFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setChannelFilter(f.value)}
                className={cn(
                  "flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium border transition-all",
                  isActive
                    ? cfg
                      ? `${cfg.badge} border-opacity-100`
                      : "gradient-primary text-white border-primary/30 shadow-sm"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result count */}
      {!isLoading && !error && (
        <p className="text-xs text-muted-foreground">
          {conversations.length === 0
            ? "Nenhuma conversa"
            : `${conversations.length} conversa${conversations.length !== 1 ? "s" : ""}`}
          {search && ` para "${search}"`}
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-[60px] rounded-xl bg-white/[0.03] border border-border animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm text-destructive">Erro ao carregar conversas.</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-border flex items-center justify-center">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Nenhuma conversa</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? "Tente outros termos de busca."
                : "Crie uma nova conversa para começar."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {conversations.map((c) => {
            const type = (c.channel?.type ?? "other") as ChannelType;
            const cfg = CHANNEL_CONFIG[type] ?? CHANNEL_CONFIG.other;
            const Icon = cfg.icon;
            const dateStr = new Date(c.updatedAt).toLocaleDateString("pt-BR");

            return (
              <Link key={c.id} href={`/app/inbox/${c.id}`}>
                <div className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card/30 hover:bg-accent/20 hover:border-white/[0.12] transition-all cursor-pointer">
                  {/* Channel icon */}
                  <div
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                      cfg.bg
                    )}
                  >
                    <Icon className={cn("h-4 w-4", cfg.color)} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground truncate">
                        {c.contact?.name ?? "Sem contato"}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md border",
                          cfg.badge
                        )}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.subject ?? (c.status === "open" ? "Conversa aberta" : "Conversa fechada")}
                    </p>
                  </div>

                  {/* Date */}
                  <span className="text-xs text-muted-foreground/60 shrink-0 group-hover:text-muted-foreground transition-colors">
                    {dateStr}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
