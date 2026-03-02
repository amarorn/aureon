"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileCheck, Plus, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

interface Contact { id: string; name: string; email: string }
interface LineItem { description: string; quantity: number; unitPrice: number }

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function NewProposalPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () =>
      fetch(`${API_URL}/contacts`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch(`${API_URL}/proposals`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposals-stats"] });
      router.push(`/app/proposals/${data.id}`);
    },
  });

  function addLine() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);
  }

  function removeLine(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    mutation.mutate({
      title,
      ...(contactId && { contactId }),
      ...(validUntil && { validUntil: new Date(validUntil).toISOString() }),
      ...(notes && { notes }),
      items: items.filter((i) => i.description.trim()),
    });
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/app/proposals"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl gradient-primary glow-primary-sm">
            <FileCheck className="size-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Nova proposta</h1>
            <p className="text-xs text-muted-foreground">Monte o orçamento para seu cliente</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* General */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Informações gerais</h2>
          <div className="space-y-1.5">
            <Label htmlFor="title">Título da proposta *</Label>
            <Input id="title" placeholder="Ex: Proposta de Consultoria Março/2025" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact">Contato</Label>
              <select
                id="contact"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-foreground transition-all focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              >
                <option value="">Nenhum contato</option>
                {(contacts as Contact[]).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validUntil">Válida até</Label>
              <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Itens</h2>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-3.5" />
              Adicionar item
            </button>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-[1fr_80px_110px_90px_32px] gap-2 px-1">
            {["Descrição", "Qtd", "Preço unit.", "Total", ""].map((h) => (
              <p key={h} className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {/* Item rows */}
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_110px_90px_32px] gap-2 items-center">
                <Input
                  placeholder="Descrição do item"
                  value={item.description}
                  onChange={(e) => updateLine(idx, "description", e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateLine(idx, "quantity", Math.max(1, Number(e.target.value)))}
                  className="h-8 text-sm text-center"
                />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0,00"
                  value={item.unitPrice || ""}
                  onChange={(e) => updateLine(idx, "unitPrice", Number(e.target.value))}
                  className="h-8 text-sm text-right"
                />
                <div className="h-8 flex items-center justify-end px-2">
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  disabled={items.length === 1}
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-2xl font-bold gradient-text">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Observações</h2>
          <textarea
            rows={3}
            placeholder="Condições de pagamento, prazo de entrega, garantias..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex w-full resize-y rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending} className="flex-1">
            {mutation.isPending
              ? <><Loader2 className="size-4 animate-spin" />Salvando...</>
              : <><FileCheck className="size-4" />Criar proposta</>}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/app/proposals">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
