"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { getApiHeaders, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Building2, Shield, X, SlidersHorizontal, Check } from "lucide-react";

/* ── helpers ─────────────────────────────────────────────────────────────── */
function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
}
function nameToHue(name: string) {
  return name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}

/* ── types ───────────────────────────────────────────────────────────────── */
type TenantRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  currentPackageCode: string | null;
  approvalStatus: string;
  operationalStatus: string;
};
type PackagePlanRow = { code: string; name: string; featureCodes: string[] };
type RegistryItem = { code: string; label: string; group: string };
type TenantFeaturesResponse = {
  currentPackageCode: string | null;
  effectiveFeatureCodes: string[];
  manualOverrides: { featureCode: string; enabled: boolean }[];
};
type FeatureMode = "default" | "on" | "off";

/* ── SegmentedToggle ─────────────────────────────────────────────────────── */
function SegmentedToggle({
  value,
  onChange,
  name,
}: {
  value: FeatureMode;
  onChange: (v: FeatureMode) => void;
  name: string;
}) {
  const options: { val: FeatureMode; label: string; activeHue: number }[] = [
    { val: "default", label: "Padrão", activeHue: 268 },
    { val: "on",      label: "Liberar", activeHue: 145 },
    { val: "off",     label: "Bloquear", activeHue: 27 },
  ];
  return (
    <div style={{ display: "inline-flex", border: "1px solid oklch(1 0 0 / 9%)", borderRadius: 8, overflow: "hidden", background: "oklch(0.10 0.012 268)" }}>
      {options.map(({ val, label, activeHue }, i) => {
        const active = value === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            aria-pressed={active}
            style={{
              height: 28,
              padding: "0 10px",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              border: "none",
              borderLeft: i > 0 ? "1px solid oklch(1 0 0 / 9%)" : "none",
              background: active ? `oklch(0.62 0.20 ${activeHue} / 18%)` : "transparent",
              color: active ? `oklch(0.76 0.18 ${activeHue})` : "oklch(0.48 0.016 268)",
              transition: "all 0.15s",
            }}
          >
            {active && <Check size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── FeaturesPanel ───────────────────────────────────────────────────────── */
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
      const r = await fetch(`${API_URL}/admin/tenants/${tenantId}/features`, { headers: getApiHeaders() });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  useEffect(() => {
    if (!data) return;
    const ov = new Map(data.manualOverrides.map((o) => [o.featureCode, o.enabled] as const));
    const next: Record<string, FeatureMode> = {};
    for (const r of registry) {
      next[r.code] = !ov.has(r.code) ? "default" : ov.get(r.code) ? "on" : "off";
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

  const overrideCount = Object.values(modes).filter((m) => m !== "default").length;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "oklch(0 0 0 / 65%)", backdropFilter: "blur(6px)" }}>
      <div
        role="dialog"
        aria-labelledby="features-title"
        style={{ width: "100%", maxWidth: 520, maxHeight: "88vh", display: "flex", flexDirection: "column", borderRadius: 20, border: "1px solid oklch(1 0 0 / 8%)", background: "oklch(0.10 0.012 268)", boxShadow: "0 32px 80px oklch(0 0 0 / 60%)" }}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "20px 24px 16px", borderBottom: "1px solid oklch(1 0 0 / 7%)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg, oklch(0.62 0.26 268), oklch(0.68 0.24 300))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px oklch(0.62 0.26 268 / 30%)", flexShrink: 0 }}>
              <SlidersHorizontal size={17} style={{ color: "white" }} />
            </div>
            <div>
              <h2 id="features-title" style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.94 0.005 268)", margin: 0, lineHeight: 1.3 }}>Funcionalidades</h2>
              <p style={{ fontSize: 12, color: "oklch(0.50 0.018 268)", margin: 0 }}>{tenantName}</p>
              {data?.currentPackageCode && (
                <span style={{ display: "inline-flex", alignItems: "center", marginTop: 3, padding: "1px 7px", background: "oklch(0.62 0.26 268 / 10%)", border: "1px solid oklch(0.62 0.26 268 / 22%)", borderRadius: 6, fontSize: 10, fontWeight: 600, color: "oklch(0.70 0.22 268)", fontFamily: "monospace" }}>
                  {data.currentPackageCode}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {overrideCount > 0 && (
              <span style={{ padding: "2px 8px", background: "oklch(0.78 0.17 80 / 12%)", border: "1px solid oklch(0.78 0.17 80 / 28%)", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "oklch(0.80 0.15 80)" }}>
                {overrideCount} override{overrideCount !== 1 ? "s" : ""}
              </span>
            )}
            <button type="button" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 8%)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "oklch(0.60 0.018 268)" }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", padding: "16px 24px", flex: 1 }}>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
              <Loader2 size={22} style={{ color: "oklch(0.52 0.02 268)", animation: "spin 1s linear infinite" }} className="animate-spin" />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {Object.entries(byGroup).map(([group, items]) => (
                <div key={group}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 1, background: "oklch(1 0 0 / 6%)" }} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.44 0.016 268)", whiteSpace: "nowrap" }}>{group}</span>
                    <div style={{ flex: 1, height: 1, background: "oklch(1 0 0 / 6%)" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map((r) => {
                      const mode = modes[r.code] ?? "default";
                      return (
                        <div key={r.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 12px", borderRadius: 10, background: mode !== "default" ? "oklch(0.13 0.015 268)" : "transparent", border: `1px solid ${mode !== "default" ? "oklch(1 0 0 / 8%)" : "transparent"}`, transition: "all 0.15s" }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: "oklch(0.88 0.006 268)" }}>{r.label}</span>
                            <span style={{ fontSize: 11, color: "oklch(0.44 0.016 268)", fontFamily: "monospace", marginLeft: 6 }}>({r.code})</span>
                          </div>
                          <SegmentedToggle
                            name={`mode-${r.code}`}
                            value={mode}
                            onChange={(v) => setModes((m) => ({ ...m, [r.code]: v }))}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, padding: "14px 24px", borderTop: "1px solid oklch(1 0 0 / 7%)", flexShrink: 0 }}>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            style={{ height: 38, padding: "0 20px", borderRadius: 10, background: "linear-gradient(135deg, oklch(0.60 0.26 268), oklch(0.66 0.24 300))", border: "none", color: "white", fontWeight: 700, fontSize: 13, cursor: save.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px oklch(0.62 0.26 268 / 28%)" }}
          >
            {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Salvar alterações
          </button>
          <button type="button" onClick={onClose} style={{ height: 38, padding: "0 16px", borderRadius: 10, background: "transparent", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(0.60 0.018 268)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
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
      const r = await fetch(`${API_URL}/admin/feature-registry`, { headers: getApiHeaders() });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: Boolean(user?.isPlatformUser),
  });

  const { data: packagePlans = [] } = useQuery<PackagePlanRow[]>({
    queryKey: ["admin-packages"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/admin/packages`, { headers: getApiHeaders() });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: Boolean(user?.isPlatformUser),
  });

  const setPackage = useMutation({
    mutationFn: async ({ tenantId, packageCode }: { tenantId: string; packageCode: string }) => {
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

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;

  if (!user?.isPlatformUser) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "oklch(0.55 0.22 27 / 12%)", border: "1px solid oklch(0.55 0.22 27 / 25%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Shield size={24} style={{ color: "oklch(0.65 0.20 27)" }} />
        </div>
        <div className="text-center">
          <p style={{ fontSize: 15, fontWeight: 600, color: "oklch(0.88 0.008 268)", marginBottom: 4 }}>Área restrita</p>
          <p style={{ fontSize: 13, color: "oklch(0.50 0.018 268)" }}>Apenas a equipe Aureon tem acesso.</p>
        </div>
        <Link href="/app" style={{ fontSize: 13, fontWeight: 600, color: "oklch(0.68 0.22 268)", textDecoration: "none" }}>← Voltar ao painel</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, oklch(0.62 0.26 268), oklch(0.68 0.24 300))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px oklch(0.62 0.26 268 / 30%)" }}>
            <Building2 size={18} style={{ color: "white" }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "oklch(0.94 0.005 268)", margin: 0 }}>Organizações</h1>
          {tenants.length > 0 && (
            <span style={{ padding: "2px 8px", background: "oklch(0.62 0.26 268 / 12%)", border: "1px solid oklch(0.62 0.26 268 / 25%)", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "oklch(0.72 0.22 268)" }}>
              {tenants.length}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "oklch(0.50 0.018 268)", margin: 0 }}>
          Ajuste planos e libere ou bloqueie funcionalidades por tenant (overrides manuais).
        </p>
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div style={{ borderRadius: 16, border: "1px solid oklch(1 0 0 / 7%)", overflow: "hidden", background: "oklch(0.10 0.012 268)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}>
                  {["Organização", "Plano", "Status", "Ações"].map((h, i) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "oklch(0.44 0.016 268)", width: i === 3 ? 160 : "auto" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const hue = nameToHue(t.name);
                  const isActive = t.operationalStatus === "active";
                  return (
                    <tr
                      key={t.id}
                      style={{ borderBottom: "1px solid oklch(1 0 0 / 5%)", transition: "background 0.12s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "oklch(1 0 0 / 2%)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* Org */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg, oklch(0.55 0.22 ${hue}), oklch(0.62 0.18 ${(hue + 40) % 360}))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white" }}>
                            {getInitials(t.name)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "oklch(0.92 0.006 268)", lineHeight: 1.3 }}>{t.name}</div>
                            <div style={{ fontSize: 11, color: "oklch(0.44 0.014 268)", fontFamily: "monospace", lineHeight: 1.3 }}>{t.slug}</div>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td style={{ padding: "12px 16px" }}>
                        <select
                          style={{ height: 32, minWidth: 180, maxWidth: 220, borderRadius: 9, border: "1px solid oklch(1 0 0 / 9%)", background: "oklch(0.13 0.015 268)", padding: "0 10px", fontSize: 12, fontWeight: 500, color: "oklch(0.88 0.008 268)", outline: "none", cursor: "pointer", fontFamily: "inherit" }}
                          value={t.currentPackageCode ?? ""}
                          onChange={(e) => { const v = e.target.value; if (!v) return; setPackage.mutate({ tenantId: t.id, packageCode: v }); }}
                          disabled={setPackage.isPending}
                        >
                          <option value="" disabled>—</option>
                          {t.currentPackageCode && !packagePlans.some((p) => p.code === t.currentPackageCode) && (
                            <option value={t.currentPackageCode}>{t.currentPackageCode} (não listado)</option>
                          )}
                          {packagePlans.map((p) => (
                            <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                          ))}
                        </select>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: isActive ? "oklch(0.70 0.19 145 / 12%)" : "oklch(0.52 0.02 268 / 10%)", border: `1px solid ${isActive ? "oklch(0.70 0.19 145 / 28%)" : "oklch(0.52 0.02 268 / 20%)"}`, borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: isActive ? "oklch(0.72 0.16 145)" : "oklch(0.55 0.018 268)" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "oklch(0.70 0.19 145)" : "oklch(0.50 0.016 268)", animation: isActive ? "lp-badge-blink 2.5s ease-in-out infinite" : "none" }} />
                            {t.operationalStatus}
                          </span>
                          <span style={{ display: "inline-flex", padding: "3px 9px", background: "oklch(0.62 0.26 268 / 10%)", border: "1px solid oklch(0.62 0.26 268 / 22%)", borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: "oklch(0.70 0.22 268)" }}>
                            {t.approvalStatus}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => setFeaturesTenant(t)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 14px", borderRadius: 9, background: "oklch(0.13 0.015 268)", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(0.72 0.008 268)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.62 0.26 268 / 40%)"; e.currentTarget.style.color = "oklch(0.78 0.20 268)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(1 0 0 / 10%)"; e.currentTarget.style.color = "oklch(0.72 0.008 268)"; }}
                        >
                          <SlidersHorizontal size={13} />
                          Funcionalidades
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {featuresTenant && (
        <FeaturesPanel
          tenantId={featuresTenant.id}
          tenantName={featuresTenant.name}
          registry={registry}
          onClose={() => setFeaturesTenant(null)}
        />
      )}
    </div>
  );
}
