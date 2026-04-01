"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, Shield, Zap, BarChart3, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const features = [
  { icon: Zap, text: "Automação de fluxos de vendas em minutos" },
  { icon: BarChart3, text: "Dashboards com métricas em tempo real" },
  { icon: Shield, text: "Segurança e privacidade garantidas" },
];

const CODE_MESSAGES: Record<string, string> = {
  ACCOUNT_PENDING_APPROVAL:
    "Sua conta foi criada e está aguardando liberação da equipe Aureon.",
  ACCOUNT_REJECTED:
    "Seu cadastro não foi aprovado. Entre em contato com o comercial.",
  TENANT_SUSPENDED: "Sua organização está suspensa ou inativa.",
  INVALID_CREDENTIALS: "E-mail ou senha inválidos.",
};

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/app");
  }, [isAuthenticated, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCode(null);
    setPending(true);
    try {
      await login(email, password);
      router.replace("/app");
    } catch (err) {
      const e = err as Error & { code?: string };
      setCode(e.code ?? null);
      setError(
        (e.code && CODE_MESSAGES[e.code]) ||
          e.message ||
          "Não foi possível entrar.",
      );
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
            "radial-gradient(ellipse 80% 60% at 25% 50%, oklch(0.62 0.26 268 / 14%) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 85% 15%, oklch(0.68 0.24 300 / 9%) 0%, transparent 55%)",
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

      <div className="relative hidden w-[45%] flex-col justify-between border-r border-white/[0.06] p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl gradient-primary glow-primary-sm">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight gradient-text">Aureon</span>
        </div>

        <div className="space-y-8">
          <div className="glass rounded-2xl p-6 space-y-4">
            <blockquote className="text-xl font-medium leading-relaxed text-foreground">
              &quot;Transforme seu processo de vendas com automação inteligente e insights em tempo real.&quot;
            </blockquote>
            <p className="text-sm text-muted-foreground">— Aureon CRM & Automação de Vendas</p>
          </div>

          <div className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-3.5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground/40">© 2026 Aureon. Todos os direitos reservados.</p>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-xl gradient-primary glow-primary-sm">
              <Sparkles className="size-4 text-white" />
            </div>
            <span className="text-base font-bold gradient-text">Aureon</span>
          </div>

          <div className="mb-8">
            <h1 className="mb-1.5 text-2xl font-bold tracking-tight">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground">Entre com sua conta Aureon</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className="h-10 bg-white/[0.04] border-white/[0.08] focus:border-primary/50 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <button type="button" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Esqueci a senha
                </button>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-10 bg-white/[0.04] border-white/[0.08] focus:border-primary/50 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p
                className={`rounded-lg border px-3 py-2 text-sm ${
                  code === "ACCOUNT_PENDING_APPROVAL"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {error}
              </p>
            )}

            <div className="space-y-2 pt-1">
              <Button
                type="submit"
                size="lg"
                disabled={pending}
                className="w-full gradient-primary text-white font-semibold glow-primary-sm hover:opacity-90 transition-opacity border-0"
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-muted-foreground/50">ou</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Criar conta grátis →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
