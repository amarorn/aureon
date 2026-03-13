"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Phone,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Copy,
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

// ── Twilio Call Modal ───────────────────────────────────────────────────────
function TwilioCallModal({
  contactId,
  contactName,
  phone,
  onClose,
  onSuccess,
}: {
  contactId: string;
  contactName: string;
  phone: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [agentPhone, setAgentPhone] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const initiateMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/calls/initiate`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          contactId,
          to: phone,
          agentPhoneNumber: agentPhone.trim(),
          record: true,
          transcribe: false,
        }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data?.call) {
        setResult({ ok: true, msg: "Ligação iniciada. Atenda seu telefone." });
        onSuccess();
      } else {
        setResult({ ok: false, msg: data?.error ?? "Falha ao iniciar chamada." });
      }
    },
    onError: () => setResult({ ok: false, msg: "Erro de conexão." }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md">
              <Phone className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Ligar (Twilio)</p>
              <p className="text-xs text-muted-foreground">{contactName} · {phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Seu número (E.164, ex: +5511999999999)</label>
          <input
            value={agentPhone}
            onChange={(e) => setAgentPhone(e.target.value)}
            placeholder="+5511999999999"
            className="w-full h-9 rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {result && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
            result.ok ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}>
            {result.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {result.msg}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="border-white/[0.08] bg-white/[0.03] text-xs">Cancelar</Button>
          <Button
            size="sm"
            disabled={!agentPhone.trim() || initiateMutation.isPending}
            onClick={() => initiateMutation.mutate()}
            className="gradient-primary text-white border-0 glow-primary-sm text-xs gap-1.5"
          >
            {initiateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
            Iniciar chamada
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
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showTwilioCall, setShowTwilioCall] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["contact", id],
    queryFn: () =>
      fetch(`${API_URL}/contacts/${id}`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : null
      ),
  });

  const { data: waStatus } = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: () =>
      fetch(`${API_URL}/integrations/whatsapp/status`, { headers: apiHeaders })
        .then((r) => (r.ok ? r.json() : { connected: false })),
    staleTime: 60_000,
  });

  const { data: twilioStatus } = useQuery({
    queryKey: ["twilio-status"],
    queryFn: () =>
      fetch(`${API_URL}/integrations/twilio/status`, { headers: apiHeaders })
        .then((r) => (r.ok ? r.json() : { connected: false })),
    staleTime: 60_000,
  });

  const { data: bookingLink } = useQuery({
    queryKey: ["booking-link", id],
    queryFn: () =>
      fetch(`${API_URL}/integrations/booking/link?contactId=${id}`, { headers: apiHeaders })
        .then((r) => (r.ok ? r.json() : { url: null })),
    staleTime: 60_000,
  });

  const [copied, setCopied] = useState(false);
  function copyBookingLink() {
    if (!bookingLink?.url) return;
    navigator.clipboard.writeText(bookingLink.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
      {showTwilioCall && data.phone && (
        <TwilioCallModal
          contactId={id}
          contactName={data.name}
          phone={data.phone}
          onClose={() => setShowTwilioCall(false)}
          onSuccess={() => {
            setShowTwilioCall(false);
            queryClient.invalidateQueries({ queryKey: ["calls", id] });
          }}
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
          {twilioStatus?.connected && data.phone && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTwilioCall(true)}
              className="border-red-500/20 bg-red-500/[0.06] text-red-400 hover:bg-red-500/10 gap-1.5 text-xs"
            >
              <Phone className="h-3.5 w-3.5" />
              Ligar
            </Button>
          )}
          {bookingLink?.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={copyBookingLink}
              className="border-indigo-500/20 bg-indigo-500/[0.06] text-indigo-400 hover:bg-indigo-500/10 gap-1.5 text-xs"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Link de agendamento"}
              {!copied && <Copy className="h-3 w-3 opacity-60" />}
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
