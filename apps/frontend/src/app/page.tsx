import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowRight, BarChart3, MessageSquare, Phone, Zap, Plug, Users, Sparkles } from "lucide-react";

const modules = [
  {
    icon: Users,
    title: "CRM",
    desc: "Contatos, pipeline, oportunidades e tarefas",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: MessageSquare,
    title: "Conversations",
    desc: "Inbox unificada, múltiplos canais e templates",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Phone,
    title: "Telefonia",
    desc: "Power dialer, registro e histórico de chamadas",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: Zap,
    title: "Automação",
    desc: "Workflows, triggers e ações automatizadas",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: BarChart3,
    title: "Dashboard",
    desc: "Métricas, funil e Sales Velocity",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  {
    icon: Plug,
    title: "Integrações",
    desc: "Google, Facebook Ads, APIs externas",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background mesh gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.62 0.26 268 / 18%) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 60%, oklch(0.68 0.24 300 / 10%) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg gradient-primary">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">Aureon</span>
          </div>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Criar conta</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="container mx-auto px-6 py-24 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Plataforma SaaS para times de vendas
          </div>
          <h1 className="mx-auto mb-6 max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">
            CRM, Comunicação{" "}
            <span className="gradient-text">e Automação</span>{" "}
            de Vendas
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
            Plataforma completa para gestão de relacionamento, comunicação
            multicanal e análise de vendas.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" className="gap-2 px-8" asChild>
              <Link href="/app">
                Acessar plataforma
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#modulos">Ver módulos</Link>
            </Button>
          </div>
        </section>

        {/* Modules */}
        <section id="modulos" className="container mx-auto px-6 pb-24">
          <div className="mb-10 text-center">
            <h2 className="mb-2 text-2xl font-bold">Tudo que você precisa</h2>
            <p className="text-muted-foreground">Módulos integrados para o ciclo completo de vendas</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <div
                key={m.title}
                className="glass-card group rounded-xl p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12]"
              >
                <div className={`mb-4 inline-flex size-10 items-center justify-center rounded-lg ${m.bg}`}>
                  <m.icon className={`size-5 ${m.color}`} />
                </div>
                <h3 className="mb-1.5 font-semibold text-foreground">{m.title}</h3>
                <p className="text-sm text-muted-foreground">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-6">
        <div className="container mx-auto px-6 text-center text-xs text-muted-foreground">
          © 2025 Aureon · Todos os direitos reservados
        </div>
      </footer>
    </div>
  );
}
