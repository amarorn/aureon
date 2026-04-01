"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Plus, Trash2, Eye, X, Loader2 } from "lucide-react";
import Link from "next/link";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
  createdAt: string;
}

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState<EmailTemplate | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [variables, setVariables] = useState("");

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["email-templates"],
    queryFn: () =>
      fetch(`${API_URL}/email-templates`, { headers: getApiHeaders() }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await fetch(`${API_URL}/email-templates`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = Array.isArray(data?.message) ? data.message.join(". ") : data?.message;
        throw new Error(msg || "Erro ao criar template");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setShowForm(false);
      setName(""); setSubject(""); setBodyHtml(""); setVariables("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/email-templates/${id}`, { method: "DELETE", headers: getApiHeaders() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !subject || !bodyHtml) return;
    createMutation.mutate({
      name, subject, bodyHtml,
      variables: variables ? variables.split(",").map((v) => v.trim()).filter(Boolean) : [],
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/app/email-marketing"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl gradient-primary glow-primary-sm">
              <FileText className="size-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Templates de Email</h1>
              <p className="text-xs text-muted-foreground">Reutilize layouts prontos nas suas campanhas</p>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
          {showForm ? <><X className="size-4" />Cancelar</> : <><Plus className="size-4" />Novo template</>}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="glass-card mb-6 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Novo template</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tplName">Nome *</Label>
              <Input id="tplName" placeholder="Ex: Boas-vindas" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tplSubject">Assunto *</Label>
              <Input id="tplSubject" placeholder="Linha de assunto" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tplBody">Corpo (HTML) *</Label>
            <textarea
              id="tplBody"
              rows={6}
              placeholder="<p>Olá {{nome}},</p>"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              required
              className="flex w-full resize-y rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 transition-all focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tplVars">Variáveis (separadas por vírgula)</Label>
            <Input id="tplVars" placeholder="nome, empresa, link" value={variables} onChange={(e) => setVariables(e.target.value)} />
          </div>

          {createMutation.isError && (
            <p className="text-sm text-destructive">
              {createMutation.error instanceof Error ? createMutation.error.message : "Erro ao criar template."}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Criar template
            </Button>
          </div>
        </form>
      )}

      {/* Templates grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (templates as EmailTemplate[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/[0.08] py-20 text-center">
          <FileText className="size-10 text-muted-foreground/20" />
          <div>
            <p className="font-semibold text-muted-foreground">Nenhum template criado</p>
            <p className="text-sm text-muted-foreground/50 mt-0.5">Crie layouts reutilizáveis para suas campanhas</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="size-4" />Criar primeiro template</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(templates as EmailTemplate[]).map((t) => (
            <div key={t.id} className="glass-card group flex flex-col rounded-xl p-4 transition-all duration-150 hover:border-white/[0.12]">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{t.name}</h3>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{t.subject}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPreview(preview?.id === t.id ? null : t)}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.06] hover:text-foreground"
                    title="Pré-visualizar"
                  >
                    <Eye className="size-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Excluir este template?")) deleteMutation.mutate(t.id);
                    }}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.06] hover:text-destructive"
                    title="Excluir"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Body preview */}
              <div className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 overflow-hidden">
                <p className="line-clamp-3 font-mono text-[10px] text-muted-foreground/60">{t.bodyHtml}</p>
              </div>

              {t.variables?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.variables.map((v) => (
                    <span key={v} className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreview(null)} />
          <div className="relative z-10 w-full max-w-2xl glass-card rounded-2xl p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">{preview.name}</h3>
                <p className="text-sm text-muted-foreground">{preview.subject}</p>
              </div>
              <button onClick={() => setPreview(null)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div
              className="max-h-96 overflow-y-auto rounded-xl border border-white/[0.06] bg-white p-4 text-gray-900"
              dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
