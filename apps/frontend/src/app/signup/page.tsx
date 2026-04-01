"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, Users, TrendingUp, Globe, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

const stats = [
  { icon: Users, label: "Empresas ativas", value: "500+" },
  { icon: TrendingUp, label: "Conversão média", value: "+32%" },
  { icon: Globe, label: "Países atendidos", value: "12" },
];

const PACKAGES = [
  { value: "starter", label: "Starter — CRM essencial" },
  { value: "growth", label: "Growth — + Inbox, automação, calendário" },
  { value: "scale", label: "Scale — + Ads, analytics, propostas, reputação" },
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [phone, setPhone] = useState("");
  const [requestedPackageCode, setRequestedPackageCode] = useState("growth");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          companyName,
          phone,
          requestedPackageCode,
          ...(companySlug.trim() ? { companySlug: companySlug.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(" ") : data.message || "Erro ao cadastrar";
        throw new Error(msg);
      }
      router.push("/signup/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 75% 50%, oklch(0.62 0.26 268 / 13%) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 15% 85%, oklch(0.72 0.22 320 / 8%) 0%, transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(oklch(0.8 0 0) 1px, transparent 1px),
            linear-gradient(to right, oklch(0.8 0 0) 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-xl gradient-primary glow-primary-sm">
              <Sparkles className="size-4 text-white" />
            </div>
            <span className="text-base font-bold gradient-text">Aureon</span>
          </div>

          <div className="mb-8">
            <h1 className="mb-1.5 text-2xl font-bold tracking-tight">Crie sua conta</h1>
            <p className="text-sm text-muted-foreground">
              Preencha os dados. O acesso será liberado após aprovação da equipe.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Seu nome"
                className="h-10 bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail corporativo *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="voce@empresa.com"
                className="h-10 bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha * (mín. 8 caracteres)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-10 bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Nome da empresa *</Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                placeholder="Razão social ou nome fantasia"
                className="h-10 bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug da empresa (opcional)</Label>
              <Input
                id="slug"
                value={companySlug}
                onChange={(e) => setCompanySlug(e.target.value)}
                placeholder="minha-empresa (apenas minúsculas e hífen)"
                className="h-10 bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone / WhatsApp *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+55 11 99999-9999"
                className="h-10 bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg">Pacote de interesse *</Label>
              <select
                id="pkg"
                value={requestedPackageCode}
                onChange={(e) => setRequestedPackageCode(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-foreground"
              >
                {PACKAGES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={pending}
              className="w-full gradient-primary text-white font-semibold glow-primary-sm border-0"
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  Solicitar cadastro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground/60">
              Sem cartão de crédito. A equipe analisará sua solicitação antes de liberar o acesso.
            </p>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-muted-foreground/50">ou</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Entrar →
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden w-[45%] flex-col justify-between border-l border-white/[0.06] p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl gradient-primary glow-primary-sm">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight gradient-text">Aureon</span>
        </div>

        <div className="space-y-8">
          <div className="glass rounded-2xl p-6 space-y-4">
            <blockquote className="text-xl font-medium leading-relaxed text-foreground">
              &quot;Junte-se a times que transformam dados em receita com automação inteligente.&quot;
            </blockquote>
            <p className="text-sm text-muted-foreground">— Aureon CRM & Automação de Vendas</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="glass-card rounded-xl p-4 text-center space-y-1">
                <Icon className="size-4 text-primary mx-auto mb-2" />
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground/40">© 2026 Aureon. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
