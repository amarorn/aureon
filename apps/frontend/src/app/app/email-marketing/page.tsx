"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Mail,
  Send,
  Users,
  Eye,
  MousePointerClick,
  Copy,
  Trash2,
  FileText,
  BarChart2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  recipientCount: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  sentAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground border-border", icon: FileText },
  scheduled: { label: "Agendado", color: "bg-amber-400/15 text-amber-400 border-amber-400/20", icon: Clock },
  sending: { label: "Enviando", color: "bg-blue-400/15 text-blue-400 border-blue-400/20", icon: Loader2 },
  sent: { label: "Enviado", color: "bg-emerald-400/15 text-emerald-400 border-emerald-400/20", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-destructive/15 text-destructive border-destructive/20", icon: XCircle },
};

function openRate(c: Campaign) {
  if (!c.sentCount) return "—";
  return `${Math.round((c.openCount / c.sentCount) * 100)}%`;
}

function clickRate(c: Campaign) {
  if (!c.sentCount) return "—";
  return `${Math.round((c.clickCount / c.sentCount) * 100)}%`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function EmailMarketingPage() {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["email-campaigns"],
    queryFn: () =>
      fetch(`${API_URL}/email-campaigns`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/email-campaigns/${id}/send`, { method: "POST", headers: apiHeaders }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-campaigns"] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/email-campaigns/${id}/duplicate`, { method: "POST", headers: apiHeaders }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-campaigns"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/email-campaigns/${id}`, { method: "DELETE", headers: apiHeaders }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-campaigns"] }),
  });

  // Aggregate stats
  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0);
  const totalOpen = campaigns.reduce((s, c) => s + c.openCount, 0);
  const totalClick = campaigns.reduce((s, c) => s + c.clickCount, 0);
  const avgOpen = totalSent ? Math.round((totalOpen / totalSent) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Marketing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Crie e envie campanhas para seus contatos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/app/email-marketing/templates">
              <FileText className="size-4" />
              Templates
            </Link>
          </Button>
          <Button asChild>
            <Link href="/app/email-marketing/new">
              <Plus className="size-4" />
              Nova campanha
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Campanhas enviadas", value: campaigns.filter(c => c.status === "sent").length, icon: Send, color: "from-violet-600 to-indigo-700" },
          { label: "Total de envios", value: totalSent.toLocaleString("pt-BR"), icon: Users, color: "from-blue-600 to-cyan-700" },
          { label: "Taxa de abertura", value: `${avgOpen}%`, icon: Eye, color: "from-emerald-600 to-teal-700" },
          { label: "Cliques totais", value: totalClick.toLocaleString("pt-BR"), icon: MousePointerClick, color: "from-amber-500 to-orange-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card rounded-xl p-4 flex items-center gap-4">
            <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} shrink-0`}>
              <Icon className="size-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Campaigns list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/[0.08] py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl gradient-primary glow-primary-sm">
            <Mail className="size-7 text-white" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Nenhuma campanha criada</p>
            <p className="text-sm text-muted-foreground mt-0.5">Crie sua primeira campanha de email</p>
          </div>
          <Button asChild><Link href="/app/email-marketing/new"><Plus className="size-4" />Nova campanha</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const { label, color, icon: StatusIcon } = STATUS_CONFIG[c.status];
            return (
              <div key={c.id} className="glass-card group rounded-xl p-5 transition-all duration-150 hover:border-white/[0.12]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
                      <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium shrink-0", color)}>
                        <StatusIcon className={cn("size-3", c.status === "sending" && "animate-spin")} />
                        {label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{c.subject}</p>
                    <p className="mt-1 text-xs text-muted-foreground/50">
                      {c.sentAt ? `Enviado em ${formatDate(c.sentAt)}` : c.scheduledAt ? `Agendado para ${formatDate(c.scheduledAt)}` : `Criado em ${formatDate(c.createdAt)}`}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3" /> Destinatários</div>
                      <p className="text-sm font-semibold text-foreground">{c.recipientCount}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="size-3" /> Abertura</div>
                      <p className="text-sm font-semibold text-foreground">{openRate(c)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><MousePointerClick className="size-3" /> Cliques</div>
                      <p className="text-sm font-semibold text-foreground">{clickRate(c)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {c.status === "draft" && (
                      <button
                        onClick={() => sendMutation.mutate(c.id)}
                        disabled={sendMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        <Send className="size-3" />
                        Enviar
                      </button>
                    )}
                    <button
                      onClick={() => duplicateMutation.mutate(c.id)}
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.06] hover:text-foreground"
                      title="Duplicar"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Excluir esta campanha?")) deleteMutation.mutate(c.id);
                      }}
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.06] hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar for sent campaigns */}
                {c.status === "sent" && c.sentCount > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><BarChart2 className="size-3" /> Taxa de abertura</span>
                      <span>{openRate(c)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full gradient-primary transition-all"
                        style={{ width: `${Math.round((c.openCount / c.sentCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
