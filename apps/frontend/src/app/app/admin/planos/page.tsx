"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { getApiHeaders, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Package, Plus, Shield, X, Check, Sparkles } from "lucide-react";

/* ── types ───────────────────────────────────────────────────────────────── */
type PackagePlan = { code: string; name: string; featureCodes: string[]; updatedAt: string };
type RegistryItem = { code: string; label: string; group: string };

const PLAN_SLUG = /^[a-z][a-z0-9-]{1,62}$/;

/* ── plan accent hue (cycles through nice colors) ────────────────────────── */
const ACCENT_HUES = [268, 320, 190, 85, 30, 145];
function planHue(idx: number) {
  return ACCENT_HUES[idx % ACCENT_HUES.length];
}

/* ── CreatePlanForm ──────────────────────────────────────────────────────── */
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
      if (!PLAN_SLUG.test(normalized)) throw new Error("Código inválido: minúsculas, números e hífen; 2–64 caracteres, começando com letra.");
      if (!name.trim()) throw new Error("Informe o nome do plano.");
      const base = copyFrom ? (packages.find((p) => p.code === copyFrom)?.featureCodes ?? []) : [];
      const res = await fetch(`${API_URL}/admin/packages`, {
        method: "POST",
        headers: { ...getApiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized, name: name.trim(), featureCodes: [...base] }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(t || "Erro ao criar plano"); }
      return res.json();
    },
    onSuccess: () => { setFormError(null); setCode(""); setName(""); setCopyFrom(""); onCreated(); onClose(); },
    onError: (err: Error) => setFormError(err.message),
  });

  const inputStyle: React.CSSProperties = {
    background: "oklch(0.10 0.012 268)",
    border: "1px solid oklch(1 0 0 / 10%)",
    borderRadius: 10,
    color: "oklch(0.92 0.006 268)",
    fontSize: 13,
    height: 38,
    outline: "none",
  };

  return (
    <div style={{ gridColumn: "1 / -1", borderRadius: 18, border: "1px solid oklch(0.62 0.26 268 / 30%)", background: "oklch(0.11 0.014 268)", padding: "20px 24px", boxShadow: "0 8px 32px oklch(0 0 0 / 25%), 0 0 0 1px oklch(0.62 0.26 268 / 12%) inset" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, oklch(0.62 0.26 268), oklch(0.68 0.24 300))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={15} style={{ color: "white" }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "oklch(0.94 0.005 268)", margin: 0 }}>Novo plano</p>
            <p style={{ fontSize: 11.5, color: "oklch(0.48 0.016 268)", margin: 0 }}>Defina código, nome e funcionalidades base</p>
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 8%)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "oklch(0.58 0.018 268)" }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div>
          <Label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "oklch(0.46 0.016 268)" }}>Código (slug)</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="ex.: enterprise" autoComplete="off" style={inputStyle} className="mt-1.5" />
        </div>
        <div>
          <Label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "oklch(0.46 0.016 268)" }}>Nome do plano</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Enterprise" style={inputStyle} className="mt-1.5" />
        </div>
        <div>
          <Label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "oklch(0.46 0.016 268)" }}>Copiar módulos de</Label>
          <select
            value={copyFrom}
            onChange={(e) => setCopyFrom(e.target.value)}
            style={{ height: 38, width: "100%", borderRadius: 10, border: "1px solid oklch(1 0 0 / 10%)", background: "oklch(0.10 0.012 268)", padding: "0 10px", fontSize: 13, color: "oklch(0.88 0.006 268)", outline: "none", cursor: "pointer", fontFamily: "inherit", marginTop: 6 }}
          >
            <option value="">Nenhum</option>
            {packages.map((p) => <option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
          </select>
        </div>
      </div>

      {formError && (
        <div style={{ marginTop: 12, padding: "9px 14px", background: "oklch(0.55 0.22 27 / 9%)", border: "1px solid oklch(0.55 0.22 27 / 28%)", borderRadius: 9, fontSize: 12.5, color: "oklch(0.72 0.18 27)", fontWeight: 500 }}>
          {formError}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          type="button"
          disabled={create.isPending}
          onClick={() => { setFormError(null); create.mutate(); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 18px", borderRadius: 10, background: "linear-gradient(135deg, oklch(0.60 0.26 268), oklch(0.66 0.24 300))", border: "none", color: "white", fontWeight: 700, fontSize: 13, cursor: create.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px oklch(0.62 0.26 268 / 28%)" }}
        >
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Criar plano
        </button>
        <button type="button" onClick={onClose} style={{ height: 36, padding: "0 14px", borderRadius: 10, background: "transparent", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(0.58 0.018 268)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ── PlanCard ────────────────────────────────────────────────────────────── */
function PlanCard({
  plan,
  registry,
  canEdit,
  onSaved,
  accentHue,
}: {
  plan: PackagePlan;
  registry: RegistryItem[];
  canEdit: boolean;
  onSaved: () => void;
  accentHue: number;
}) {
  const [name, setName] = useState(plan.name);
  const [codes, setCodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setName(plan.name);
    const m: Record<string, boolean> = {};
    for (const r of registry) m[r.code] = plan.featureCodes.includes(r.code);
    setCodes(m);
  }, [plan, registry]);

  const save = useMutation({
    mutationFn: async () => {
      const featureCodes = Object.entries(codes).filter(([, v]) => v).map(([k]) => k);
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

  const enabledCount = Object.values(codes).filter(Boolean).length;
  const totalCount = registry.length;

  return (
    <div style={{ borderRadius: 18, border: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.10 0.012 268)", display: "flex", flexDirection: "column", overflow: "hidden", transition: "box-shadow 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 8px 32px oklch(0 0 0 / 30%), 0 0 0 1px oklch(0.62 0.20 ${accentHue} / 15%) inset`; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, oklch(0.62 0.22 ${accentHue}), oklch(0.68 0.20 ${(accentHue + 40) % 360}))` }} />

      {/* Card header */}
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `oklch(0.62 0.22 ${accentHue} / 14%)`, border: `1px solid oklch(0.62 0.22 ${accentHue} / 25%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={14} style={{ color: `oklch(0.72 0.20 ${accentHue})` }} />
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: `oklch(0.68 0.18 ${accentHue})` }}>{plan.code}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: `oklch(0.72 0.20 ${accentHue})`, background: `oklch(0.62 0.22 ${accentHue} / 12%)`, border: `1px solid oklch(0.62 0.22 ${accentHue} / 22%)`, padding: "2px 8px", borderRadius: 999 }}>
              {enabledCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* Name input */}
        <div>
          <Label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "oklch(0.44 0.016 268)" }}>Nome do plano</Label>
          <Input
            id={`name-${plan.code}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            style={{ marginTop: 6, height: 36, background: "oklch(0.13 0.015 268)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 9, color: "oklch(0.92 0.006 268)", fontSize: 13 }}
          />
        </div>
      </div>

      {/* Feature groups — scrollable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px", maxHeight: 400 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "oklch(0.44 0.016 268)", marginBottom: 12 }}>
          Funcionalidades incluídas
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {Object.entries(byGroup).map(([group, items]) => (
            <div key={group}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                <div style={{ height: 2, width: 10, borderRadius: 1, background: `oklch(0.62 0.22 ${accentHue} / 60%)` }} />
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.44 0.016 268)" }}>{group}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {items.map((r) => {
                  const checked = codes[r.code] ?? false;
                  return (
                    <label
                      key={r.code}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 8px", borderRadius: 7, cursor: canEdit ? "pointer" : "default", transition: "background 0.1s", background: checked ? `oklch(0.62 0.22 ${accentHue} / 7%)` : "transparent" }}
                      onMouseEnter={(e) => { if (canEdit) e.currentTarget.style.background = `oklch(0.62 0.22 ${accentHue} / ${checked ? 10 : 4}%)`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = checked ? `oklch(0.62 0.22 ${accentHue} / 7%)` : "transparent"; }}
                    >
                      {/* Custom checkbox */}
                      <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${checked ? `oklch(0.62 0.22 ${accentHue})` : "oklch(1 0 0 / 18%)"}`, background: checked ? `oklch(0.62 0.22 ${accentHue})` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}>
                        {checked && <Check size={10} style={{ color: "white", strokeWidth: 3 }} />}
                      </div>
                      <input type="checkbox" checked={checked} onChange={(e) => setCodes((c) => ({ ...c, [r.code]: e.target.checked }))} disabled={!canEdit} style={{ display: "none" }} id={`${plan.code}-${r.code}`} />
                      <div>
                        <span style={{ fontSize: 12.5, fontWeight: checked ? 500 : 400, color: checked ? "oklch(0.92 0.006 268)" : "oklch(0.60 0.016 268)", transition: "color 0.12s" }}>{r.label}</span>
                        <span style={{ fontSize: 10.5, color: "oklch(0.40 0.012 268)", fontFamily: "monospace", marginLeft: 5 }}>({r.code})</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid oklch(1 0 0 / 6%)" }}>
        {canEdit ? (
          <button
            type="button"
            disabled={save.isPending || !name.trim()}
            onClick={() => save.mutate()}
            style={{ width: "100%", height: 36, borderRadius: 10, background: save.isPending || !name.trim() ? "oklch(0.42 0.16 268)" : `linear-gradient(135deg, oklch(0.58 0.22 ${accentHue}), oklch(0.64 0.20 ${(accentHue + 40) % 360}))`, border: "none", color: "white", fontWeight: 700, fontSize: 13, cursor: save.isPending || !name.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.15s", boxShadow: save.isPending || !name.trim() ? "none" : `0 4px 14px oklch(0.60 0.22 ${accentHue} / 28%)` }}
          >
            {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Salvar plano
          </button>
        ) : (
          <p style={{ fontSize: 11.5, color: "oklch(0.44 0.014 268)", textAlign: "center" }}>
            Apenas administradores podem editar planos.
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminPlanosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const canEdit = user?.role === "platform_admin";
  const [showCreate, setShowCreate] = useState(false);

  const { data: registry = [], isLoading: regLoading } = useQuery<RegistryItem[]>({
    queryKey: ["admin-feature-registry"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/admin/feature-registry`, { headers: getApiHeaders() });
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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, oklch(0.62 0.26 268), oklch(0.68 0.24 300))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px oklch(0.62 0.26 268 / 30%)" }}>
              <Sparkles size={17} style={{ color: "white" }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "oklch(0.94 0.005 268)", margin: 0 }}>Planos e funcionalidades</h1>
            {packages.length > 0 && (
              <span style={{ padding: "2px 8px", background: "oklch(0.62 0.26 268 / 12%)", border: "1px solid oklch(0.62 0.26 268 / 25%)", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "oklch(0.72 0.22 268)" }}>
                {packages.length} planos
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: "oklch(0.50 0.018 268)", margin: 0, maxWidth: 520 }}>
            Crie e edite planos. Os módulos definem permissões por tenant junto com overrides manuais.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px", borderRadius: 10, background: showCreate ? "oklch(0.62 0.26 268 / 15%)" : "oklch(0.13 0.015 268)", border: `1px solid ${showCreate ? "oklch(0.62 0.26 268 / 40%)" : "oklch(1 0 0 / 10%)"}`, color: showCreate ? "oklch(0.78 0.22 268)" : "oklch(0.72 0.008 268)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
          >
            {showCreate ? <X size={14} /> : <Plus size={14} />}
            {showCreate ? "Fechar" : "Novo plano"}
          </button>
        )}
      </div>

      {/* ── Grid ── */}
      {regLoading || pkgLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {showCreate && canEdit && (
            <CreatePlanForm
              packages={packages}
              onClose={() => setShowCreate(false)}
              onCreated={() => qc.invalidateQueries({ queryKey: ["admin-packages"] })}
            />
          )}
          {packages.map((p, idx) => (
            <PlanCard
              key={p.code}
              plan={p}
              registry={registry}
              canEdit={canEdit}
              accentHue={planHue(idx)}
              onSaved={() => qc.invalidateQueries({ queryKey: ["admin-packages"] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
