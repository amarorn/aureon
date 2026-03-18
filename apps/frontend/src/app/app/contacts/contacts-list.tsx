"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { apiHeaders, API_URL } from "@/lib/api";
import { MOCK_CONTACTS, type MockContact } from "@/lib/mock-data";
import {
  Search,
  Mail,
  Phone,
  Building2,
  ChevronRight,
  Sparkles,
  UserX,
  Flame,
  Thermometer,
  Wind,
} from "lucide-react";

type LeadScore = "quente" | "morno" | "frio";

const SCORE_CONFIG: Record<LeadScore, { label: string; icon: React.ReactNode; className: string }> = {
  quente: {
    label: "Quente",
    icon: <Flame className="h-3 w-3" />,
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  morno: {
    label: "Morno",
    icon: <Thermometer className="h-3 w-3" />,
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  frio: {
    label: "Frio",
    icon: <Wind className="h-3 w-3" />,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
};

/** Calcula score automaticamente para contatos da API (sem campo score) */
function calcScore(contact: Contact): LeadScore {
  if (contact.status === "inativo") return "frio";
  const tags = contact.tags ?? [];
  if (tags.includes("VIP")) return "quente";
  if (!contact.lastContact) return "frio";
  const diff = Math.floor(
    (Date.now() - new Date(contact.lastContact).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff <= 3) return "quente";
  if (diff <= 14) return "morno";
  return "frio";
}

const STATUS_CONFIG = {
  ativo: {
    label: "Ativo",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  prospect: {
    label: "Prospect",
    className: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  inativo: {
    label: "Inativo",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
};

const TAG_COLORS = [
  "bg-violet-500/10 text-violet-400",
  "bg-blue-500/10 text-blue-400",
  "bg-emerald-500/10 text-emerald-400",
  "bg-amber-500/10 text-amber-400",
  "bg-pink-500/10 text-pink-400",
  "bg-cyan-500/10 text-cyan-400",
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function formatLastContact(dateStr: string) {
  const date = new Date(dateStr);
  const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff < 7) return `${diff} dias atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  status?: "ativo" | "prospect" | "inativo";
  tags?: string[];
  lastContact?: string;
  initials?: string;
  avatarColor?: string;
  score?: LeadScore;
}

function ContactCard({ contact }: { contact: Contact }) {
  const status = contact.status ?? "ativo";
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ativo;
  const initials =
    contact.initials ??
    contact.name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  const avatarColor = contact.avatarColor ?? "from-violet-500 to-indigo-600";
  const score: LeadScore = contact.score ?? calcScore(contact);
  const scoreCfg = SCORE_CONFIG[score];

  return (
    <Link
      href={`/app/contacts/${contact.id}`}
      className="glass-card rounded-2xl p-5 flex flex-col gap-4 hover:scale-[1.01] hover:shadow-[0_0_24px_oklch(0.62_0.26_268/12%)] transition-all duration-200 group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar com anel colorido por score */}
          <div className="relative shrink-0">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${avatarColor} shadow-lg text-white text-sm font-bold`}
            >
              {initials}
            </div>
            {/* Score dot no canto do avatar */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card ${
                score === "quente"
                  ? "bg-red-500"
                  : score === "morno"
                  ? "bg-amber-500"
                  : "bg-blue-500"
              }`}
              title={`Score: ${scoreCfg.label}`}
            >
              <span className="text-[7px] text-white font-bold">
                {score === "quente" ? "🔥" : score === "morno" ? "~" : "❄"}
              </span>
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {contact.name}
            </p>
            {contact.company && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <Building2 className="h-3 w-3 shrink-0" />
                {contact.company}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Score badge */}
          <span
            className={`flex items-center gap-1 text-[10px] font-semibold rounded-full border px-2 py-0.5 ${scoreCfg.className}`}
          >
            {scoreCfg.icon}
            {scoreCfg.label}
          </span>
          {/* Status badge */}
          <span
            className={`text-[10px] font-medium rounded-full border px-2 py-0.5 ${statusCfg.className}`}
          >
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-1.5">
        {contact.email && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{contact.email}</span>
          </p>
        )}
        {contact.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            {contact.phone}
          </p>
        )}
      </div>

      {/* Tags + last contact */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 min-w-0">
          {(contact.tags ?? []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${getTagColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
        {contact.lastContact && (
          <p className="text-[10px] text-muted-foreground/60 shrink-0 whitespace-nowrap">
            {formatLastContact(contact.lastContact)}
          </p>
        )}
      </div>
    </Link>
  );
}

export function ContactsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "prospect" | "inativo">(
    "todos"
  );
  const [scoreFilter, setScoreFilter] = useState<"todos" | LeadScore>("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () =>
      fetch(`${API_URL}/contacts`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : null
      ),
  });

  const rawContacts: Contact[] = Array.isArray(data) && data.length > 0 ? data : MOCK_CONTACTS;
  const isMock = !Array.isArray(data) || data.length === 0;

  const contacts = rawContacts.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "todos" || c.status === statusFilter;
    const contactScore = (c as Contact).score ?? calcScore(c as Contact);
    const matchesScore = scoreFilter === "todos" || contactScore === scoreFilter;
    return matchesSearch && matchesStatus && matchesScore;
  });

  const counts = {
    todos: rawContacts.length,
    ativo: rawContacts.filter((c) => c.status === "ativo").length,
    prospect: rawContacts.filter((c) => c.status === "prospect").length,
    inativo: rawContacts.filter((c) => c.status === "inativo").length,
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 h-40 animate-pulse opacity-50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Demo badge */}
      {isMock && (
        <div className="flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400 w-fit">
          <Sparkles className="h-3.5 w-3.5" />
          Dados de demonstração
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Buscar contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-xl border border-border bg-background/50 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
        {/* Status filters */}
        <div className="flex gap-1.5 flex-wrap">
          {(["todos", "ativo", "prospect", "inativo"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`h-9 rounded-xl px-3 text-xs font-medium transition-all duration-150 ${
                statusFilter === s
                  ? "bg-primary/15 text-primary border border-primary/20 shadow-sm"
                  : "border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1.5 opacity-60">{counts[s]}</span>
            </button>
          ))}
        </div>

        {/* Score filters */}
        <div className="flex gap-1.5">
          {([
            { value: "todos", label: "Todos scores", icon: null },
            { value: "quente", label: "Quente", icon: <Flame className="h-3 w-3" /> },
            { value: "morno", label: "Morno", icon: <Thermometer className="h-3 w-3" /> },
            { value: "frio", label: "Frio", icon: <Wind className="h-3 w-3" /> },
          ] as const).map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => setScoreFilter(value)}
              className={`h-9 rounded-xl px-3 text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                scoreFilter === value
                  ? value === "quente"
                    ? "bg-red-500/15 text-red-400 border border-red-500/20 shadow-sm"
                    : value === "morno"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-sm"
                    : value === "frio"
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/20 shadow-sm"
                    : "bg-primary/15 text-primary border border-primary/20 shadow-sm"
                  : "border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {contacts.length === 0 ? (
        <div className="glass-card rounded-2xl py-16 flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
            <UserX className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Nenhum contato encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Tente outros termos de busca" : "Crie seu primeiro contato"}
            </p>
          </div>
          {!search && (
            <Button asChild className="gradient-primary text-white border-0 glow-primary-sm">
              <Link href="/app/contacts/new">Criar contato</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <ContactCard key={c.id} contact={c} />
          ))}
        </div>
      )}
    </div>
  );
}
