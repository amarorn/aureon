import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, Users, TrendingUp, Globe } from "lucide-react";

const stats = [
  { icon: Users, label: "Empresas ativas", value: "500+" },
  { icon: TrendingUp, label: "Conversão média", value: "+32%" },
  { icon: Globe, label: "Países atendidos", value: "12" },
];

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      {/* Background glows */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 75% 50%, oklch(0.62 0.26 268 / 13%) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 15% 85%, oklch(0.72 0.22 320 / 8%) 0%, transparent 55%)",
        }}
      />
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(oklch(0.8 0 0) 1px, transparent 1px),
            linear-gradient(to right, oklch(0.8 0 0) 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
        }}
      />

      {/* Left panel — form */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-xl gradient-primary glow-primary-sm">
              <Sparkles className="size-4 text-white" />
            </div>
            <span className="text-base font-bold gradient-text">Aureon</span>
          </div>

          <div className="mb-8">
            <h1 className="mb-1.5 text-2xl font-bold tracking-tight">Crie sua conta</h1>
            <p className="text-sm text-muted-foreground">Comece a usar o Aureon gratuitamente</p>
          </div>

          <form className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                Nome completo
              </Label>
              <Input
                id="name"
                placeholder="Seu nome"
                className="h-10 bg-white/[0.04] border-white/[0.08] focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail corporativo
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@empresa.com"
                className="h-10 bg-white/[0.04] border-white/[0.08] focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="h-10 bg-white/[0.04] border-white/[0.08] focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                size="lg"
                className="w-full gradient-primary text-white font-semibold glow-primary-sm hover:opacity-90 transition-opacity border-0"
              >
                Criar conta grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground/60">
              Sem cartão de crédito. Cancele quando quiser.
            </p>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-muted-foreground/50">ou</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Entrar →
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel — branding */}
      <div className="relative hidden w-[45%] flex-col justify-between border-l border-white/[0.06] p-12 lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl gradient-primary glow-primary-sm">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight gradient-text">Aureon</span>
        </div>

        {/* Content */}
        <div className="space-y-8">
          <div className="glass rounded-2xl p-6 space-y-4">
            <blockquote className="text-xl font-medium leading-relaxed text-foreground">
              &quot;Junte-se a times que transformam dados em receita com automação inteligente.&quot;
            </blockquote>
            <p className="text-sm text-muted-foreground">— Aureon CRM & Automação de Vendas</p>
          </div>

          {/* Stats */}
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

        <p className="text-xs text-muted-foreground/40">© 2025 Aureon. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
