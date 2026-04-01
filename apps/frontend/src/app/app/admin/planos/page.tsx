"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { getApiHeaders, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, Plus, Shield, X } from "lucide-react";

type PackagePlan = {
  code: string;
  name: string;
  featureCodes: string[];
  updatedAt: string;
};

type RegistryItem = { code: string; label: string; group: string };

const PLAN_SLUG = /^[a-z][a-z0-9-]{1,62}$/;

function CreatePlanForm({
  packages,
  onClose,
  onCreated,
}: {
  packages: PackagePlan[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const normalized = code.trim().toLowerCase();
      if (!PLAN_SLUG.test(normalized)) {
        throw new Error(
          "Código inválido: minúsculas, números e hífen; 2–64 caracteres, começando com letra.",
        );
      }
      if (!name.trim()) {
        throw new Error("Informe o nome do plano.");
      }
      const base = copyFrom
        ? (packages.find((p) => p.code === copyFrom)?.featureCodes ?? [])
        : [];
      const res = await fetch(`${API_URL}/admin/packages`, {
        method: "POST",
        headers: { ...getApiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          code: normalized,
          name: name.trim(),
          featureCodes: [...base],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Erro ao criar plano");
      }
      return res.json();
    },
    onSuccess: () => {
      setFormError(null);
      setCode("");
      setName("");
      setCopyFrom("");
      onCreated();
      onClose();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  return (
    <Card className="border-primary/30 bg-white/[0.02] md:col-span-2 xl:col-span-3">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Novo plano</CardTitle>
        <Button type="button" size="icon" variant="ghost" className="size-8" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Defina um código único (slug) e o nome exibido. Opcionalmente copie as funcionalidades de um
          plano existente e ajuste depois em &quot;Salvar plano&quot;.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-plan-code">Código (slug)</Label>
            <Input
              id="new-plan-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="ex.: enterprise"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-plan-name">Nome do plano</Label>
            <Input
              id="new-plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex.: Enterprise"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-plan-copy">Copiar módulos de (opcional)</Label>
          <select
            id="new-plan-copy"
            value={copyFrom}
            onChange={(e) => setCopyFrom(e.target.value)}
            className="flex h-10 w-full max-w-md rounded-lg border border-white/[0.08] bg-background px-3 text-sm"
          >
            <option value="">Nenhum (plano sem módulos até você editar)</option>
            {packages.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>
        {formError ? (
          <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            {formError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={create.isPending}
            onClick={() => {
              setFormError(null);
              create.mutate();
            }}
          >
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : "Criar plano"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanCard({
  plan,
  registry,
  canEdit,
  onSaved,
}: {
  plan: PackagePlan;
  registry: RegistryItem[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState(plan.name);
  const [codes, setCodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setName(plan.name);
    const m: Record<string, boolean> = {};
    for (const r of registry) {
      m[r.code] = plan.featureCodes.includes(r.code);
    }
    setCodes(m);
  }, [plan, registry]);

  const save = useMutation({
    mutationFn: async () => {
      const featureCodes = Object.entries(codes)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const res = await fetch(`${API_URL}/admin/packages/${plan.code}`, {
        method: "PUT",
        headers: { ...getApiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name, featureCodes }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => onSaved(),
  });

  const byGroup = registry.reduce<Record<string, RegistryItem[]>>((acc, r) => {
    acc[r.group] = acc[r.group] ?? [];
    acc[r.group].push(r);
    return acc;
  }, {});

  return (
    <Card className="border-white/[0.08] bg-white/[0.02]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold capitalize flex items-center gap-2">
          <Package className="size-4 text-primary" />
          {plan.code}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`name-${plan.code}`}>Nome do plano</Label>
          <Input
            id={`name-${plan.code}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Funcionalidades incluídas</p>
          {Object.entries(byGroup).map(([group, items]) => (
            <div key={group}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {group}
              </p>
              <ul className="space-y-2">
                {items.map((r) => (
                  <li key={r.code} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`${plan.code}-${r.code}`}
                      checked={codes[r.code] ?? false}
                      onChange={(e) =>
                        setCodes((c) => ({ ...c, [r.code]: e.target.checked }))
                      }
                      disabled={!canEdit}
                      className="size-4 rounded border-border"
                    />
                    <label htmlFor={`${plan.code}-${r.code}`} className="text-sm cursor-pointer">
                      {r.label}
                      <span className="text-muted-foreground ml-1 font-mono text-xs">({r.code})</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {canEdit ? (
          <Button
            size="sm"
            disabled={save.isPending || !name.trim()}
            onClick={() => save.mutate()}
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Salvar plano"
            )}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Apenas administradores da plataforma podem editar planos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPlanosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const canEdit = user?.role === "platform_admin";
  const [showCreate, setShowCreate] = useState(false);

  const { data: registry = [], isLoading: regLoading } = useQuery<RegistryItem[]>({
    queryKey: ["admin-feature-registry"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/admin/feature-registry`, {
        headers: getApiHeaders(),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: Boolean(user?.isPlatformUser),
  });

  const { data: packages = [], isLoading: pkgLoading } = useQuery<PackagePlan[]>({
    queryKey: ["admin-packages"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/admin/packages`, { headers: getApiHeaders() });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: Boolean(user?.isPlatformUser),
  });

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user?.isPlatformUser) {
    return (
      <div className="rounded-2xl border border-white/[0.08] p-8 text-center">
        <Shield className="size-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Área restrita à equipe Aureon.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/app">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos e funcionalidades</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Crie planos personalizados ou edite os existentes. O conjunto de módulos de cada plano
            entra no cálculo de permissões por tenant (junto com overrides manuais).
          </p>
        </div>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            className="shrink-0 gap-2"
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus className="size-4" />
            {showCreate ? "Fechar" : "Novo plano"}
          </Button>
        ) : null}
      </div>

      {regLoading || pkgLoading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {showCreate && canEdit ? (
            <CreatePlanForm
              packages={packages}
              onClose={() => setShowCreate(false)}
              onCreated={() => {
                qc.invalidateQueries({ queryKey: ["admin-packages"] });
              }}
            />
          ) : null}
          {packages.map((p) => (
            <PlanCard
              key={p.code}
              plan={p}
              registry={registry}
              canEdit={canEdit}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["admin-packages"] });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
