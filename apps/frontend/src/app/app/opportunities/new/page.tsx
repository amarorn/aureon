"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiHeaders, API_URL } from "@/lib/api";
import { consumeSupportPrefillDraft } from "@/lib/support/ui-actions";

export default function NewOpportunityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [pipelines, setPipelines] = useState<{ id: string; name: string; stages: { id: string; name: string }[] }[]>([]);
  const [form, setForm] = useState({
    contactId: "",
    pipelineId: "",
    stageId: "",
    title: "",
    value: "",
    notes: "",
  });

  useEffect(() => {
    const draft = consumeSupportPrefillDraft("opportunity");
    if (!draft) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      contactId: draft.values.contactId ?? prev.contactId,
      pipelineId: draft.values.pipelineId ?? prev.pipelineId,
      stageId: draft.values.stageId ?? prev.stageId,
      title: draft.values.title ?? prev.title,
      value: draft.values.value ?? prev.value,
      notes: draft.values.notes ?? prev.notes,
    }));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/contacts`, { headers: getApiHeaders() })
      .then((r) => r.json())
      .then((d) => setContacts(Array.isArray(d) ? d : []));
    fetch(`${API_URL}/pipelines`, { headers: getApiHeaders() })
      .then((r) => r.json())
      .then((d) => setPipelines(Array.isArray(d) ? d : []));
  }, []);

  const stages = pipelines.find((p) => p.id === form.pipelineId)?.stages || [];

  useEffect(() => {
    const selectedStages =
      pipelines.find((pipeline) => pipeline.id === form.pipelineId)?.stages ?? [];
    if (form.pipelineId && selectedStages.length > 0 && !form.stageId) {
      setForm((f) => ({ ...f, stageId: selectedStages[0].id }));
    }
  }, [form.pipelineId, form.stageId, pipelines]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/opportunities`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          ...form,
          value: parseFloat(form.value) || 0,
        }),
      });
      if (res.ok) {
        router.push(`/app/opportunities`);
        return;
      }
      const data = await res.json().catch(() => null);
      if (typeof data?.message === "string") setError(data.message);
      else if (Array.isArray(data?.message) && data.message.length) {
        setError(String(data.message[0]));
      } else {
        setError("Nao foi possivel criar a oportunidade.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link href="/app" className="text-lg font-semibold">
            Aureon
          </Link>
        </div>
      </header>
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold">Nova oportunidade</h1>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contactId">Contato *</Label>
                <select
                  id="contactId"
                  value={form.contactId}
                  onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                  className="w-full rounded-md border px-3 py-2"
                  required
                >
                  <option value="">Selecione</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pipelineId">Pipeline *</Label>
                <select
                  id="pipelineId"
                  value={form.pipelineId}
                  onChange={(e) => setForm({ ...form, pipelineId: e.target.value, stageId: "" })}
                  className="w-full rounded-md border px-3 py-2"
                  required
                >
                  <option value="">Selecione</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stageId">Estágio *</Label>
                <select
                  id="stageId"
                  value={form.stageId}
                  onChange={(e) => setForm({ ...form, stageId: e.target.value })}
                  className="w-full rounded-md border px-3 py-2"
                  required
                >
                  <option value="">Selecione</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
                <Button variant="outline" type="button" asChild>
                  <Link href="/app/opportunities">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
