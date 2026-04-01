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
import { Loader2, Package, Shield } from "lucide-react";

type PackagePlan = {
  code: string;
  name: string;
  featureCodes: string[];
  updatedAt: string;
};

type RegistryItem = { code: string; label: string; group: string };

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
      <div>
        <h1 className="text-2xl font-bold">Planos e funcionalidades</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Defina quais módulos entram em cada pacote (Starter, Growth, Scale). Alterações valem para
          novos cálculos de permissão por tenant.
        </p>
      </div>

      {regLoading || pkgLoading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
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
