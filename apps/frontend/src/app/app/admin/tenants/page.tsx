"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { getApiHeaders, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Shield, X } from "lucide-react";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  currentPackageCode: string | null;
  approvalStatus: string;
  operationalStatus: string;
};

type RegistryItem = { code: string; label: string; group: string };

type TenantFeaturesResponse = {
  currentPackageCode: string | null;
  effectiveFeatureCodes: string[];
  manualOverrides: { featureCode: string; enabled: boolean }[];
};

type FeatureMode = "default" | "on" | "off";

function FeaturesPanel({
  tenantId,
  tenantName,
  registry,
  onClose,
}: {
  tenantId: string;
  tenantName: string;
  registry: RegistryItem[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [modes, setModes] = useState<Record<string, FeatureMode>>({});

  const { data, isLoading } = useQuery<TenantFeaturesResponse>({
    queryKey: ["admin-tenant-features", tenantId],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/admin/tenants/${tenantId}/features`, {
        headers: getApiHeaders(),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  useEffect(() => {
    if (!data) return;
    const ov = new Map(
      data.manualOverrides.map((o) => [o.featureCode, o.enabled] as const),
    );
    const next: Record<string, FeatureMode> = {};
    for (const r of registry) {
      if (!ov.has(r.code)) next[r.code] = "default";
      else next[r.code] = ov.get(r.code) ? "on" : "off";
    }
    setModes(next);
  }, [data, registry]);

  const save = useMutation({
    mutationFn: async () => {
      const revertToPackageDefaults: string[] = [];
      const overrides: { featureCode: string; enabled: boolean }[] = [];
      for (const r of registry) {
        const m = modes[r.code] ?? "default";
        if (m === "default") revertToPackageDefaults.push(r.code);
        else overrides.push({ featureCode: r.code, enabled: m === "on" });
      }
      const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/features`, {
        method: "PUT",
        headers: { ...getApiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ revertToPackageDefaults, overrides }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tenant-features", tenantId] });
      onClose();
    },
  });

  const byGroup = registry.reduce<Record<string, RegistryItem[]>>((acc, r) => {
    acc[r.group] = acc[r.group] ?? [];
    acc[r.group].push(r);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-background shadow-xl"
        role="dialog"
        aria-labelledby="features-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div>
            <h2 id="features-title" className="text-lg font-semibold">
              Funcionalidades
            </h2>
            <p className="text-sm text-muted-foreground">{tenantName}</p>
            {data?.currentPackageCode ? (
              <p className="text-xs text-muted-foreground mt-1">
                Plano base: <span className="font-mono">{data.currentPackageCode}</span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {isLoading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground mx-auto block" />
          ) : (
            <>
              {Object.entries(byGroup).map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {group}
                  </p>
                  <ul className="space-y-3">
                    {items.map((r) => (
                      <li key={r.code} className="text-sm">
                        <p className="font-medium mb-1">
                          {r.label}{" "}
                          <span className="font-mono text-xs text-muted-foreground">({r.code})</span>
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {(
                            [
                              ["default", "Padrão do plano"],
                              ["on", "Liberar"],
                              ["off", "Bloquear"],
                            ] as const
                          ).map(([value, label]) => (
                            <label
                              key={value}
                              className="inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={`mode-${r.code}`}
                                checked={(modes[r.code] ?? "default") === value}
                                onChange={() =>
                                  setModes((m) => ({ ...m, [r.code]: value }))
                                }
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  disabled={save.isPending}
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Salvar"
                  )}
                </Button>
                <Button size="sm" variant="outline" type="button" onClick={onClose}>
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminTenantsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [featuresTenant, setFeaturesTenant] = useState<TenantRow | null>(null);

  const { data: tenants = [], isLoading } = useQuery<TenantRow[]>({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/admin/tenants`, { headers: getApiHeaders() });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: Boolean(user?.isPlatformUser),
  });

  const { data: registry = [] } = useQuery<RegistryItem[]>({
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

  const setPackage = useMutation({
    mutationFn: async ({
      tenantId,
      packageCode,
    }: {
      tenantId: string;
      packageCode: string;
    }) => {
      const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/package`, {
        method: "PUT",
        headers: { ...getApiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ packageCode }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tenants"] }),
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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="size-7" />
          Organizações (tenants)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ajuste o pacote contratado e libere ou bloqueie funcionalidades por organização (além do que
          o plano já inclui).
        </p>
      </div>

      {isLoading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-3 font-medium">Organização</th>
                <th className="p-3 font-medium">Slug</th>
                <th className="p-3 font-medium">Plano</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium w-[200px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-border/60">
                  <td className="p-3 font-medium">{t.name}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{t.slug}</td>
                  <td className="p-3">
                    <select
                      className="h-9 rounded-lg border border-white/[0.08] bg-background px-2 text-sm max-w-[140px]"
                      value={t.currentPackageCode ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        setPackage.mutate({ tenantId: t.id, packageCode: v });
                      }}
                      disabled={setPackage.isPending}
                    >
                      <option value="" disabled>
                        —
                      </option>
                      <option value="starter">starter</option>
                      <option value="growth">growth</option>
                      <option value="scale">scale</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={t.active ? "default" : "secondary"}>
                        {t.operationalStatus}
                      </Badge>
                      <Badge variant="outline">{t.approvalStatus}</Badge>
                    </div>
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFeaturesTenant(t)}
                    >
                      Funcionalidades
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {featuresTenant ? (
        <FeaturesPanel
          tenantId={featuresTenant.id}
          tenantName={featuresTenant.name}
          registry={registry}
          onClose={() => setFeaturesTenant(null)}
        />
      ) : null}
    </div>
  );
}
