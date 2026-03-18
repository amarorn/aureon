"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus, Star, Send, CheckCircle2, Trash2, User,
  MessageSquare, Mail, Phone, Globe, Loader2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ReviewPlatform = "google" | "facebook" | "trustpilot" | "custom";
type ReviewChannel = "whatsapp" | "email" | "sms";
type ReviewStatus = "pending" | "sent" | "opened" | "completed" | "declined";

interface ReviewRequest {
  id: string;
  platform: ReviewPlatform;
  channel: ReviewChannel;
  status: ReviewStatus;
  rating: number | null;
  comment: string | null;
  reviewUrl: string | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
  contact: { id: string; name: string; email: string } | null;
}

interface Stats {
  total: number;
  sent: number;
  completed: number;
  avgRating: number;
  distribution: Record<number, number>;
}

const PLATFORM_LABELS: Record<ReviewPlatform, string> = {
  google: "Google", facebook: "Facebook",
  trustpilot: "Trustpilot", custom: "Personalizado",
};
const PLATFORM_COLORS: Record<ReviewPlatform, string> = {
  google: "bg-red-400/15 text-red-400 border-red-400/20",
  facebook: "bg-blue-400/15 text-blue-400 border-blue-400/20",
  trustpilot: "bg-emerald-400/15 text-emerald-400 border-emerald-400/20",
  custom: "bg-muted text-muted-foreground border-border",
};
const CHANNEL_ICONS: Record<ReviewChannel, React.ElementType> = {
  whatsapp: MessageSquare, email: Mail, sms: Phone,
};
const STATUS_CONFIG: Record<ReviewStatus, { label: string; color: string }> = {
  pending:   { label: "Pendente",     color: "bg-muted text-muted-foreground border-border" },
  sent:      { label: "Enviado",      color: "bg-blue-400/15 text-blue-400 border-blue-400/20" },
  opened:    { label: "Visualizado",  color: "bg-amber-400/15 text-amber-400 border-amber-400/20" },
  completed: { label: "Avaliado",     color: "bg-emerald-400/15 text-emerald-400 border-emerald-400/20" },
  declined:  { label: "Recusado",     color: "bg-destructive/15 text-destructive border-destructive/20" },
};

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReputationPage() {
  const queryClient = useQueryClient();
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: stats } = useQuery<Stats>({
    queryKey: ["reputation-stats"],
    queryFn: () =>
      fetch(`${API_URL}/reputation/stats`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : null
      ),
  });

  const { data: requests = [], isLoading } = useQuery<ReviewRequest[]>({
    queryKey: ["reputation"],
    queryFn: () =>
      fetch(`${API_URL}/reputation`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/reputation/${id}/send`, { method: "POST", headers: apiHeaders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reputation"] });
      queryClient.invalidateQueries({ queryKey: ["reputation-stats"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment: string }) =>
      fetch(`${API_URL}/reputation/${id}/complete`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ rating, comment }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reputation"] });
      queryClient.invalidateQueries({ queryKey: ["reputation-stats"] });
      setCompleteId(null);
      setRating(5);
      setComment("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/reputation/${id}`, { method: "DELETE", headers: apiHeaders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reputation"] });
      queryClient.invalidateQueries({ queryKey: ["reputation-stats"] });
    },
  });

  const avgRating = stats?.avgRating ?? 0;
  const maxDist = Math.max(...Object.values(stats?.distribution ?? {}), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Reputação</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Solicite e monitore avaliações dos seus clientes</p>
        </div>
        <Button asChild>
          <Link href="/app/reputation/new">
            <Plus className="size-4" />
            Solicitar avaliação
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Average rating — destaque */}
        <div className="glass-card col-span-2 sm:col-span-1 lg:col-span-1 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-xs text-muted-foreground">Avaliação média</p>
          <p className="text-5xl font-bold gradient-text">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
          <StarRating value={Math.round(avgRating)} />
          <p className="text-xs text-muted-foreground/50">{stats?.completed ?? 0} avaliações</p>
        </div>

        {[
          { label: "Solicitações enviadas", value: stats?.total ?? 0, sub: "total de pedidos" },
          { label: "Recebidas (enviadas)", value: stats?.sent ?? 0, sub: "confirmadas como enviadas" },
          { label: "Concluídas", value: stats?.completed ?? 0, sub: "com nota registrada" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="glass-card rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground/50 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Rating distribution */}
      {stats && stats.completed > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Distribuição de notas</h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star] ?? 0;
              const pct = Math.round((count / maxDist) * 100);
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex w-20 items-center justify-end gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">{star}</span>
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-xs text-muted-foreground shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Requests list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (requests as ReviewRequest[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/[0.08] py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl gradient-primary glow-primary-sm">
            <Star className="size-7 text-white" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Nenhuma solicitação ainda</p>
            <p className="text-sm text-muted-foreground mt-0.5">Peça avaliações para seus clientes após fechar negócios</p>
          </div>
          <Button asChild><Link href="/app/reputation/new"><Plus className="size-4" />Solicitar avaliação</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Histórico de solicitações</h2>
          {(requests as ReviewRequest[]).map((r) => {
            const { label, color } = STATUS_CONFIG[r.status];
            const ChannelIcon = CHANNEL_ICONS[r.channel];
            return (
              <div key={r.id} className="glass-card group rounded-xl p-4 transition-all duration-150 hover:border-white/[0.12]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Channel icon */}
                    <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.05] shrink-0 mt-0.5">
                      <ChannelIcon className="size-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {r.contact ? (
                          <Link href={`/app/contacts/${r.contact.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                            {r.contact.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-muted-foreground flex items-center gap-1">
                            <User className="size-3" /> Sem contato
                          </span>
                        )}
                        <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", PLATFORM_COLORS[r.platform])}>
                          <Globe className="size-2.5 mr-1" />
                          {PLATFORM_LABELS[r.platform]}
                        </span>
                        <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", color)}>
                          {label}
                        </span>
                      </div>

                      {r.status === "completed" && r.rating !== null && (
                        <div className="mt-1 space-y-1">
                          <StarRating value={r.rating} />
                          {r.comment && <p className="text-sm text-muted-foreground italic">&ldquo;{r.comment}&rdquo;</p>}
                        </div>
                      )}

                      <p className="mt-1 text-xs text-muted-foreground/50">
                        {r.completedAt ? `Avaliado em ${formatDate(r.completedAt)}` :
                         r.sentAt ? `Enviado em ${formatDate(r.sentAt)}` :
                         `Criado em ${formatDate(r.createdAt)}`}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {r.status === "pending" && (
                      <button
                        onClick={() => sendMutation.mutate(r.id)}
                        disabled={sendMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        <Send className="size-3" />
                        Enviar
                      </button>
                    )}
                    {(r.status === "sent" || r.status === "opened") && (
                      <button
                        onClick={() => setCompleteId(r.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-400/20"
                      >
                        <CheckCircle2 className="size-3" />
                        Registrar nota
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm("Excluir esta solicitação?")) deleteMutation.mutate(r.id); }}
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.06] hover:text-destructive"
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

      {/* Complete modal */}
      {completeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCompleteId(null)} />
          <div className="relative z-10 w-full max-w-sm glass-card rounded-2xl p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-bold text-foreground">Registrar avaliação recebida</h3>
              <button onClick={() => setCompleteId(null)} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.06]">
                <X className="size-4" />
              </button>
            </div>

            {/* Star picker */}
            <div className="mb-4 space-y-2">
              <Label>Nota recebida</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setRating(s)}>
                    <Star className={cn("size-8 transition-colors", s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20 hover:text-amber-400/50")} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5 space-y-1.5">
              <Label htmlFor="comment">Comentário (opcional)</Label>
              <textarea
                id="comment"
                rows={3}
                placeholder="Comentário do cliente..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              />
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate({ id: completeId, rating, comment })}
              >
                {completeMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setCompleteId(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
