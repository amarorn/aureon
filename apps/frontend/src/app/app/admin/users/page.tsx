"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { getApiHeaders, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Shield, UserCog, Copy, Check, KeyRound, Lock, Unlock } from "lucide-react";

/* ── helpers ─────────────────────────────────────────────────────────────── */
function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function nameToHue(name: string) {
  return name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}

function roleConfig(role: string) {
  const m: Record<string, { label: string; hue: number }> = {
    platform_admin:   { label: "Admin plataforma", hue: 268 },
    platform_support: { label: "Suporte",           hue: 190 },
    tenant_owner:     { label: "Proprietário",       hue: 85  },
    tenant_admin:     { label: "Admin org.",         hue: 320 },
    tenant_member:    { label: "Membro",             hue: 220 },
  };
  return m[role] ?? { label: role, hue: 268 };
}

function statusConfig(status: string) {
  const m: Record<string, { label: string; hue: number; chroma: number }> = {
    active:           { label: "Ativo",      hue: 145, chroma: 0.19 },
    blocked:          { label: "Bloqueado",  hue: 27,  chroma: 0.22 },
    pending_approval: { label: "Pendente",   hue: 80,  chroma: 0.17 },
    invited:          { label: "Convidado",  hue: 268, chroma: 0.20 },
  };
  return m[status] ?? { label: status, hue: 268, chroma: 0.08 };
}

/* ── types ───────────────────────────────────────────────────────────────── */
type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  isPlatformUser: boolean;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  currentPackageCode: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};
type PackagePlanRow = { code: string; name: string; featureCodes: string[] };

/* ── select style ────────────────────────────────────────────────────────── */
const selectCls =
  "h-8 w-full max-w-[200px] rounded-lg border border-white/[0.09] bg-[oklch(0.13_0.015_268)] px-2 text-xs text-[oklch(0.90_0.008_268)] outline-none focus:border-[oklch(0.62_0.26_268/50%)] transition-colors cursor-pointer";

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminUsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const canMutate = user?.role === "platform_admin";
  const [tempPassword, setTempPassword] = useState<{ userLabel: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: rows = [], isLoading } = useQuery<AdminUserRow[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/admin/users`, { headers: getApiHeaders() });
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

  const planLabel = useMemo(() => {
    const m = new Map(packagePlans.map((p) => [p.code, p.name] as const));
    return (code: string | null) => (code ? (m.get(code) ?? code) : "—");
  }, [packagePlans]);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "blocked" }) => {
      const res = await fetch(`${API_URL}/admin/users/${id}/status`, {
        method: "PUT",
        headers: { ...getApiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const resetPassword = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: getApiHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ temporaryPassword: string }>;
    },
    onSuccess: (data, userId) => {
      const u = rows.find((r) => r.id === userId);
      setTempPassword({ userLabel: u ? `${u.name} (${u.email})` : userId, password: data.temporaryPassword });
      setCopied(false);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const setTenantPackage = useMutation({
    mutationFn: async ({ tenantId, packageCode }: { tenantId: string; packageCode: string }) => {
      const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/package`, {
        method: "PUT",
        headers: { ...getApiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ packageCode }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-tenants"] });
    },
  });

  async function copyPassword() {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ── loading / access ─── */
  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, oklch(0.62 0.26 268), oklch(0.68 0.24 300))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px oklch(0.62 0.26 268 / 30%)" }}>
              <UserCog size={18} style={{ color: "white" }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "oklch(0.94 0.005 268)", margin: 0 }}>Usuários</h1>
            {rows.length > 0 && (
              <span style={{ padding: "2px 8px", background: "oklch(0.62 0.26 268 / 12%)", border: "1px solid oklch(0.62 0.26 268 / 25%)", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "oklch(0.72 0.22 268)" }}>
                {rows.length}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: "oklch(0.50 0.018 268)", margin: 0 }}>
            Gerencie contas, planos e senhas. Ações afetam todos os usuários do tenant.
          </p>
          {!canMutate && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 10px", background: "oklch(0.78 0.17 80 / 10%)", border: "1px solid oklch(0.78 0.17 80 / 25%)", borderRadius: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "oklch(0.78 0.17 80)" }} />
              <span style={{ fontSize: 11, color: "oklch(0.80 0.15 80)", fontWeight: 600 }}>Modo somente leitura — sem permissão para mutações</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Temp password banner ── */}
      {tempPassword && (
        <div style={{ borderRadius: 14, border: "1px solid oklch(0.78 0.17 80 / 35%)", background: "oklch(0.78 0.17 80 / 8%)", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "oklch(0.78 0.17 80 / 15%)", border: "1px solid oklch(0.78 0.17 80 / 30%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <KeyRound size={16} style={{ color: "oklch(0.82 0.14 80)" }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 13, color: "oklch(0.88 0.008 268)", margin: 0, marginBottom: 2 }}>Senha provisória gerada para {tempPassword.userLabel}</p>
              <p style={{ fontSize: 12, color: "oklch(0.58 0.02 268)", margin: 0 }}>Copie agora — esta senha não será exibida novamente. O usuário deve alterá-la após o primeiro login.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <code style={{ borderRadius: 8, background: "oklch(0.10 0.012 268)", padding: "8px 14px", fontFamily: "monospace", fontSize: 13, letterSpacing: "0.06em", border: "1px solid oklch(1 0 0 / 8%)", color: "oklch(0.94 0.005 268)" }}>
              {tempPassword.password}
            </code>
            <button
              type="button"
              onClick={() => void copyPassword()}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: 8, background: copied ? "oklch(0.70 0.19 145 / 15%)" : "oklch(0.78 0.17 80 / 15%)", border: `1px solid ${copied ? "oklch(0.70 0.19 145 / 35%)" : "oklch(0.78 0.17 80 / 35%)"}`, color: copied ? "oklch(0.72 0.16 145)" : "oklch(0.82 0.14 80)", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copiado!" : "Copiar"}
            </button>
            <button
              type="button"
              onClick={() => setTempPassword(null)}
              style={{ height: 34, padding: "0 14px", borderRadius: 8, background: "transparent", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(0.52 0.018 268)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div style={{ borderRadius: 16, border: "1px solid oklch(1 0 0 / 7%)", overflow: "hidden", background: "oklch(0.10 0.012 268)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}>
                  {["Usuário", "Organização", "Plano", "Papel", "Status", "Ações"].map((h, i) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "oklch(0.44 0.016 268)", whiteSpace: "nowrap", width: i === 5 ? 280 : "auto" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const sc = statusConfig(u.status);
                  const rc = roleConfig(u.role);
                  const hue = nameToHue(u.name);
                  return (
                    <tr
                      key={u.id}
                      style={{ borderBottom: "1px solid oklch(1 0 0 / 5%)", transition: "background 0.12s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "oklch(1 0 0 / 2%)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* User */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, oklch(0.58 0.26 ${hue}), oklch(0.64 0.22 ${(hue + 30) % 360}))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white", boxShadow: `0 0 10px oklch(0.58 0.26 ${hue} / 30%)` }}>
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "oklch(0.92 0.006 268)", lineHeight: 1.3 }}>{u.name}</div>
                            <div style={{ fontSize: 11.5, color: "oklch(0.48 0.016 268)", lineHeight: 1.3 }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Org */}
                      <td style={{ padding: "12px 16px" }}>
                        {u.isPlatformUser ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", background: "oklch(0.62 0.26 268 / 10%)", border: "1px solid oklch(0.62 0.26 268 / 22%)", borderRadius: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "oklch(0.72 0.22 268)" }}>Aureon</span>
                          </div>
                        ) : u.tenantName ? (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "oklch(0.88 0.006 268)" }}>{u.tenantName}</div>
                            <div style={{ fontSize: 11, color: "oklch(0.42 0.014 268)", fontFamily: "monospace" }}>{u.tenantSlug}</div>
                          </div>
                        ) : (
                          <span style={{ color: "oklch(0.38 0.010 268)", fontSize: 13 }}>—</span>
                        )}
                      </td>

                      {/* Plan */}
                      <td style={{ padding: "12px 16px" }}>
                        {u.isPlatformUser || !u.tenantId ? (
                          <span style={{ color: "oklch(0.38 0.010 268)", fontSize: 13 }}>—</span>
                        ) : (
                          <select
                            className={selectCls}
                            value={u.currentPackageCode ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v || !u.tenantId) return;
                              setTenantPackage.mutate({ tenantId: u.tenantId, packageCode: v });
                            }}
                            disabled={setTenantPackage.isPending}
                          >
                            <option value="" disabled>—</option>
                            {u.currentPackageCode && !packagePlans.some((p) => p.code === u.currentPackageCode) && (
                              <option value={u.currentPackageCode}>{planLabel(u.currentPackageCode)} (atual)</option>
                            )}
                            {packagePlans.map((p) => (
                              <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Role */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", background: `oklch(0.62 0.20 ${rc.hue} / 12%)`, border: `1px solid oklch(0.62 0.20 ${rc.hue} / 25%)`, borderRadius: 999, fontSize: 11, fontWeight: 600, color: `oklch(0.75 0.18 ${rc.hue})`, whiteSpace: "nowrap" }}>
                          {rc.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: `oklch(0.62 ${sc.chroma} ${sc.hue} / 12%)`, border: `1px solid oklch(0.62 ${sc.chroma} ${sc.hue} / 25%)`, borderRadius: 999, fontSize: 12, fontWeight: 600, color: `oklch(0.76 ${sc.chroma - 0.03} ${sc.hue})`, whiteSpace: "nowrap" }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: `oklch(0.70 ${sc.chroma} ${sc.hue})`, flexShrink: 0 }} />
                          {sc.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 16px" }}>
                        {u.isPlatformUser ? (
                          <span style={{ fontSize: 12, color: "oklch(0.38 0.010 268)" }}>—</span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {canMutate ? (
                              <>
                                {u.status === "blocked" ? (
                                  <button
                                    disabled={setStatus.isPending}
                                    onClick={() => setStatus.mutate({ id: u.id, status: "active" })}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 30, padding: "0 12px", borderRadius: 8, background: "oklch(0.70 0.19 145 / 10%)", border: "1px solid oklch(0.70 0.19 145 / 30%)", color: "oklch(0.72 0.16 145)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                                  >
                                    <Unlock size={12} /> Desbloquear
                                  </button>
                                ) : (
                                  <button
                                    disabled={setStatus.isPending}
                                    onClick={() => setStatus.mutate({ id: u.id, status: "blocked" })}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 30, padding: "0 12px", borderRadius: 8, background: "oklch(0.65 0.22 27 / 10%)", border: "1px solid oklch(0.65 0.22 27 / 30%)", color: "oklch(0.72 0.20 27)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                                  >
                                    <Lock size={12} /> Bloquear
                                  </button>
                                )}
                                <button
                                  disabled={resetPassword.isPending}
                                  onClick={() => {
                                    if (!window.confirm(`Gerar nova senha para ${u.email}?`)) return;
                                    resetPassword.mutate(u.id);
                                  }}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 30, padding: "0 12px", borderRadius: 8, background: "oklch(0.13 0.015 268)", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(0.72 0.008 268)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                                >
                                  <KeyRound size={12} /> Nova senha
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: 11, color: "oklch(0.42 0.014 268)" }}>Somente leitura</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
