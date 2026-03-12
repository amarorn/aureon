"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { apiHeaders, API_URL } from "@/lib/api";
import { TasksSection } from "./tasks-section";
import { CallsSection } from "./calls-section";
import { AddToQueueButton } from "./add-to-queue-button";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ── WhatsApp Modal ─────────────────────────────────────────────────────────
function WhatsAppModal({
  contactName,
  phone,
  onClose,
}: {
  contactName: string;
  phone: string;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const sendMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/integrations/whatsapp/messages`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ to: phone, text }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data?.messageId) {
        setResult({ ok: true, msg: "Mensagem enviada com sucesso!" });
        setText("");
      } else {
        setResult({ ok: false, msg: data?.error ?? "Falha ao enviar mensagem." });
      }
    },
    onError: () => setResult({ ok: false, msg: "Erro de conexão." }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Enviar WhatsApp</p>
              <p className="text-xs text-muted-foreground">{contactName} · {phone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite sua mensagem..."
          rows={4}
          className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
        />

        {/* Result feedback */}
        {result && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
            result.ok
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}>
            {result.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            )}
            {result.msg}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}
            className="border-white/[0.08] bg-white/[0.03] text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!text.trim() || sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
            className="gradient-primary text-white border-0 glow-primary-sm text-xs gap-1.5"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["contact", id],
    queryFn: () =>
      fetch(`${API_URL}/contacts/${id}`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : null
      ),
  });

  // Check if WhatsApp integration is configured
  const { data: waStatus } = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: () =>
      fetch(`${API_URL}/integrations/whatsapp/status`, { headers: apiHeaders })
        .then((r) => (r.ok ? r.json() : { connected: false })),
    staleTime: 60_000,
  });

  if (isLoading) return <p className="p-8">Carregando...</p>;
  if (error || !data) return <p className="p-8 text-destructive">Contato não encontrado.</p>;

  return (
    <div className="space-y-8">
      {showWhatsApp && data.phone && (
        <WhatsAppModal
          contactName={data.name}
          phone={data.phone}
          onClose={() => setShowWhatsApp(false)}
        />
      )}

      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Voltar
        </Button>
        <div className="flex gap-2">
          {waStatus?.connected && data.phone && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWhatsApp(true)}
              className="border-green-500/20 bg-green-500/[0.06] text-green-400 hover:bg-green-500/10 gap-1.5 text-xs"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/app/inbox/new?contactId=${id}`}>Iniciar conversa</Link>
          </Button>
          <AddToQueueButton contactId={id} />
          <Button asChild>
            <Link href={`/app/contacts/${id}/edit`}>Editar</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold">{data.name}</h1>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.email && <p><span className="text-muted-foreground">E-mail:</span> {data.email}</p>}
          {data.phone && <p><span className="text-muted-foreground">Telefone:</span> {data.phone}</p>}
          {data.company && <p><span className="text-muted-foreground">Empresa:</span> {data.company}</p>}
          {data.notes && <p><span className="text-muted-foreground">Observações:</span> {data.notes}</p>}
        </CardContent>
      </Card>

      <div className="mt-6 space-y-6">
        <TasksSection contactId={id} />
        <CallsSection contactId={id} />
      </div>
    </div>
  );
}
