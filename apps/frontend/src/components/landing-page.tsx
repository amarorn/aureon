"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Mail,
  Menu,
  MessageSquare,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Play,
  Plug,
  Send,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ─────────────────────────── DATA ─────────────────────────────── */

const modules = [
  { icon: Users,        title: "CRM & Pipeline",      desc: "Contatos, oportunidades e kanban visual com arrastar e soltar.",         color: "text-violet-400", bg: "bg-violet-400/10", spotColor: "oklch(0.68 0.24 290 / 12%)" },
  { icon: MessageSquare,title: "Inbox Multicanal",    desc: "WhatsApp, e-mail, SMS e chat unificados com IA integrada.",              color: "text-blue-400",   bg: "bg-blue-400/10",   spotColor: "oklch(0.68 0.24 240 / 12%)" },
  { icon: Phone,        title: "Power Dialer",        desc: "Discagem automática, gravação e análise de chamadas em tempo real.",     color: "text-emerald-400",bg: "bg-emerald-400/10",spotColor: "oklch(0.68 0.24 160 / 12%)" },
  { icon: Zap,          title: "Automação",           desc: "Workflows com gatilhos e ações para nutrir leads 24/7.",                 color: "text-amber-400",  bg: "bg-amber-400/10",  spotColor: "oklch(0.78 0.20 85  / 12%)" },
  { icon: Mail,         title: "Email Marketing",     desc: "Campanhas segmentadas com rastreamento de abertura e cliques.",          color: "text-pink-400",   bg: "bg-pink-400/10",   spotColor: "oklch(0.68 0.24 350 / 12%)" },
  { icon: BarChart3,    title: "Analytics",           desc: "Dashboards com Sales Velocity, funil e previsão de receita.",            color: "text-cyan-400",   bg: "bg-cyan-400/10",   spotColor: "oklch(0.68 0.24 200 / 12%)" },
  { icon: FileText,     title: "Propostas",           desc: "Crie e envie propostas profissionais com assinatura digital.",           color: "text-orange-400", bg: "bg-orange-400/10", spotColor: "oklch(0.70 0.22 50  / 12%)" },
  { icon: Calendar,     title: "Calendário",          desc: "Agendamento com integração Google e Outlook e lembretes automáticos.",   color: "text-teal-400",   bg: "bg-teal-400/10",   spotColor: "oklch(0.68 0.22 180 / 12%)" },
  { icon: Plug,         title: "Integrações",         desc: "Google Ads, Meta, Twilio, Slack e mais de 50 ferramentas via API.",      color: "text-indigo-400", bg: "bg-indigo-400/10", spotColor: "oklch(0.62 0.26 268 / 12%)" },
];

const stats = [
  { value: 2400, suffix: "+",  label: "Empresas ativas" },
  { value: 98,   suffix: "%",  label: "Uptime garantido" },
  { value: 12,   suffix: "M+", label: "Interações/mês" },
  { value: 40,   suffix: "%",  label: "Aumento em conversão" },
];

const integrationLogos = [
  { name: "Google Ads",      color: "#4285F4" },
  { name: "Meta Ads",        color: "#1877F2" },
  { name: "WhatsApp",        color: "#25D366" },
  { name: "Slack",           color: "#E01E5A" },
  { name: "Twilio",          color: "#F22F46" },
  { name: "RD Station",      color: "#FF6B00" },
  { name: "Pipedrive",       color: "#6C63FF" },
  { name: "Calendly",        color: "#006BFF" },
  { name: "Google Calendar", color: "#1A73E8" },
  { name: "Outlook",         color: "#0078D4" },
  { name: "LinkedIn",        color: "#0A66C2" },
  { name: "TikTok Ads",      color: "#69C9D0" },
];

const benefits = [
  { icon: TrendingUp,    title: "Acelere o ciclo de vendas",      desc: "Automatize follow-ups, tarefas e cadências para que seu time foque no que importa: fechar negócios.",    highlight: "3x mais rápido" },
  { icon: MessageSquare, title: "Comunicação unificada",          desc: "Todos os canais em um só lugar. Nunca mais perca uma conversa ou deixe um lead sem resposta.",           highlight: "Zero gaps" },
  { icon: BarChart3,     title: "Decisões baseadas em dados",     desc: "Dashboards com previsão de receita, análise de funil e métricas de performance em tempo real.",         highlight: "Insights em tempo real" },
];

const testimonials = [
  { name: "Rafael Mendes",   role: "Diretor Comercial",   company: "TechVentures",    avatar: "RM", rating: 5, text: "Migramos do HubSpot para o Aureon e em 30 dias triplicamos a produtividade do time. O Power Dialer sozinho já pagou o investimento." },
  { name: "Camila Souza",    role: "Head de Vendas",      company: "Escala Digital",  avatar: "CS", rating: 5, text: "A automação de workflows nos economiza mais de 20 horas por semana. Conseguimos nutrir 3x mais leads com o mesmo time." },
  { name: "Bruno Figueira",  role: "CEO",                 company: "Growthify",       avatar: "BF", rating: 5, text: "O inbox unificado mudou tudo. Antes usávamos 4 ferramentas diferentes para comunicação. Agora é tudo em um lugar." },
  { name: "Larissa Costa",   role: "Gerente Comercial",   company: "Ventura Sales",   avatar: "LC", rating: 5, text: "As propostas com assinatura digital reduziram nosso ciclo de fechamento de 7 dias para menos de 24 horas. Incrível." },
  { name: "Diego Almeida",   role: "VP of Sales",         company: "Nexus Corp",      avatar: "DA", rating: 5, text: "O dashboard de Analytics nos deu visibilidade que nunca tivemos. Conseguimos prever receita com 90% de precisão." },
  { name: "Priscila Neves",  role: "Coordenadora SDR",    company: "LeadForce",       avatar: "PN", rating: 5, text: "O Power Dialer aumentou o volume de ligações do meu time em 180%. A interface é simples e intuitiva." },
];

const pricingPlans = [
  {
    name: "Starter",
    desc: "Para times pequenos começando",
    monthly: 297,
    annual: 237,
    highlight: false,
    badge: null,
    features: ["Até 5 usuários", "CRM completo", "Inbox multicanal", "1.000 contatos", "5 automações ativas", "Email marketing (5k envios/mês)", "Suporte via chat"],
  },
  {
    name: "Pro",
    desc: "Para times em crescimento acelerado",
    monthly: 697,
    annual: 557,
    highlight: true,
    badge: "Mais popular",
    features: ["Até 15 usuários", "Tudo do Starter", "Power Dialer", "Contatos ilimitados", "Automações ilimitadas", "Email marketing (50k envios/mês)", "Propostas com assinatura", "Analytics avançado", "Suporte prioritário"],
  },
  {
    name: "Enterprise",
    desc: "Para grandes operações comerciais",
    monthly: null,
    annual: null,
    highlight: false,
    badge: null,
    features: ["Usuários ilimitados", "Tudo do Pro", "SLA dedicado", "Onboarding personalizado", "IP dedicado", "SSO & SAML", "Relatórios customizados", "Gerente de sucesso"],
  },
];

const faqs = [
  { q: "Preciso de cartão de crédito para o trial?",         a: "Não. Os 14 dias de trial são completamente gratuitos e sem necessidade de cadastro de cartão. Você só paga se decidir continuar." },
  { q: "Posso migrar minha base de contatos de outro CRM?",  a: "Sim. Oferecemos migração assistida do HubSpot, Salesforce, RD Station e qualquer ferramenta que exporte CSV. Nossa equipe ajuda no processo." },
  { q: "O WhatsApp integrado é o oficial (API)?",            a: "Sim, usamos a API Oficial do WhatsApp Business (Meta). Isso garante estabilidade, sem risco de ban e suporte completo ao envio de templates." },
  { q: "Como funciona o Power Dialer?",                      a: "O Power Dialer faz chamadas automaticamente em sequência a partir de uma fila de contatos. Você define a ordem, o sistema disca e conecta só quando o contato atende." },
  { q: "Tem integração com Google e Meta Ads?",              a: "Sim. Você conecta suas contas de Google Ads e Meta Ads e visualiza ROI, custo por lead e atribuição diretamente no dashboard do Aureon." },
  { q: "O plano Pro tem limite de automações?",              a: "Não. No plano Pro as automações são ilimitadas — você pode criar quantos workflows quiser, com qualquer combinação de gatilhos e ações." },
  { q: "Tem suporte em português?",                          a: "Sim. Todo nosso suporte é em português. Temos chat, e-mail e chamadas de onboarding com especialistas brasileiros." },
];

const comparisonFeatures = [
  { feature: "CRM visual com kanban",        aureon: true,  hubspot: true,  rd: true  },
  { feature: "Power Dialer nativo",          aureon: true,  hubspot: false, rd: false },
  { feature: "Inbox WhatsApp (API Oficial)", aureon: true,  hubspot: false, rd: true  },
  { feature: "Automação de workflows",       aureon: true,  hubspot: true,  rd: true  },
  { feature: "Propostas + assinatura",       aureon: true,  hubspot: false, rd: false },
  { feature: "Email marketing integrado",    aureon: true,  hubspot: true,  rd: true  },
  { feature: "Analytics de funil",           aureon: true,  hubspot: true,  rd: true  },
  { feature: "Preço acessível (BR)",         aureon: true,  hubspot: false, rd: true  },
  { feature: "Suporte em português",         aureon: true,  hubspot: false, rd: true  },
  { feature: "Setup em minutos",             aureon: true,  hubspot: false, rd: false },
];

/* ─────────────────────────── HOOKS ────────────────────────────── */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCounter(target: number, duration = 2200, active = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return count;
}

/* ─────────────────────── SUB-COMPONENTS ───────────────────────── */

/** Card com spotlight seguindo o mouse — sem re-render (DOM direto) */
function SpotlightCard({
  children,
  className,
  spotColor = "oklch(0.62 0.26 268 / 10%)",
}: {
  children: React.ReactNode;
  className?: string;
  spotColor?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    const spot = spotRef.current;
    if (!card || !spot) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spot.style.background = `radial-gradient(380px circle at ${x}px ${y}px, ${spotColor}, transparent 70%)`;
    spot.style.opacity = "1";
  }, [spotColor]);

  const onLeave = useCallback(() => {
    if (spotRef.current) spotRef.current.style.opacity = "0";
  }, []);

  return (
    <div ref={cardRef} onMouseMove={onMove} onMouseLeave={onLeave} className={cn("relative overflow-hidden", className)}>
      <div ref={spotRef} className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300" />
      {children}
    </div>
  );
}

/** Texto com efeito de digitação cíclico */
function TypedText({ words }: { words: string[] }) {
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [text, setText] = useState("");
  const pauseRef = useRef(false);

  useEffect(() => {
    const word = words[wordIdx];
    if (pauseRef.current) return;

    const delay = deleting ? 55 : charIdx === word.length ? 1600 : 95;
    const id = setTimeout(() => {
      if (!deleting && charIdx < word.length) {
        setText(word.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
      } else if (!deleting && charIdx === word.length) {
        pauseRef.current = true;
        setTimeout(() => { pauseRef.current = false; setDeleting(true); }, 1600);
      } else if (deleting && charIdx > 0) {
        setText(word.slice(0, charIdx - 1));
        setCharIdx((c) => c - 1);
      } else {
        setDeleting(false);
        setWordIdx((i) => (i + 1) % words.length);
      }
    }, delay);
    return () => clearTimeout(id);
  }, [charIdx, deleting, wordIdx, words]);

  return (
    <span
      className="inline-block"
      style={{
        background: "linear-gradient(135deg, oklch(0.82 0.20 268), oklch(0.85 0.18 310), oklch(0.78 0.20 240))",
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        animation: "lp-shimmer 4s linear infinite",
      }}
    >
      {text}
      <span
        className="ml-0.5 inline-block w-[3px] rounded-sm bg-primary align-middle"
        style={{
          height: "0.85em",
          animation: "lp-badge-blink 1s ease-in-out infinite",
        }}
      />
    </span>
  );
}

/** Mockup do dashboard (janela fake) */
function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-2xl" style={{ animation: "lp-float 6s ease-in-out infinite" }}>
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_32px_80px_oklch(0_0_0/55%),0_0_60px_oklch(0.62_0.26_268/10%)]">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[oklch(0.11_0.013_268)] px-4 py-3">
          <div className="flex gap-1.5">
            <div className="size-3 rounded-full bg-red-500/70" />
            <div className="size-3 rounded-full bg-amber-500/70" />
            <div className="size-3 rounded-full bg-emerald-500/70" />
          </div>
          <div className="mx-auto flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground/50">
            <Sparkles className="size-3" /> aureon.app/dashboard
          </div>
        </div>
        <div className="flex h-[340px] bg-[oklch(0.09_0.012_268)]">
          {/* Sidebar */}
          <div className="hidden w-14 flex-col items-center gap-4 border-r border-white/[0.05] py-4 sm:flex">
            {[Users, MessageSquare, Phone, Zap, BarChart3].map((Icon, i) => (
              <div key={i} className={cn("flex size-8 items-center justify-center rounded-lg", i === 0 ? "bg-primary/20 text-primary" : "text-muted-foreground/40")}>
                <Icon className="size-4" />
              </div>
            ))}
          </div>
          {/* Content */}
          <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
            <div className="grid grid-cols-3 gap-2">
              {[{ label: "Leads", value: "1.247", delta: "+12%" }, { label: "Pipeline", value: "R$ 2.4M", delta: "+8%" }, { label: "Fechados", value: "89", delta: "+24%" }].map((kpi) => (
                <div key={kpi.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5">
                  <div className="mb-0.5 text-[10px] text-muted-foreground/60">{kpi.label}</div>
                  <div className="text-sm font-bold">{kpi.value}</div>
                  <div className="text-[10px] text-emerald-400">{kpi.delta}</div>
                </div>
              ))}
            </div>
            <div className="relative flex-1 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="mb-2 text-[10px] font-medium text-muted-foreground/60">RECEITA MENSAL</div>
              <svg viewBox="0 0 280 80" className="w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.26 268)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="oklch(0.62 0.26 268)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,60 L40,50 L80,40 L120,45 L160,25 L200,20 L240,10 L280,5" fill="none" stroke="oklch(0.62 0.26 268)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M0,60 L40,50 L80,40 L120,45 L160,25 L200,20 L240,10 L280,5 L280,80 L0,80Z" fill="url(#chartGrad)" />
                {[[40,50],[80,40],[160,25],[240,10]].map(([cx,cy]) => (
                  <circle key={cx} cx={cx} cy={cy} r="3" fill="oklch(0.62 0.26 268)" opacity="0.8" />
                ))}
              </svg>
            </div>
            <div className="flex gap-1.5">
              {[{ stage: "Prospe...", count: 34, color: "bg-violet-500/60" }, { stage: "Qualif...", count: 21, color: "bg-blue-500/60" }, { stage: "Propos...", count: 12, color: "bg-amber-500/60" }, { stage: "Fechad...", count: 8, color: "bg-emerald-500/60" }].map((s) => (
                <div key={s.stage} className="flex-1 overflow-hidden rounded border border-white/[0.05] bg-white/[0.02] p-1.5">
                  <div className={cn("mb-1 h-1 rounded-full", s.color)} />
                  <div className="truncate text-[9px] text-muted-foreground/50">{s.stage}</div>
                  <div className="text-[10px] font-bold text-foreground/70">{s.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Floating badges */}
      <div className="absolute -left-8 top-1/4 hidden rounded-xl border border-white/[0.08] bg-[oklch(0.13_0.015_268)] px-3 py-2 shadow-lg md:block" style={{ animation: "lp-float 7s ease-in-out infinite 1s" }}>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_oklch(0.68_0.24_160/80%)]" style={{ animation: "lp-badge-blink 2s ease-in-out infinite" }} />
          <span className="text-xs font-medium">127 leads hoje</span>
        </div>
      </div>
      <div className="absolute -right-6 bottom-1/4 hidden rounded-xl border border-white/[0.08] bg-[oklch(0.13_0.015_268)] px-3 py-2 shadow-lg md:block" style={{ animation: "lp-float 9s ease-in-out infinite 2s" }}>
        <div className="flex items-center gap-2">
          <TrendingUp className="size-3.5 text-violet-400" />
          <span className="text-xs font-medium">+34% conversão</span>
        </div>
      </div>
      <div className="absolute -right-4 -top-4 hidden rounded-xl border border-white/[0.08] bg-[oklch(0.13_0.015_268)] px-3 py-2 shadow-lg md:block" style={{ animation: "lp-float 8s ease-in-out infinite 0.5s" }}>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-violet-400 shadow-[0_0_8px_oklch(0.62_0.26_268/80%)]" style={{ animation: "lp-badge-blink 3s ease-in-out infinite" }} />
          <span className="text-xs font-medium">Pipeline: R$ 2.4M</span>
        </div>
      </div>
    </div>
  );
}

/* ── Tour slides (mockups de telas reais) ───────────────────────── */

function SlideDashboard() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Leads ativos", value: "1.247", delta: "+12%", color: "text-violet-400" },
          { label: "Pipeline",     value: "R$ 2.4M", delta: "+8%",  color: "text-blue-400"   },
          { label: "Fechados",     value: "89",       delta: "+24%", color: "text-emerald-400"},
          { label: "Receita",      value: "R$ 84k",   delta: "+19%", color: "text-amber-400"  },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
            <div className="mb-1 text-[10px] text-muted-foreground/60">{k.label}</div>
            <div className={cn("text-lg font-bold", k.color)}>{k.value}</div>
            <div className="text-[10px] text-emerald-400">{k.delta} este mês</div>
          </div>
        ))}
      </div>
      {/* Chart + activity */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        <div className="flex flex-1 flex-col gap-1 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="mb-1 text-[10px] font-medium text-muted-foreground/60">RECEITA MENSAL</div>
          <svg viewBox="0 0 340 90" className="w-full flex-1" preserveAspectRatio="none">
            <defs>
              <linearGradient id="dg1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.62 0.26 268)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="oklch(0.62 0.26 268)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,75 L42,65 L85,55 L127,58 L170,35 L212,28 L255,15 L297,10 L340,4" fill="none" stroke="oklch(0.62 0.26 268)" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M0,75 L42,65 L85,55 L127,58 L170,35 L212,28 L255,15 L297,10 L340,4 L340,90 L0,90Z" fill="url(#dg1)"/>
            {[[42,65],[127,58],[212,28],[340,4]].map(([cx,cy]) => (
              <circle key={cx} cx={cx} cy={cy} r="3.5" fill="oklch(0.62 0.26 268)" opacity="0.9"/>
            ))}
          </svg>
          {/* X axis labels */}
          <div className="flex justify-between px-1 text-[9px] text-muted-foreground/40">
            {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago"].map(m => <span key={m}>{m}</span>)}
          </div>
        </div>
        {/* Activity feed */}
        <div className="w-44 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="mb-2 text-[10px] font-medium text-muted-foreground/60">ATIVIDADE</div>
          <div className="space-y-2.5">
            {[
              { icon: Users,        text: "Lead qualificado", sub: "Rafael M. · 2min", color: "text-violet-400" },
              { icon: MessageSquare,text: "Nova msg WhatsApp", sub: "Camila S. · 5min", color: "text-blue-400"   },
              { icon: Phone,        text: "Chamada gravada",  sub: "Bruno F. · 12min", color: "text-emerald-400"},
              { icon: FileText,     text: "Proposta enviada", sub: "Larissa C. · 1h",  color: "text-amber-400"  },
              { icon: Zap,          text: "Automação ativou", sub: "3 leads · 2h",     color: "text-pink-400"   },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <a.icon className={cn("mt-0.5 size-3 shrink-0", a.color)} />
                <div>
                  <div className="text-[10px] font-medium leading-none text-foreground/80">{a.text}</div>
                  <div className="mt-0.5 text-[9px] text-muted-foreground/50">{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlidePipeline() {
  const cols = [
    { name: "Prospecção",  color: "bg-violet-500", cards: [{ name:"Rafael Mendes", company:"TechCorp", value:"R$ 24k" },{ name:"Ana Paula", company:"Nexus", value:"R$ 18k" }] },
    { name: "Qualificação",color: "bg-blue-500",   cards: [{ name:"Bruno Lima",  company:"Scale",   value:"R$ 45k" }] },
    { name: "Proposta",    color: "bg-amber-500",  cards: [{ name:"Camila Souza",company:"Growly",  value:"R$ 92k" },{ name:"Diego A.", company:"Ventura",value:"R$ 37k" }] },
    { name: "Fechamento",  color: "bg-emerald-500",cards: [{ name:"Larissa C.",  company:"LeadForce",value:"R$ 128k"}] },
  ];
  return (
    <div className="flex h-full gap-2.5 overflow-hidden p-4">
      {cols.map((col) => (
        <div key={col.name} className="flex flex-1 flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-1.5">
            <div className={cn("h-1.5 w-1.5 rounded-full", col.color)} />
            <span className="text-[10px] font-semibold text-muted-foreground">{col.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground/40">{col.cards.length}</span>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {col.cards.map((card) => (
              <div key={card.name} className="rounded-lg border border-white/[0.07] bg-white/[0.04] p-2.5 transition-all hover:-translate-y-0.5 hover:border-white/[0.14]">
                <div className="mb-1 text-[11px] font-semibold text-foreground/90">{card.name}</div>
                <div className="text-[10px] text-muted-foreground/60">{card.company}</div>
                <div className="mt-1.5 text-[11px] font-bold text-emerald-400">{card.value}</div>
                <div className={cn("mt-2 h-0.5 w-2/3 rounded-full", col.color, "opacity-50")} />
              </div>
            ))}
            {/* Empty drop zone */}
            <div className="rounded-lg border border-dashed border-white/[0.06] p-3 text-center">
              <span className="text-[10px] text-muted-foreground/30">+ Adicionar</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SlideInbox() {
  const convs = [
    { name:"Rafael M.",  channel:"WA",  msg:"Olá, gostaria de saber...", time:"2min",  unread:2, color:"bg-emerald-500" },
    { name:"Camila S.",  channel:"EM",  msg:"Recebi a proposta, mas...", time:"14min", unread:0, color:"bg-blue-500"    },
    { name:"Bruno F.",   channel:"WA",  msg:"Perfeito! Quando podemos...",time:"1h",   unread:1, color:"bg-emerald-500" },
    { name:"Diego A.",   channel:"SMS", msg:"Ok, confirmo para amanhã.", time:"2h",   unread:0, color:"bg-amber-500"   },
  ];
  const msgs = [
    { from:"contact", text:"Olá! Vi o produto de vocês e tenho interesse.", time:"09:14" },
    { from:"agent",   text:"Oi Rafael! Fico feliz em ouvir isso. Posso te ajudar com mais detalhes?", time:"09:15" },
    { from:"contact", text:"Sim! Quantos usuários consigo no plano Pro?", time:"09:16" },
    { from:"agent",   text:"No Pro você tem até 15 usuários, todos os módulos e automações ilimitadas.", time:"09:17" },
    { from:"contact", text:"Ótimo! E tem trial gratuito?", time:"09:18" },
  ];
  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="flex w-44 shrink-0 flex-col border-r border-white/[0.06]">
        <div className="border-b border-white/[0.06] p-3">
          <div className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[10px] text-muted-foreground/50">Buscar conversas...</div>
        </div>
        {convs.map((c) => (
          <div key={c.name} className={cn("flex cursor-pointer gap-2 border-b border-white/[0.04] p-2.5 transition-colors hover:bg-white/[0.04]", c.name === "Rafael M." && "bg-white/[0.05]")}>
            <div className="relative shrink-0">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                {c.name.split(" ").map(n=>n[0]).join("")}
              </div>
              <div className={cn("absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-[oklch(0.09_0.012_268)]", c.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold">{c.name}</span>
                <span className="text-[9px] text-muted-foreground/40">{c.time}</span>
              </div>
              <div className="truncate text-[9px] text-muted-foreground/50">{c.msg}</div>
            </div>
            {c.unread > 0 && <div className="flex size-3.5 shrink-0 items-center justify-center self-start rounded-full bg-primary text-[8px] font-bold text-white">{c.unread}</div>}
          </div>
        ))}
      </div>
      {/* Chat */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/[0.06] p-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">RM</div>
          <div>
            <div className="text-[11px] font-semibold">Rafael Mendes</div>
            <div className="text-[9px] text-emerald-400">Via WhatsApp · online</div>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-2 overflow-y-auto p-3">
          {msgs.map((m, i) => (
            <div key={i} className={cn("flex", m.from === "agent" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] rounded-xl px-3 py-2", m.from === "agent" ? "rounded-br-sm bg-primary/20 text-foreground" : "rounded-bl-sm bg-white/[0.06] text-foreground/80")}>
                <p className="text-[11px] leading-relaxed">{m.text}</p>
                <p className="mt-0.5 text-right text-[9px] text-muted-foreground/40">{m.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-white/[0.06] p-3">
          <div className="flex-1 rounded-lg bg-white/[0.05] px-3 py-1.5 text-[10px] text-muted-foreground/40">Digite uma mensagem...</div>
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/80">
            <Send className="size-3.5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideDialer() {
  return (
    <div className="flex h-full gap-3 overflow-hidden p-4">
      {/* Call panel */}
      <div className="flex w-52 shrink-0 flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 text-center">
        {/* Avatar ring */}
        <div className="relative">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">BF</div>
          <div className="absolute inset-0 rounded-full border-2 border-primary/40" style={{ animation: "lp-pulse-ring 2s ease-out infinite" }} />
        </div>
        <div>
          <div className="text-sm font-semibold">Bruno Figueira</div>
          <div className="text-xs text-muted-foreground/60">TechVentures · (11) 99999-1234</div>
          <div className="mt-1 text-xs font-mono text-emerald-400">02:34</div>
        </div>
        {/* Controls */}
        <div className="flex gap-3">
          <button className="flex size-10 items-center justify-center rounded-full bg-white/[0.08] transition-colors hover:bg-white/[0.14]">
            <MicOff className="size-4 text-muted-foreground" />
          </button>
          <button className="flex size-12 items-center justify-center rounded-full bg-red-500/20 transition-colors hover:bg-red-500/40">
            <PhoneOff className="size-5 text-red-400" />
          </button>
          <button className="flex size-10 items-center justify-center rounded-full bg-white/[0.08] transition-colors hover:bg-white/[0.14]">
            <Video className="size-4 text-muted-foreground" />
          </button>
        </div>
        <div className="w-full rounded-lg bg-white/[0.03] p-2 text-[10px] text-muted-foreground/50">
          IA: Sentimento positivo · 78%
        </div>
      </div>
      {/* Queue */}
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground/60">FILA DE DISCAGEM</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">8 contatos</span>
        </div>
        {[
          { name:"Larissa Costa",  company:"Ventura",    status:"aguardando", time:"—" },
          { name:"Diego Almeida",  company:"Nexus Corp", status:"aguardando", time:"—" },
          { name:"Priscila Neves", company:"LeadForce",  status:"tentativa 2",time:"3 tentativas" },
          { name:"Carlos Mello",   company:"Growthify",  status:"sem resposta",time:"ontem" },
          { name:"Marina Lopes",   company:"ScaleBR",    status:"aguardando", time:"—" },
        ].map((c, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-bold text-muted-foreground">
              {c.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium">{c.name}</div>
              <div className="text-[10px] text-muted-foreground/50">{c.company}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className={cn("rounded-full px-2 py-0.5 text-[9px]", c.status === "aguardando" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400")}>
                {c.status}
              </div>
            </div>
            <PhoneCall className="size-3.5 shrink-0 text-muted-foreground/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideAutomation() {
  const nodes = [
    { x: 30,  y: 90,  label: "Lead criado",       sub:"Gatilho",      color:"border-violet-400/50 bg-violet-400/10", dot:"bg-violet-400" },
    { x: 200, y: 40,  label: "Enviar WhatsApp",    sub:"Ação",         color:"border-blue-400/50 bg-blue-400/10",    dot:"bg-blue-400"   },
    { x: 200, y: 140, label: "Aguardar 24h",        sub:"Espera",       color:"border-amber-400/50 bg-amber-400/10",  dot:"bg-amber-400"  },
    { x: 370, y: 40,  label: "Respondeu?",          sub:"Condição",     color:"border-emerald-400/50 bg-emerald-400/10",dot:"bg-emerald-400"},
    { x: 370, y: 140, label: "Enviar Email",         sub:"Ação",         color:"border-pink-400/50 bg-pink-400/10",    dot:"bg-pink-400"   },
    { x: 530, y: 40,  label: "Qualificar lead",     sub:"Ação",         color:"border-cyan-400/50 bg-cyan-400/10",    dot:"bg-cyan-400"   },
  ];
  const edges: [number,number,number,number][] = [
    [110,98, 200,55], [110,98, 200,148], [290,55, 370,55], [290,148,370,148], [460,55, 530,55]
  ];
  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Nutrição de Leads — Sequência 7 dias</div>
          <div className="text-[10px] text-muted-foreground/60">Ativo · 3 leads no fluxo agora</div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1">
          <div className="size-1.5 rounded-full bg-emerald-400" style={{animation:"lp-badge-blink 2s ease-in-out infinite"}}/>
          <span className="text-[10px] font-medium text-emerald-400">Rodando</span>
        </div>
      </div>
      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden rounded-xl border border-white/[0.06] bg-[oklch(0.08_0.010_268)]">
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:"radial-gradient(circle, white 1px, transparent 1px)", backgroundSize:"20px 20px"}}/>
        <svg className="absolute inset-0 h-full w-full overflow-visible" style={{zIndex:1}}>
          {edges.map(([x1,y1,x2,y2],i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="oklch(0.62 0.26 268 / 25%)" strokeWidth="1.5" strokeDasharray="4 3"/>
          ))}
        </svg>
        {nodes.map((n,i) => (
          <div key={i} className={cn("absolute flex min-w-[100px] flex-col rounded-xl border p-2.5 transition-all hover:scale-105", n.color)} style={{left:n.x, top:n.y, zIndex:2}}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className={cn("size-2 rounded-full", n.dot)}/>
              <span className="text-[9px] font-medium text-muted-foreground/60">{n.sub}</span>
            </div>
            <span className="text-[11px] font-semibold leading-tight">{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideEmailMarketing() {
  return (
    <div className="flex h-full gap-3 overflow-hidden p-4">
      {/* Campaign stats */}
      <div className="flex w-48 shrink-0 flex-col gap-2">
        <div className="text-[10px] font-semibold text-muted-foreground/60 mb-1">CAMPANHA ATIVA</div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Mail className="size-3 text-pink-400"/>
            <span className="text-[11px] font-semibold">Black Friday 2025</span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "Enviados",    value: "4.280",  bar: 100, color: "bg-blue-500/60"    },
              { label: "Abertos",     value: "2.139",  bar: 50,  color: "bg-violet-500/60"  },
              { label: "Clicaram",    value: "856",    bar: 20,  color: "bg-pink-500/60"    },
              { label: "Converteram", value: "214",    bar: 5,   color: "bg-emerald-500/60" },
            ].map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex justify-between text-[10px]">
                  <span className="text-muted-foreground/60">{s.label}</span>
                  <span className="font-semibold">{s.value}</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06]">
                  <div className={cn("h-full rounded-full transition-all", s.color)} style={{width:`${s.bar}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-1.5">
          {[{label:"Abertura",value:"49.9%"},{label:"CTR",value:"20%"},{label:"Bounce",value:"0.3%"},{label:"Unsub",value:"0.1%"}].map(m=>(
            <div key={m.label} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2 text-center">
              <div className="text-sm font-bold text-foreground/90">{m.value}</div>
              <div className="text-[9px] text-muted-foreground/50">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Email preview */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
        {/* Email header */}
        <div className="border-b border-white/[0.06] bg-white/[0.03] p-3">
          <div className="text-[11px] font-semibold">Preview do email</div>
          <div className="text-[10px] text-muted-foreground/50">De: noreply@aureon.app · Para: {"{{"} contato.email {"}}"}  </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {/* Fake email body */}
          <div className="mx-auto max-w-xs space-y-3">
            <div className="flex h-12 items-center justify-center rounded-lg gradient-primary">
              <Sparkles className="mr-2 size-4 text-white opacity-80"/>
              <span className="text-sm font-bold text-white">Aureon</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="mb-3 text-sm font-bold">Olá, {"{{"} primeiro_nome {"}}"}!</div>
              <div className="mb-3 h-2 rounded bg-white/[0.06] w-full"/>
              <div className="mb-1 h-2 rounded bg-white/[0.06] w-5/6"/>
              <div className="mb-4 h-2 rounded bg-white/[0.06] w-4/6"/>
              <div className="flex h-8 items-center justify-center rounded-lg gradient-primary">
                <span className="text-[11px] font-bold text-white">Aproveitar oferta →</span>
              </div>
            </div>
            <div className="text-center text-[9px] text-muted-foreground/30">Cancelar inscrição · Ver no navegador</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideAnalytics() {
  const funnel = [
    { stage:"Visitantes",  value:10000, pct:100, color:"bg-violet-500" },
    { stage:"Leads",       value:2847,  pct:28,  color:"bg-blue-500"   },
    { stage:"Qualificados",value:892,   pct:9,   color:"bg-indigo-500" },
    { stage:"Propostas",   value:247,   pct:2.5, color:"bg-amber-500"  },
    { stage:"Fechados",    value:89,    pct:0.9, color:"bg-emerald-500"},
  ];
  return (
    <div className="flex h-full gap-3 overflow-hidden p-4">
      {/* Funnel */}
      <div className="flex w-56 flex-col gap-2">
        <div className="text-[10px] font-semibold text-muted-foreground/60 mb-1">FUNIL DE VENDAS</div>
        <div className="flex flex-1 flex-col justify-center gap-1.5">
          {funnel.map((f) => (
            <div key={f.stage}>
              <div className="mb-1 flex justify-between text-[10px]">
                <span className="text-muted-foreground/70">{f.stage}</span>
                <span className="font-mono font-semibold">{f.value.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-5 overflow-hidden rounded-md bg-white/[0.04]">
                <div className={cn("h-full rounded-md opacity-70 transition-all", f.color)} style={{width:`${f.pct}%`}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Charts */}
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        {/* Sales velocity */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground/60">SALES VELOCITY</span>
            <span className="text-sm font-bold text-emerald-400">R$ 1.240/dia</span>
          </div>
          <svg viewBox="0 0 280 40" className="w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.68 0.24 160)" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="oklch(0.68 0.24 160)" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0,35 L40,28 L80,30 L120,22 L160,18 L200,12 L240,8 L280,3" fill="none" stroke="oklch(0.68 0.24 160)" strokeWidth="2" strokeLinecap="round"/>
            <path d="M0,35 L40,28 L80,30 L120,22 L160,18 L200,12 L240,8 L280,3 L280,40 L0,40Z" fill="url(#sg1)"/>
          </svg>
        </div>
        {/* Conversion by channel */}
        <div className="flex-1 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="mb-2 text-[10px] font-semibold text-muted-foreground/60">CONVERSÃO POR CANAL</div>
          <div className="space-y-2">
            {[
              { ch:"WhatsApp",  pct:42, color:"bg-emerald-500" },
              { ch:"E-mail",    pct:28, color:"bg-blue-500"    },
              { ch:"Telefone",  pct:19, color:"bg-violet-500"  },
              { ch:"Orgânico",  pct:11, color:"bg-amber-500"   },
            ].map(c => (
              <div key={c.ch} className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-muted-foreground/70">{c.ch}</span>
                <div className="flex-1 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className={cn("h-full rounded-full", c.color, "opacity-70")} style={{width:`${c.pct}%`}}/>
                </div>
                <span className="w-7 text-right text-[10px] font-mono font-semibold">{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tour slides config ─────────────────────────────────────────── */
const tourSlides = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    color: "text-violet-400",
    title: "Visão geral em tempo real",
    desc: "KPIs, receita mensal e atividades do time num painel unificado.",
    component: SlideDashboard,
  },
  {
    id: "pipeline",
    label: "Pipeline CRM",
    icon: Users,
    color: "text-blue-400",
    title: "Pipeline visual com Kanban",
    desc: "Arraste oportunidades entre etapas e acompanhe cada negociação.",
    component: SlidePipeline,
  },
  {
    id: "inbox",
    label: "Inbox",
    icon: MessageSquare,
    color: "text-emerald-400",
    title: "Inbox multicanal unificada",
    desc: "WhatsApp, e-mail e SMS em uma única conversa. Com IA integrada.",
    component: SlideInbox,
  },
  {
    id: "dialer",
    label: "Power Dialer",
    icon: Phone,
    color: "text-amber-400",
    title: "Power Dialer com IA",
    desc: "Discagem automática, análise de sentimento e fila de contatos.",
    component: SlideDialer,
  },
  {
    id: "automation",
    label: "Automação",
    icon: Zap,
    color: "text-pink-400",
    title: "Workflows visuais",
    desc: "Crie sequências automatizadas com gatilhos, esperas e condições.",
    component: SlideAutomation,
  },
  {
    id: "email",
    label: "Email Marketing",
    icon: Mail,
    color: "text-cyan-400",
    title: "Campanhas de email",
    desc: "Dispare campanhas segmentadas e acompanhe abertura e cliques.",
    component: SlideEmailMarketing,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    color: "text-orange-400",
    title: "Analytics & Sales Velocity",
    desc: "Funil completo, métricas por canal e previsão de receita.",
    component: SlideAnalytics,
  },
];

/** Modal de tour com telas reais */
function VideoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [slide, setSlide] = useState(0);
  const [animDir, setAnimDir] = useState<"left"|"right">("right");
  const [visible, setVisible] = useState(true);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((idx: number, dir: "left"|"right" = "right") => {
    setVisible(false);
    setAnimDir(dir);
    setTimeout(() => {
      setSlide(idx);
      setVisible(true);
    }, 220);
  }, []);

  const next = useCallback(() => goTo((slide + 1) % tourSlides.length, "right"), [slide, goTo]);
  const prev = useCallback(() => goTo((slide - 1 + tourSlides.length) % tourSlides.length, "left"), [slide, goTo]);

  // Auto-advance
  useEffect(() => {
    if (!open) return;
    autoRef.current = setInterval(next, 5000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [open, next]);

  const resetAuto = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    autoRef.current = setInterval(next, 5000);
  }, [next]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const current = tourSlides[slide];
  const SlideComponent = current.component;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-lg" onClick={onClose} />

      <div className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[oklch(0.10_0.013_268)] shadow-[0_40px_120px_oklch(0_0_0/75%)]" style={{maxHeight:"92vh"}}>

        {/* Progress bar */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-white/[0.05]">
          <div className="h-full gradient-primary transition-all duration-300" style={{width:`${((slide + 1) / tourSlides.length) * 100}%`}}/>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 pt-3 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg gradient-primary glow-primary-sm">
              <Sparkles className="size-3.5 text-white"/>
            </div>
            <div>
              <span className="text-sm font-bold">Tour do Aureon</span>
              <span className="ml-2 text-xs text-muted-foreground/50">{slide + 1} de {tourSlides.length}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground">
            <X className="size-4"/>
          </button>
        </div>

        {/* Slide tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.05] px-4 py-2">
          {tourSlides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { goTo(i, i > slide ? "right" : "left"); resetAuto(); }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all",
                i === slide
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground/60 hover:bg-white/[0.05] hover:text-muted-foreground"
              )}
            >
              <s.icon className={cn("size-3", i === slide ? s.color : "")}/>
              {s.label}
            </button>
          ))}
        </div>

        {/* Slide info */}
        <div className="border-b border-white/[0.04] px-5 py-3">
          <h3 className={cn("text-base font-bold transition-all duration-300", visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2")} style={{transitionDuration:"200ms"}}>
            {current.title}
          </h3>
          <p className={cn("text-xs text-muted-foreground transition-all duration-300", visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2")} style={{transitionDuration:"200ms", transitionDelay:"40ms"}}>
            {current.desc}
          </p>
        </div>

        {/* Mockup area */}
        <div
          className="relative overflow-hidden bg-[oklch(0.09_0.012_268)]"
          style={{height: "400px"}}
          onMouseEnter={() => { if (autoRef.current) clearInterval(autoRef.current); }}
          onMouseLeave={resetAuto}
        >
          {/* Subtle glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-[60px]"/>
          </div>

          {/* Screen frame */}
          <div
            className="absolute inset-3 overflow-hidden rounded-xl border border-white/[0.07] transition-all"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateX(0)" : `translateX(${animDir === "right" ? "20px" : "-20px"})`,
              transition: "opacity 220ms ease, transform 220ms ease",
            }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 border-b border-white/[0.05] bg-[oklch(0.11_0.013_268)] px-3 py-2">
              <div className="size-2 rounded-full bg-red-500/60"/>
              <div className="size-2 rounded-full bg-amber-500/60"/>
              <div className="size-2 rounded-full bg-emerald-500/60"/>
              <div className="mx-auto flex items-center gap-1.5 rounded bg-white/[0.04] px-2.5 py-0.5 text-[10px] text-muted-foreground/40">
                <Sparkles className="size-2.5"/> aureon.app/{current.id}
              </div>
            </div>
            {/* App layout */}
            <div className="flex" style={{height:"calc(100% - 29px)"}}>
              {/* Sidebar */}
              <div className="flex w-11 shrink-0 flex-col items-center gap-3 border-r border-white/[0.04] bg-[oklch(0.11_0.013_268)] py-3">
                {tourSlides.map((s, i) => (
                  <div key={s.id} className={cn("flex size-7 items-center justify-center rounded-lg transition-colors", i === slide ? "bg-primary/20" : "hover:bg-white/[0.04]")}>
                    <s.icon className={cn("size-3.5", i === slide ? s.color : "text-muted-foreground/30")}/>
                  </div>
                ))}
              </div>
              {/* Content */}
              <div className="flex-1 overflow-hidden">
                <SlideComponent/>
              </div>
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-white/[0.05] px-5 py-3">
          {/* Dots */}
          <div className="flex gap-1.5">
            {tourSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => { goTo(i, i > slide ? "right" : "left"); resetAuto(); }}
                className={cn("rounded-full transition-all duration-300", i === slide ? "w-6 h-1.5 bg-primary" : "size-1.5 bg-white/[0.15] hover:bg-white/[0.30]")}
              />
            ))}
          </div>

          {/* Arrows + CTA */}
          <div className="flex items-center gap-2">
            <button onClick={() => { prev(); resetAuto(); }} className="flex size-8 items-center justify-center rounded-lg border border-white/[0.08] text-muted-foreground transition-colors hover:border-white/[0.16] hover:text-foreground">
              <ChevronLeft className="size-4"/>
            </button>
            <button onClick={() => { next(); resetAuto(); }} className="flex size-8 items-center justify-center rounded-lg border border-white/[0.08] text-muted-foreground transition-colors hover:border-white/[0.16] hover:text-foreground">
              <ChevronRight className="size-4"/>
            </button>
            <Button size="sm" className="ml-2 gradient-primary border-0 text-white glow-primary-sm hover:opacity-90" asChild>
              <Link href="/signup" onClick={onClose}>
                Começar grátis <ArrowRight className="ml-1.5 size-3.5"/>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Item de FAQ (accordion) */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-xl border transition-all duration-200", open ? "border-primary/20 bg-primary/[0.04]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]")}>
      <button className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left" onClick={() => setOpen((o) => !o)}>
        <span className="text-sm font-medium">{q}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", open && "rotate-180 text-primary")} />
      </button>
      <div className={cn("overflow-hidden transition-all duration-300", open ? "max-h-48" : "max-h-0")}>
        <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
      </div>
    </div>
  );
}

/** Stat com contador animado */
function StatItem({ value, suffix, label, active, delay }: { value: number; suffix: string; label: string; active: boolean; delay: number }) {
  const count = useCounter(value, 2200, active);
  return (
    <div className="lp-reveal text-center" style={{ transitionDelay: `${delay}s` }}>
      <div className="mb-1 text-4xl font-bold tracking-tight gradient-text md:text-5xl">{count}{suffix}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

/* ───────────────────────── MAIN PAGE ──────────────────────────── */

export function LandingPage() {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [videoOpen,   setVideoOpen]   = useState(false);
  const [annual,      setAnnual]      = useState(false);
  const [openFaq,     setOpenFaq]     = useState<number | null>(null);

  // Refs para DOM-direct parallax / progress
  const orb1Ref     = useRef<HTMLDivElement>(null);
  const orb2Ref     = useRef<HTMLDivElement>(null);
  const orb3Ref     = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // InView refs
  const { ref: statsRef,    inView: statsInView }    = useInView(0.3);
  const { ref: modulesRef,  inView: modulesInView }  = useInView(0.1);
  const { ref: benefitsRef, inView: benefitsInView } = useInView(0.15);

  // Scroll progress bar + parallax (DOM direct — zero re-renders)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.width = `${total > 0 ? (y / total) * 100 : 0}%`;
      if (orb1Ref.current) orb1Ref.current.style.transform = `translateY(${y * 0.14}px)`;
      if (orb2Ref.current) orb2Ref.current.style.transform = `translateY(${y * 0.07}px)`;
      if (orb3Ref.current) orb3Ref.current.style.transform = `translateY(${-y * 0.10}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-reveal helper
  const reveal = useCallback((ref: React.RefObject<HTMLDivElement | null>, inView: boolean) => {
    if (inView && ref.current)
      ref.current.querySelectorAll<HTMLElement>(".lp-reveal").forEach((el) => el.classList.add("is-visible"));
  }, []);

  useEffect(() => reveal(statsRef,    statsInView),    [statsInView,    reveal, statsRef]);
  useEffect(() => reveal(modulesRef,  modulesInView),  [modulesInView,  reveal, modulesRef]);
  useEffect(() => reveal(benefitsRef, benefitsInView), [benefitsInView, reveal, benefitsRef]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[oklch(0.09_0.012_268)] text-foreground">

      {/* ── SCROLL PROGRESS BAR ── */}
      <div className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-transparent">
        <div ref={progressRef} className="h-full w-0 gradient-primary transition-none" style={{ boxShadow: "0 0 8px oklch(0.62 0.26 268 / 60%)" }} />
      </div>

      {/* ── ANIMATED BACKGROUND ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Noise/grain texture */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.032]" xmlns="http://www.w3.org/2000/svg">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>

        {/* Orbs (parallax via DOM) */}
        <div ref={orb1Ref} className="absolute left-[12%] top-[3%] h-[700px] w-[700px] rounded-full bg-violet-600/[0.07] blur-[130px]" style={{ animation: "lp-orb-1 14s ease-in-out infinite", willChange: "transform" }} />
        <div ref={orb2Ref} className="absolute right-[8%] top-[28%] h-[500px] w-[500px] rounded-full bg-indigo-500/[0.06] blur-[110px]" style={{ animation: "lp-orb-2 18s ease-in-out infinite", willChange: "transform" }} />
        <div ref={orb3Ref} className="absolute bottom-[8%] left-[32%] h-[600px] w-[600px] rounded-full bg-purple-700/[0.05] blur-[150px]" style={{ animation: "lp-orb-3 22s ease-in-out infinite", willChange: "transform" }} />

        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.016]" style={{ backgroundImage: "radial-gradient(circle, oklch(0.85 0 0) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Edge vignettes */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[oklch(0.09_0.012_268)] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[oklch(0.09_0.012_268)] to-transparent" />
      </div>

      {/* ── NAVBAR ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05] bg-[oklch(0.09_0.012_268/80%)] backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative flex size-8 items-center justify-center rounded-xl gradient-primary">
              <Sparkles className="size-4 text-white" />
              <div className="absolute inset-0 rounded-xl bg-primary/30" style={{ animation: "lp-pulse-ring 2.5s ease-out infinite" }} />
            </div>
            <span className="text-base font-bold tracking-tight gradient-text">Aureon</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {[["Módulos","#modulos"],["Benefícios","#beneficios"],["Preços","#precos"],["FAQ","#faq"]].map(([label, href]) => (
              <a key={label} href={href} className="transition-colors hover:text-foreground">{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button size="sm" className="gradient-primary border-0 text-white glow-primary-sm hover:opacity-90" asChild>
              <Link href="/signup">Começar grátis <ArrowRight className="ml-1.5 size-3.5" /></Link>
            </Button>
            <button className="ml-1 rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden" onClick={() => setMenuOpen((o) => !o)}>
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-white/[0.05] bg-[oklch(0.09_0.012_268/95%)] px-6 py-4 md:hidden">
            <nav className="flex flex-col gap-3 text-sm">
              {[["Módulos","#modulos"],["Benefícios","#beneficios"],["Preços","#precos"],["FAQ","#faq"],["Entrar","/login"]].map(([label, href]) => (
                <a key={label} href={href} className="text-muted-foreground transition-colors hover:text-foreground" onClick={() => setMenuOpen(false)}>{label}</a>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-24 pt-32 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm" style={{ animation: "lp-fade-up 0.6s ease both" }}>
          <span className="size-1.5 rounded-full bg-emerald-400" style={{ animation: "lp-badge-blink 2s ease-in-out infinite" }} />
          Plataforma all-in-one para times de vendas
          <ChevronRight className="size-3.5 text-primary" />
        </div>

        <h1 className="mx-auto mb-4 max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl" style={{ animation: "lp-fade-up 0.7s ease 0.1s both" }}>
          Venda mais com
          <br />
          <TypedText words={["CRM Inteligente", "Automação", "Power Dialer", "Email Marketing", "Analytics"]} />
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground" style={{ animation: "lp-fade-up 0.7s ease 0.2s both" }}>
          Do primeiro contato ao fechamento — gerencie todo o ciclo de vendas em uma plataforma unificada com IA integrada.
        </p>

        <div className="mb-4 flex flex-wrap justify-center gap-3" style={{ animation: "lp-fade-up 0.7s ease 0.3s both" }}>
          <Button size="lg" className="group relative overflow-hidden border-0 px-8 gradient-primary text-white font-semibold" style={{ animation: "lp-glow-pulse 3s ease-in-out infinite" }} asChild>
            <Link href="/signup">
              Começar gratuitamente
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="gap-2 border-white/[0.1] bg-white/[0.03] backdrop-blur-sm hover:bg-white/[0.07]" onClick={() => setVideoOpen(true)}>
            <Play className="size-4 text-primary" fill="currentColor" />
            Ver demonstração
          </Button>
        </div>

        <p className="mb-16 text-xs text-muted-foreground/50" style={{ animation: "lp-fade-up 0.7s ease 0.35s both" }}>
          Sem cartão de crédito · Grátis por 14 dias · Cancele quando quiser
        </p>

        <div className="w-full max-w-2xl" style={{ animation: "lp-fade-up 0.9s ease 0.45s both" }}>
          <DashboardMockup />
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section id="beneficios" ref={benefitsRef} className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="lp-reveal mb-4 text-center">
            <span className="inline-block rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Por que Aureon?</span>
          </div>
          <div className="lp-reveal lp-reveal-delay-1 mb-16 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Tudo que seu time de vendas precisa</h2>
            <p className="mx-auto max-w-lg text-muted-foreground">Uma plataforma que conecta todas as etapas do processo comercial — do lead ao cliente fiel.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {benefits.map((b, i) => (
              <SpotlightCard key={b.title} className={cn("lp-reveal group rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20", `lp-reveal-delay-${i + 1}`)}>
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <b.icon className="size-6 text-primary" />
                </div>
                <div className="mb-3 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{b.highlight}</div>
                <h3 className="mb-2 text-lg font-bold">{b.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES ── */}
      <section id="modulos" ref={modulesRef} className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="lp-reveal mb-4 text-center">
            <span className="inline-block rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-400">Módulos</span>
          </div>
          <div className="lp-reveal lp-reveal-delay-1 mb-16 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Um ecossistema completo de vendas</h2>
            <p className="mx-auto max-w-lg text-muted-foreground">9 módulos nativos, totalmente integrados. Sem precisar de dezenas de ferramentas diferentes.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m, i) => (
              <SpotlightCard key={m.title} spotColor={m.spotColor} className={cn("lp-reveal group cursor-default rounded-xl border border-white/[0.07] bg-white/[0.025] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.04]", `lp-reveal-delay-${(i % 6) + 1}`)}>
                <div className={cn("mb-4 inline-flex size-11 items-center justify-center rounded-xl", m.bg)}>
                  <m.icon className={cn("size-5", m.color)} />
                </div>
                <h3 className="mb-1.5 font-semibold">{m.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  Explorar <ChevronRight className="size-3" />
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} className="relative z-10 py-24">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.04] via-primary/[0.08] to-primary/[0.04]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="container relative mx-auto px-6 py-16">
            <h2 className="lp-reveal mb-12 text-center text-3xl font-bold md:text-4xl">Resultados que falam por si</h2>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((s, i) => (
                <StatItem key={s.label} {...s} active={statsInView} delay={i * 0.1} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-400">Depoimentos</span>
          </div>
          <h2 className="mb-16 text-center text-3xl font-bold tracking-tight md:text-4xl">O que nossos clientes dizem</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <SpotlightCard key={t.name} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
                {/* Stars */}
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="size-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role} · {t.company}</div>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precos" className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-400">Preços</span>
          </div>
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight md:text-4xl">Planos para todo tamanho de time</h2>
          <p className="mb-8 text-center text-muted-foreground">Sem cobranças surpresa. Cancele quando quiser.</p>

          {/* Toggle */}
          <div className="mb-12 flex items-center justify-center gap-3">
            <span className={cn("text-sm transition-colors", !annual ? "text-foreground font-medium" : "text-muted-foreground")}>Mensal</span>
            <button
              onClick={() => setAnnual((a) => !a)}
              className={cn("relative h-6 w-11 rounded-full border transition-colors duration-300", annual ? "border-primary/40 bg-primary/20" : "border-white/[0.1] bg-white/[0.06]")}
            >
              <div className={cn("absolute top-0.5 h-5 w-5 rounded-full gradient-primary shadow transition-transform duration-300", annual ? "translate-x-5" : "translate-x-0.5")} />
            </button>
            <span className={cn("text-sm transition-colors", annual ? "text-foreground font-medium" : "text-muted-foreground")}>
              Anual
              <span className="ml-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">–20%</span>
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <SpotlightCard
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-8 transition-all duration-300",
                  plan.highlight
                    ? "border-primary/40 bg-primary/[0.06] shadow-[0_0_50px_oklch(0.62_0.26_268/15%)]"
                    : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/30 gradient-primary px-3 py-0.5 text-xs font-semibold text-white shadow-[0_0_16px_oklch(0.62_0.26_268/30%)]">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-2 text-lg font-bold">{plan.name}</div>
                <div className="mb-6 text-xs text-muted-foreground">{plan.desc}</div>

                <div className="mb-8">
                  {plan.monthly ? (
                    <>
                      <span className="text-4xl font-bold">
                        R$ {annual ? plan.annual : plan.monthly}
                      </span>
                      <span className="ml-1 text-sm text-muted-foreground">/mês</span>
                      {annual && <div className="mt-1 text-xs text-emerald-400">Cobrado anualmente</div>}
                    </>
                  ) : (
                    <span className="text-2xl font-bold">Sob consulta</span>
                  )}
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn("w-full border-0 font-semibold", plan.highlight ? "gradient-primary text-white glow-primary-sm hover:opacity-90" : "bg-white/[0.06] text-foreground hover:bg-white/[0.1]")}
                  asChild
                >
                  <Link href={plan.monthly ? "/signup" : "/contato"}>
                    {plan.monthly ? "Começar agora" : "Falar com vendas"}
                    <ArrowRight className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-400">Como funciona</span>
          </div>
          <h2 className="mb-16 text-center text-3xl font-bold tracking-tight md:text-4xl">Configure em minutos, venda em horas</h2>
          <div className="relative grid gap-12 md:grid-cols-3">
            <div className="absolute left-1/2 top-8 hidden h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/20 to-transparent md:block" />
            {[
              { step: "01", title: "Importe seus contatos", desc: "Traga sua base via CSV, integrações ou crie manualmente. Em segundos tudo está organizado.", icon: Users },
              { step: "02", title: "Configure automações",  desc: "Defina gatilhos, ações e cadências. O sistema trabalha por você 24/7.",                     icon: Zap },
              { step: "03", title: "Acompanhe resultados",  desc: "Dashboards em tempo real mostram onde cada lead está e qual ação tomar.",                    icon: BarChart3 },
            ].map((s, i) => (
              <div key={s.step} className="relative text-center">
                <div className="relative mx-auto mb-6 flex size-16 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-primary/20" />
                  <div className="absolute inset-0 rounded-full border border-primary/30" style={{ animation: `lp-pulse-ring 3s ease-out infinite ${i * 0.8}s` }} />
                  <div className="relative flex size-12 items-center justify-center rounded-full gradient-primary glow-primary-sm">
                    <s.icon className="size-5 text-white" />
                  </div>
                </div>
                <div className="mb-1 text-xs font-bold tracking-widest text-primary/60">PASSO {s.step}</div>
                <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS MARQUEE ── */}
      <section id="integracoes" className="relative z-10 overflow-hidden py-20">
        <div className="container mx-auto mb-12 px-6 text-center">
          <span className="mb-4 inline-block rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-400">Integrações</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Conecte com suas ferramentas favoritas</h2>
        </div>
        {[{ delay: "30s", dir: "normal" }, { delay: "35s", dir: "reverse" }].map((row, ri) => (
          <div key={ri} className="relative mt-4 first:mt-0">
            <div className="absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[oklch(0.09_0.012_268)] to-transparent" />
            <div className="absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[oklch(0.09_0.012_268)] to-transparent" />
            <div className="flex gap-4" style={{ width: "max-content", animation: `lp-marquee ${row.delay} linear infinite ${row.dir}` }}>
              {[...integrationLogos, ...integrationLogos].map((logo, i) => (
                <div key={i} className="flex h-14 w-44 shrink-0 items-center justify-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-5 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.06]">
                  <div className="size-2.5 rounded-full opacity-80" style={{ backgroundColor: logo.color }} />
                  <span className="text-sm font-medium text-muted-foreground">{logo.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs font-medium text-rose-400">Comparativo</span>
          </div>
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight md:text-4xl">Por que não o HubSpot ou RD Station?</h2>
          <p className="mb-12 text-center text-muted-foreground">Veja o que apenas o Aureon oferece de forma nativa.</p>

          <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
            {/* Header */}
            <div className="grid grid-cols-4 border-b border-white/[0.07] bg-white/[0.03]">
              <div className="p-5 text-sm font-medium text-muted-foreground">Funcionalidade</div>
              {[
                { name: "Aureon", highlight: true },
                { name: "HubSpot", highlight: false },
                { name: "RD Station", highlight: false },
              ].map((col) => (
                <div key={col.name} className={cn("p-5 text-center text-sm font-bold", col.highlight ? "text-primary" : "text-muted-foreground")}>
                  {col.highlight && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />}
                  {col.name}
                </div>
              ))}
            </div>

            {comparisonFeatures.map((row, i) => (
              <div key={row.feature} className={cn("grid grid-cols-4 border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]", i === comparisonFeatures.length - 1 && "border-0")}>
                <div className="p-4 text-sm text-muted-foreground">{row.feature}</div>
                {[row.aureon, row.hubspot, row.rd].map((val, j) => (
                  <div key={j} className={cn("flex items-center justify-center p-4", j === 0 && "bg-primary/[0.03]")}>
                    {val
                      ? <CheckCircle2 className={cn("size-5", j === 0 ? "text-primary" : "text-emerald-500/60")} />
                      : <X className="size-4 text-muted-foreground/30" />
                    }
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="relative z-10 py-24">
        <div className="container mx-auto max-w-3xl px-6">
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-400">FAQ</span>
          </div>
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">Perguntas frequentes</h2>
          <div className="space-y-3">
            {faqs.map((item, i) => (
              <FAQItem key={i} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <div className="grid md:grid-cols-2">
              <div className="border-b border-white/[0.06] p-10 md:border-b-0 md:border-r">
                <h2 className="mb-8 text-2xl font-bold">Tudo incluído no seu plano</h2>
                <div className="space-y-4">
                  {["CRM completo com pipeline visual","Inbox unificada (WhatsApp, email, SMS)","Power Dialer e gravação de chamadas","Automação de workflows ilimitados","Email marketing com analytics","Propostas com assinatura digital","Agendamento e calendário integrado","Dashboard e relatórios avançados","API REST e webhooks","Suporte em português"].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative flex flex-col items-center justify-center overflow-hidden p-10 text-center">
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[60px]" />
                <div className="relative mb-6 inline-flex size-16 items-center justify-center rounded-2xl gradient-primary glow-primary">
                  <Sparkles className="size-7 text-white" />
                </div>
                <h3 className="mb-3 text-2xl font-bold">Comece grátis hoje</h3>
                <p className="mb-8 text-sm leading-relaxed text-muted-foreground">14 dias de acesso completo, sem cartão de crédito.<br />Configure em minutos e veja resultados no mesmo dia.</p>
                <Button size="lg" className="w-full max-w-xs gradient-primary border-0 text-white font-semibold hover:opacity-90" style={{ animation: "lp-glow-pulse 3s ease-in-out infinite" }} asChild>
                  <Link href="/signup">Criar conta gratuita <ArrowRight className="ml-2 size-4" /></Link>
                </Button>
                <p className="mt-4 text-xs text-muted-foreground/50">
                  Já tem conta?{" "}
                  <Link href="/login" className="text-primary transition-colors hover:text-primary/80">Faça login</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/[0.05] py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg gradient-primary">
                <Sparkles className="size-3.5 text-white" />
              </div>
              <span className="font-bold tracking-tight gradient-text">Aureon</span>
              <span className="text-xs text-muted-foreground/40">CRM & Automação de Vendas</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground/50">
              {["Termos de Uso","Privacidade","Suporte","Status","Blog"].map((l) => (
                <a key={l} href="#" className="transition-colors hover:text-muted-foreground">{l}</a>
              ))}
            </nav>
            <p className="text-xs text-muted-foreground/30">© 2025 Aureon · Todos os direitos reservados</p>
          </div>
        </div>
      </footer>

      {/* ── VIDEO MODAL ── */}
      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
    </div>
  );
}
