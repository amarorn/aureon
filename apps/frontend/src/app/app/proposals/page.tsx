"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Plus, FileCheck, Send, CheckCircle2, XCircle,
  Copy, Trash2, Eye, DollarSign, Clock, FileText,
  TrendingUp, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageTour } from "@/components/page-tour";

type ProposalStatus = "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";

interface Proposal {
  id: string;
  title: string;
  status: ProposalStatus;
  total: number;
  validUntil: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  contact: { id: string; name: string } | null;
  items: { id: string }[];
}

interface Stats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  declined: number;
  totalValue: number;
  acceptedValue: number;
}

const STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:    { label: "Rascunho",   color: "bg-muted text-muted-foreground border-border",              icon: FileText },
  sent:     { label: "Enviada",    color: "bg-blue-400/15 text-blue-400 border-blue-400/20",           icon: Send },
  viewed:   { label: "Visualizada",color: "bg-amber-400/15 text-amber-400 border-amber-400/20",        icon: Eye },
  accepted: { label: "Aceita",     color: "bg-emerald-400/15 text-emerald-400 border-emerald-400/20",  icon: CheckCircle2 },
  declined: { label: "Recusada",   color: "bg-destructive/15 text-destructive border-destructive/20",  icon: XCircle },
  expired:  { label: "Expirada",   color: "bg-muted text-muted-foreground/50 border-border",           icon: Clock },
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateOnly(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function readApiError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  const message = Array.isArray((data as { message?: string | string[] }).message)
    ? (data as { message: string[] }).message.join(". ")
    : (data as { message?: string }).message;

  if (!response.ok) {
    throw new Error(message || fallback);
  }

  return data;
}

export default function ProposalsPage() {
  const queryClient = useQueryClient();
  const expiringSoonWindowMs = 3 * 24 * 60 * 60 * 1000;
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: stats } = useQuery<Stats>({
    queryKey: ["proposals-stats"],
    queryFn: () =>
      fetch(`${API_URL}/proposals/stats`, { headers: getApiHeaders() }).then((r) =>
        r.ok ? r.json() : null
      ),
  });

  const { data: proposals = [], isLoading, dataUpdatedAt } = useQuery<Proposal[]>({
    queryKey: ["proposals"],
    queryFn: () =>
      fetch(`${API_URL}/proposals`, { headers: getApiHeaders() }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      readApiError(
        await fetch(`${API_URL}/proposals/${id}/status`, {
          method: "PUT",
          headers: getApiHeaders(),
          body: JSON.stringify({ status }),
        }),
        "Erro ao atualizar a proposta",
      ),
    onMutate: () => {
      setActionError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposals-stats"] });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Erro ao atualizar a proposta");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) =>
      readApiError(
        await fetch(`${API_URL}/proposals/${id}/duplicate`, {
          method: "POST",
          headers: getApiHeaders(),
        }),
        "Erro ao duplicar a proposta",
      ),
    onMutate: () => {
      setActionError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposals-stats"] });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Erro ao duplicar a proposta");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      readApiError(
        await fetch(`${API_URL}/proposals/${id}`, { method: "DELETE", headers: getApiHeaders() }),
        "Erro ao excluir a proposta",
      ),
    onMutate: () => {
      setActionError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposals-stats"] });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Erro ao excluir a proposta");
    },
  });

  const acceptanceRate = stats && stats.sent + stats.accepted + stats.declined > 0
    ? Math.round((stats.accepted / (stats.accepted + stats.declined || 1)) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <PageTour tourId="proposals" />
      {/* Header */}
      <div className="flex items-center justify-between" data-tour="proposals-header">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propostas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Crie e acompanhe orçamentos enviados</p>
        </div>
        <Button asChild data-tour="proposals-new-btn">
          <Link href="/app/proposals/new">
            <Plus className="size-4" />
            Nova proposta
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="proposals-stats">
        {[
          { label: "Total de propostas", value: stats?.total ?? 0, icon: FileCheck, color: "from-violet-600 to-indigo-700" },
          { label: "Valor total", value: formatCurrency(stats?.totalValue ?? 0), icon: DollarSign, color: "from-blue-600 to-cyan-700" },
          { label: "Valor aceito", value: formatCurrency(stats?.acceptedValue ?? 0), icon: TrendingUp, color: "from-emerald-600 to-teal-700" },
          { label: "Taxa de aceite", value: `${acceptanceRate}%`, icon: CheckCircle2, color: "from-amber-500 to-orange-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card rounded-xl p-4 flex items-center gap-4">
            <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} shrink-0`}>
              <Icon className="size-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold text-foreground truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5" data-tour="proposals-status-summary">
        {(["draft","sent","viewed","accepted","declined"] as ProposalStatus[]).map((s) => {
          const { label, color, icon: Icon } = STATUS_CONFIG[s];
          const count = s === "draft" ? stats?.draft : s === "sent" || s === "viewed" ? stats?.sent : s === "accepted" ? stats?.accepted : stats?.declined;
          return (
            <div key={s} className={cn("glass-card rounded-xl p-3 flex flex-col items-center gap-1.5 border", color.split(" ")[0])}>
              <Icon className={cn("size-4", color.split(" ")[1])} />
              <p className="text-lg font-bold text-foreground">{count ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          );
        })}
      </div>

      {actionError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (proposals as Proposal[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/[0.08] py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl gradient-primary glow-primary-sm">
            <FileCheck className="size-7 text-white" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Nenhuma proposta criada</p>
            <p className="text-sm text-muted-foreground mt-0.5">Crie propostas profissionais para seus clientes</p>
          </div>
          <Button asChild><Link href="/app/proposals/new"><Plus className="size-4" />Nova proposta</Link></Button>
        </div>
      ) : (
        <div className="space-y-3" data-tour="proposals-list">
          {(proposals as Proposal[]).map((p) => {
            const { label, color, icon: StatusIcon } = STATUS_CONFIG[p.status];
            const expiringThreshold = dataUpdatedAt > 0 ? new Date(dataUpdatedAt + expiringSoonWindowMs) : null;
            const isExpiring = p.validUntil && p.status !== "accepted" && p.status !== "declined" &&
              expiringThreshold !== null && new Date(p.validUntil) < expiringThreshold;
            return (
              <div key={p.id} className="glass-card group rounded-xl p-5 transition-all duration-150 hover:border-white/[0.12]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Link href={`/app/proposals/${p.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                        {p.title}
                      </Link>
                      <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium", color)}>
                        <StatusIcon className="size-3" />
                        {label}
                      </span>
                      {isExpiring && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                          <Clock className="size-3" />
                          Expira em breve
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {p.contact && (
                        <Link href={`/app/contacts/${p.contact.id}`} className="hover:text-foreground transition-colors">
                          {p.contact.name}
                        </Link>
                      )}
                      <span>{p.items.length} item{p.items.length !== 1 ? "s" : ""}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(Number(p.total))}</span>
                      {p.validUntil && <span>Válida até {formatDateOnly(p.validUntil)}</span>}
                      <span className="text-muted-foreground/50">Criada em {formatDate(p.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {p.status === "draft" && (
                      <button
                        onClick={() => statusMutation.mutate({ id: p.id, status: "sent" })}
                        className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        <Send className="size-3" />
                        Enviar
                      </button>
                    )}
                    {(p.status === "sent" || p.status === "viewed") && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => statusMutation.mutate({ id: p.id, status: "accepted" })}
                          className="flex items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-400/20"
                        >
                          <CheckCircle2 className="size-3" />
                          Aceita
                        </button>
                        <button
                          onClick={() => statusMutation.mutate({ id: p.id, status: "declined" })}
                          className="flex items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                        >
                          <XCircle className="size-3" />
                          Recusada
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => duplicateMutation.mutate(p.id)}
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.06] hover:text-foreground"
                      title="Duplicar"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm("Excluir esta proposta?")) deleteMutation.mutate(p.id); }}
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.06] hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
