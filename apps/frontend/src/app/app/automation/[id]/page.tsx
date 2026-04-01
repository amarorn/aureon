"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiHeaders, API_URL } from "@/lib/api";

const TRIGGERS = [
  { value: "contact_created", label: "Contato criado" },
  { value: "opportunity_created", label: "Oportunidade criada" },
  { value: "opportunity_moved", label: "Oportunidade movida" },
  { value: "task_created", label: "Tarefa criada" },
];

const ACTIONS = [
  { value: "create_task", label: "Criar tarefa" },
  { value: "update_stage", label: "Atualizar estágio" },
  { value: "notification", label: "Notificação" },
];

export default function EditWorkflowPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [pipelines, setPipelines] = useState<{ id: string; name: string; stages: { id: string; name: string }[] }[]>([]);
  const [form, setForm] = useState({
    name: "",
    active: true,
    triggerType: "contact_created",
    triggerConfig: {} as Record<string, string>,
    actions: [] as { type: string; config: Record<string, unknown> }[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["workflow", id],
    queryFn: () =>
      fetch(`${API_URL}/workflows/${id}`, { headers: getApiHeaders() }).then((r) =>
        r.ok ? r.json() : null
      ),
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        active: data.active ?? true,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig || {},
        actions: data.actions || [],
      });
    }
  }, [data]);

  useEffect(() => {
    fetch(`${API_URL}/pipelines`, { headers: getApiHeaders() })
      .then((r) => r.json())
      .then((d) => setPipelines(Array.isArray(d) ? d : []));
  }, []);

  const allStages = pipelines.flatMap((p) => p.stages.map((s) => ({ ...s, pipelineId: p.id })));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/workflows/${id}`, {
        method: "PUT",
        headers: getApiHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push("/app/automation");
        return;
      }
      const errData = await res.json().catch(() => ({}));
      setError(Array.isArray(errData.message) ? errData.message.join(" ") : errData.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function addAction() {
    setForm((f) => ({
      ...f,
      actions: [...f.actions, { type: "create_task", config: { title: "Tarefa automática" } }],
    }));
  }

  function updateAction(i: number, type: string, config: Record<string, unknown>) {
    setForm((f) => {
      const actions = [...f.actions];
      actions[i] = { type, config };
      return { ...f, actions };
    });
  }

  if (isLoading) return <p className="p-8">Carregando...</p>;
  if (!data) return <p className="p-8 text-destructive">Workflow não encontrado.</p>;

  return (
    <div className="space-y-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Voltar
          </Button>
        </div>
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold">Editar workflow</h1>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Trigger (quando)</Label>
                <select
                  value={form.triggerType}
                  onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
                  className="w-full rounded-md border px-3 py-2"
                >
                  {TRIGGERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {form.triggerType === "opportunity_moved" && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">De estágio</Label>
                      <select
                        value={form.triggerConfig?.fromStageId || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            triggerConfig: { ...form.triggerConfig, fromStageId: e.target.value },
                          })
                        }
                        className="w-full rounded-md border px-3 py-2"
                      >
                        <option value="">Qualquer</option>
                        {allStages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Para estágio</Label>
                      <select
                        value={form.triggerConfig?.toStageId || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            triggerConfig: { ...form.triggerConfig, toStageId: e.target.value },
                          })
                        }
                        className="w-full rounded-md border px-3 py-2"
                      >
                        <option value="">Qualquer</option>
                        {allStages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ações</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addAction}>
                    Adicionar ação
                  </Button>
                </div>
                {form.actions.map((action, i) => (
                  <div key={i} className="flex gap-2 rounded border p-3">
                    <select
                      value={action.type}
                      onChange={(e) =>
                        updateAction(i, e.target.value, ACTIONS.find((a) => a.value === e.target.value) ? {} : action.config)
                      }
                      className="rounded-md border px-3 py-2"
                    >
                      {ACTIONS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    {action.type === "create_task" && (
                      <Input
                        placeholder="Título da tarefa"
                        value={(action.config?.title as string) || ""}
                        onChange={(e) =>
                          updateAction(i, action.type, { ...action.config, title: e.target.value })
                        }
                      />
                    )}
                    {action.type === "update_stage" && (
                      <select
                        value={(action.config?.stageId as string) || ""}
                        onChange={(e) =>
                          updateAction(i, action.type, { ...action.config, stageId: e.target.value })
                        }
                        className="rounded-md border px-3 py-2"
                      >
                        <option value="">Estágio</option>
                        {allStages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {action.type === "notification" && (
                      <Input
                        placeholder="Mensagem"
                        value={(action.config?.message as string) || ""}
                        onChange={(e) =>
                          updateAction(i, action.type, { ...action.config, message: e.target.value })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button variant="outline" type="button" asChild>
                  <Link href="/app/automation">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
