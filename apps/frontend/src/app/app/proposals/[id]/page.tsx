"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Send, CheckCircle2, XCircle, Copy,
  Trash2, User, Clock, FileText, Loader2, Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type ProposalStatus = "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";
type SignatureStatus = "not_sent" | "sent" | "viewed" | "signed" | "declined" | "canceled" | "failed";

interface ProposalItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sort: number;
}

interface Proposal {
  id: string;
  title: string;
  status: ProposalStatus;
  signatureProvider: string | null;
  signatureStatus: SignatureStatus | null;
  signatureRequestId: string | null;
  signatureUrl: string | null;
  signatureSentAt: string | null;
  signatureCompletedAt: string | null;
  total: number;
  notes: string | null;
  meetingUrl: string | null;
  validUntil: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  contact: { id: string; name: string; email: string; phone?: string } | null;
  items: ProposalItem[];
}

const STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string }> = {
  draft:    { label: "Rascunho",    color: "bg-muted text-muted-foreground border-border" },
  sent:     { label: "Enviada",     color: "bg-blue-400/15 text-blue-400 border-blue-400/20" },
  viewed:   { label: "Visualizada", color: "bg-amber-400/15 text-amber-400 border-amber-400/20" },
  accepted: { label: "Aceita",      color: "bg-emerald-400/15 text-emerald-400 border-emerald-400/20" },
  declined: { label: "Recusada",    color: "bg-destructive/15 text-destructive border-destructive/20" },
  expired:  { label: "Expirada",    color: "bg-muted text-muted-foreground/50 border-border" },
};

const SIGNATURE_STATUS_CONFIG: Record<SignatureStatus, { label: string; color: string }> = {
  not_sent: { label: "Não enviada", color: "bg-muted text-muted-foreground border-border" },
  sent: { label: "Enviada para assinatura", color: "bg-blue-400/15 text-blue-400 border-blue-400/20" },
  viewed: { label: "Assinatura visualizada", color: "bg-amber-400/15 text-amber-400 border-amber-400/20" },
  signed: { label: "Assinada", color: "bg-emerald-400/15 text-emerald-400 border-emerald-400/20" },
  declined: { label: "Assinatura recusada", color: "bg-destructive/15 text-destructive border-destructive/20" },
  canceled: { label: "Cancelada", color: "bg-muted text-muted-foreground border-border" },
  failed: { label: "Falha no envio", color: "bg-destructive/15 text-destructive border-destructive/20" },
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: proposal, isLoading } = useQuery<Proposal>({
    queryKey: ["proposal", id],
    queryFn: () =>
      fetch(`${API_URL}/proposals/${id}`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : null
      ),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      fetch(`${API_URL}/proposals/${id}/status`, {
        method: "PUT",
        headers: apiHeaders,
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proposal", id] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/proposals/${id}/duplicate`, { method: "POST", headers: apiHeaders }).then((r) => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      router.push(`/app/proposals/${data.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/proposals/${id}`, { method: "DELETE", headers: apiHeaders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      router.push("/app/proposals");
    },
  });

  const signatureSendMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/proposals/${id}/signature/send`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { message?: string }).message ?? "Erro ao enviar para assinatura");
      }
      return data as Proposal;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["proposal", id], data);
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposals-stats"] });
      if (data.signatureUrl) {
        window.open(data.signatureUrl, "_blank", "noopener,noreferrer");
      }
    },
  });

  const signatureRefreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/proposals/${id}/signature/refresh`, {
        method: "POST",
        headers: apiHeaders,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { message?: string }).message ?? "Erro ao atualizar assinatura");
      }
      return data as Proposal;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["proposal", id], data);
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposals-stats"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <FileText className="size-10" />
        <p>Proposta não encontrada</p>
        <Button variant="outline" size="sm" asChild><Link href="/app/proposals">Voltar</Link></Button>
      </div>
    );
  }

  const { label, color } = STATUS_CONFIG[proposal.status];
  const signatureBadge =
    proposal.signatureStatus ? SIGNATURE_STATUS_CONFIG[proposal.signatureStatus] : null;
  const sortedItems = [...(proposal.items ?? [])].sort((a, b) => a.sort - b.sort);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/app/proposals"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h1 className="text-xl font-bold text-foreground">{proposal.title}</h1>
              <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", color)}>
                {label}
              </span>
              {signatureBadge && (
                <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", signatureBadge.color)}>
                  {signatureBadge.label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Criada em {formatDate(proposal.createdAt)}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {proposal.status === "draft" && (
            <Button size="sm" onClick={() => statusMutation.mutate("sent")} disabled={statusMutation.isPending}>
              <Send className="size-3.5" />
              Enviar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => signatureSendMutation.mutate()}
            disabled={signatureSendMutation.isPending}
          >
            {signatureSendMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
            Assinar
          </Button>
          {proposal.signatureRequestId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => signatureRefreshMutation.mutate()}
              disabled={signatureRefreshMutation.isPending}
            >
              {signatureRefreshMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
              Atualizar assinatura
            </Button>
          )}
          {(proposal.status === "sent" || proposal.status === "viewed") && (
            <>
              <Button size="sm" className="bg-emerald-600/80 hover:bg-emerald-600 text-white border-0"
                onClick={() => statusMutation.mutate("accepted")} disabled={statusMutation.isPending}>
                <CheckCircle2 className="size-3.5" />
                Aceita
              </Button>
              <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate("declined")} disabled={statusMutation.isPending}>
                <XCircle className="size-3.5" />
                Recusada
              </Button>
            </>
          )}
          <Button size="icon-sm" variant="outline" onClick={() => duplicateMutation.mutate()} title="Duplicar">
            <Copy className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="destructive" onClick={() => { if (confirm("Excluir proposta?")) deleteMutation.mutate(); }} title="Excluir">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {(proposal.sentAt || proposal.viewedAt || proposal.respondedAt) && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex flex-wrap gap-4">
            {proposal.sentAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Send className="size-3 text-blue-400" />
                Enviada em {formatDate(proposal.sentAt)}
              </div>
            )}
            {proposal.viewedAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3 text-amber-400" />
                Visualizada em {formatDate(proposal.viewedAt)}
              </div>
            )}
            {proposal.respondedAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {proposal.status === "accepted"
                  ? <CheckCircle2 className="size-3 text-emerald-400" />
                  : <XCircle className="size-3 text-destructive" />}
                {proposal.status === "accepted" ? "Aceita" : "Recusada"} em {formatDate(proposal.respondedAt)}
              </div>
            )}
          </div>
        </div>
      )}

      {(proposal.signatureProvider || proposal.signatureStatus) && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {proposal.signatureProvider && (
              <span>Provider: <span className="font-medium text-foreground">{proposal.signatureProvider}</span></span>
            )}
            {proposal.signatureStatus && (
              <span>Status: <span className="font-medium text-foreground">{SIGNATURE_STATUS_CONFIG[proposal.signatureStatus].label}</span></span>
            )}
            {proposal.signatureSentAt && <span>Enviada em {formatDate(proposal.signatureSentAt)}</span>}
            {proposal.signatureCompletedAt && <span>Concluída em {formatDate(proposal.signatureCompletedAt)}</span>}
          </div>
          {proposal.signatureUrl && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={proposal.signatureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline break-all"
              >
                Abrir link de assinatura
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  void navigator.clipboard.writeText(proposal.signatureUrl!);
                }}
                title="Copiar link"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Contact + validity */}
      <div className="glass-card rounded-xl p-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/40">Cliente</p>
          {proposal.contact ? (
            <Link href={`/app/contacts/${proposal.contact.id}`} className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              <div className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                {proposal.contact.name[0].toUpperCase()}
              </div>
              {proposal.contact.name}
            </Link>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><User className="size-3.5" /> Sem contato</span>
          )}
        </div>
        {proposal.validUntil && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/40">Válida até</p>
            <p className="flex items-center gap-1.5 text-sm text-foreground">
              <Clock className="size-3.5 text-muted-foreground" />
              {formatDate(proposal.validUntil)}
            </p>
          </div>
        )}
        {proposal.meetingUrl && (
          <div className="sm:col-span-2">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/40">Link da reunião</p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={proposal.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline break-all"
              >
                <Video className="size-3.5 shrink-0" />
                {proposal.meetingUrl}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={() => {
                  void navigator.clipboard.writeText(proposal.meetingUrl!);
                }}
                title="Copiar link"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground/60">
              Inclua este bloco ao exportar/imprimir (PDF) para o cliente receber o link.
            </p>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Itens da proposta</h2>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_60px_110px_100px] gap-2 px-5 py-2 bg-white/[0.02]">
            {["Descrição", "Qtd", "Preço unit.", "Total"].map((h) => (
              <p key={h} className="text-[11px] font-medium text-muted-foreground/40 uppercase tracking-wider last:text-right">{h}</p>
            ))}
          </div>

          {sortedItems.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground/50">Nenhum item adicionado</p>
          ) : (
            sortedItems.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_60px_110px_100px] gap-2 px-5 py-3 items-center">
                <p className="text-sm text-foreground">{item.description}</p>
                <p className="text-sm text-muted-foreground text-center">{item.quantity}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(Number(item.unitPrice))}</p>
                <p className="text-sm font-medium text-foreground text-right">{formatCurrency(Number(item.total))}</p>
              </div>
            ))
          )}
        </div>

        {/* Total row */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-4 bg-white/[0.02]">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="text-2xl font-bold gradient-text">{formatCurrency(Number(proposal.total))}</span>
        </div>
      </div>

      {/* Notes */}
      {proposal.notes && (
        <div className="glass-card rounded-xl p-5">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/40">Observações</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposal.notes}</p>
        </div>
      )}
    </div>
  );
}
