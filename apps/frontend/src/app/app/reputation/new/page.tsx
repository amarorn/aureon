"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Star, Loader2 } from "lucide-react";
import Link from "next/link";

interface Contact {
  id: string;
  name: string;
  email: string;
}

const PLATFORMS = [
  { value: "google",     label: "Google", color: "border-red-400/30 bg-red-400/10 text-red-400" },
  { value: "facebook",   label: "Facebook", color: "border-blue-400/30 bg-blue-400/10 text-blue-400" },
  { value: "trustpilot", label: "Trustpilot", color: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400" },
  { value: "custom",     label: "Personalizado", color: "border-white/[0.1] bg-white/[0.04] text-muted-foreground" },
];

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email",    label: "E-mail" },
  { value: "sms",      label: "SMS" },
];

const DEFAULT_MESSAGES: Record<string, string> = {
  google: "Olá {{nome}}! Ficamos felizes em ter ajudado você. Poderia nos deixar uma avaliação no Google? Leva menos de 1 minuto e nos ajuda muito! 🙏",
  facebook: "Olá {{nome}}! Sua opinião é muito importante para nós. Que tal deixar uma avaliação no Facebook? Agradeço muito! 😊",
  trustpilot: "Olá {{nome}}! Obrigado pela confiança. Poderia compartilhar sua experiência no Trustpilot? ⭐",
  custom: "Olá {{nome}}! Gostaríamos muito de receber seu feedback. Clique no link para avaliar: {{link}}",
};

export default function NewReviewRequestPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [platform, setPlatform] = useState("google");
  const [channel, setChannel]   = useState("whatsapp");
  const [contactId, setContactId] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");
  const [message, setMessage]   = useState(DEFAULT_MESSAGES.google);

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () =>
      fetch(`${API_URL}/contacts`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const mutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      fetch(`${API_URL}/reputation`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reputation"] });
      queryClient.invalidateQueries({ queryKey: ["reputation-stats"] });
      router.push("/app/reputation");
    },
  });

  function handlePlatformChange(p: string) {
    setPlatform(p);
    setMessage(DEFAULT_MESSAGES[p] ?? DEFAULT_MESSAGES.custom);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      platform,
      channel,
      ...(contactId && { contactId }),
      ...(reviewUrl && { reviewUrl }),
      ...(message && { message }),
    });
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/app/reputation"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl gradient-primary glow-primary-sm">
            <Star className="size-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Solicitar avaliação</h1>
            <p className="text-xs text-muted-foreground">Peça um review para um cliente</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Platform */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Plataforma de avaliação</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handlePlatformChange(p.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                  platform === p.value
                    ? p.color + " ring-1 ring-current"
                    : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {(platform === "google" || platform === "custom") && (
            <div className="space-y-1.5">
              <Label htmlFor="reviewUrl">Link para avaliação</Label>
              <Input
                id="reviewUrl"
                type="url"
                placeholder="https://g.page/r/... ou link personalizado"
                value={reviewUrl}
                onChange={(e) => setReviewUrl(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Contact & Channel */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Contato e canal</h2>
          <div className="space-y-1.5">
            <Label htmlFor="contact">Contato</Label>
            <select
              id="contact"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-foreground transition-all focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            >
              <option value="">Selecionar contato (opcional)</option>
              {(contacts as Contact[]).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.email ? ` · ${c.email}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Canal de envio</Label>
            <div className="flex gap-2">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => setChannel(ch.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    channel === ch.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05]"
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Mensagem</h2>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex w-full resize-y rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
          />
          <p className="text-[11px] text-muted-foreground/50">
            Use <code className="rounded bg-white/[0.05] px-1">{"{{nome}}"}</code> e{" "}
            <code className="rounded bg-white/[0.05] px-1">{"{{link}}"}</code> como variáveis
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending} className="flex-1">
            {mutation.isPending
              ? <><Loader2 className="size-4 animate-spin" />Salvando...</>
              : <><Star className="size-4" />Criar solicitação</>}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/app/reputation">Cancelar</Link>
          </Button>
        </div>

        {mutation.isError && (
          <p className="text-center text-sm text-destructive">Erro ao criar solicitação. Tente novamente.</p>
        )}
      </form>
    </div>
  );
}
