"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Loader2, Users, X, Plus } from "lucide-react";
import Link from "next/link";

interface Contact {
  id: string;
  name: string;
  email: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [showContactPicker, setShowContactPicker] = useState(false);

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () =>
      fetch(`${API_URL}/contacts`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["email-templates"],
    queryFn: () =>
      fetch(`${API_URL}/email-templates`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await fetch(`${API_URL}/email-campaigns`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = Array.isArray(data?.message) ? data.message.join(". ") : data?.message;
        throw new Error(msg || "Erro ao criar campanha");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      router.push("/app/email-marketing");
    },
  });

  function applyTemplate(t: Template) {
    setSubject(t.subject);
    setBodyHtml(t.bodyHtml);
  }

  const filteredContacts = (contacts as Contact[]).filter(
    (c) =>
      !selectedContactIds.includes(c.id) &&
      (c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  const selectedContacts = (contacts as Contact[]).filter((c) =>
    selectedContactIds.includes(c.id)
  );

  function toggleContact(id: string) {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !subject || !bodyHtml) return;
    mutation.mutate({
      name,
      subject,
      bodyHtml,
      ...(fromName && { fromName }),
      ...(fromEmail && { fromEmail }),
      ...(scheduledAt && { scheduledAt: new Date(scheduledAt).toISOString() }),
      contactIds: selectedContactIds,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/app/email-marketing"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl gradient-primary glow-primary-sm">
            <Mail className="size-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Nova campanha</h1>
            <p className="text-xs text-muted-foreground">Configure e envie para seus contatos</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Informações da campanha</h2>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nome da campanha *</Label>
            <Input id="name" placeholder="Ex: Newsletter de Março" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {/* Template selector */}
          {(templates as Template[]).length > 0 && (
            <div className="space-y-1.5">
              <Label>Usar template</Label>
              <div className="flex flex-wrap gap-2">
                {(templates as Template[]).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="subject">Assunto *</Label>
            <Input id="subject" placeholder="Linha de assunto do email" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Corpo do email (HTML) *</Label>
            <textarea
              id="body"
              rows={8}
              placeholder="<p>Olá {{nome}},</p><p>...</p>"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              required
              className="flex w-full resize-y rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 transition-all focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
            <p className="text-[11px] text-muted-foreground/50">
              Use <code className="rounded bg-white/[0.05] px-1">{"{{nome}}"}</code> para variáveis de personalização
            </p>
          </div>
        </div>

        {/* Sender */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Remetente (opcional)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fromName">Nome do remetente</Label>
              <Input id="fromName" placeholder="Aureon CRM" value={fromName} onChange={(e) => setFromName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fromEmail">E-mail do remetente</Label>
              <Input id="fromEmail" type="email" placeholder="noreply@aureon.app" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scheduledAt">Agendar envio (opcional)</Label>
            <Input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
        </div>

        {/* Recipients */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Destinatários</h2>
            <button
              type="button"
              onClick={() => setShowContactPicker(!showContactPicker)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-3.5" />
              Adicionar contatos
            </button>
          </div>

          {showContactPicker && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
              <Input
                placeholder="Buscar contatos..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredContacts.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground/50">
                    {contactSearch ? "Nenhum contato encontrado" : "Todos os contatos já adicionados"}
                  </p>
                ) : (
                  filteredContacts.slice(0, 20).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleContact(c.id)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.05]"
                    >
                      <div>
                        <span className="font-medium text-foreground">{c.name}</span>
                        {c.email && <span className="ml-2 text-muted-foreground">{c.email}</span>}
                      </div>
                      <Plus className="size-3 text-primary" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedContacts.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/[0.08] px-4 py-3 text-xs text-muted-foreground/50">
              <Users className="size-4" />
              Nenhum destinatário selecionado — a campanha ficará como rascunho
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{selectedContacts.length} destinatário{selectedContacts.length !== 1 ? "s" : ""}</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedContacts.map((c) => (
                  <span key={c.id} className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] pl-2 pr-1 py-0.5 text-xs text-foreground">
                    {c.name}
                    <button type="button" onClick={() => toggleContact(c.id)} className="rounded p-0.5 hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={mutation.isPending} className="flex-1">
            {mutation.isPending ? (
              <><Loader2 className="size-4 animate-spin" />Salvando...</>
            ) : (
              <><Mail className="size-4" />Salvar campanha</>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/app/email-marketing">Cancelar</Link>
          </Button>
        </div>

        {mutation.isError && (
          <p className="text-center text-sm text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : "Erro ao criar campanha. Tente novamente."}
          </p>
        )}
      </form>
    </div>
  );
}
