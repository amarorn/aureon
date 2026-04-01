"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, Users, Target, ArrowRight, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Syne } from "next/font/google";
import { cn } from "@/lib/utils";

const syne = Syne({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

function useCounter(end: number, duration = 1800, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      let startTime: number | null = null;
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.floor(eased * end));
        if (progress < 1) requestAnimationFrame(step);
        else setValue(end);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timer);
  }, [end, duration, delay]);
  return value;
}

const CODE_MESSAGES: Record<string, string> = {
  ACCOUNT_PENDING_APPROVAL: "Sua conta está aguardando liberação da equipe Aureon.",
  ACCOUNT_REJECTED: "Seu cadastro não foi aprovado. Entre em contato com o comercial.",
  TENANT_SUSPENDED: "Sua organização está suspensa ou inativa.",
  INVALID_CREDENTIALS: "E-mail ou senha inválidos.",
};

const SPARKLINE = [18, 42, 28, 55, 38, 68, 52, 78, 62, 90, 75, 88];

function buildSparklinePaths(points: number[], width: number, height: number) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const pad = height * 0.1;
  const mapped = points.map((v, i) => ({
    x: (i / (points.length - 1)) * width,
    y: height - pad - ((v - min) / range) * (height - pad * 2),
  }));
  const line = mapped.reduce((p, pt, i) => {
    if (i === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    const prev = mapped[i - 1];
    const cx = ((prev.x + pt.x) / 2).toFixed(1);
    return `${p} C ${cx} ${prev.y.toFixed(1)} ${cx} ${pt.y.toFixed(1)} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, "");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return { line, area };
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace("/app");
  }, [isAuthenticated, router]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("aureon_login_notice");
      if (!raw) return;
      sessionStorage.removeItem("aureon_login_notice");
      const j = JSON.parse(raw) as { type?: string };
      if (j.type === "password_ok") {
        setFlash("Senha alterada. Entre novamente com a nova senha.");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const leads = useCounter(284, 2000, 400);
  const deals = useCounter(48, 1500, 600);
  const revenue = useCounter(42, 2200, 200);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCode(null);
    setFlash(null);
    setPending(true);
    try {
      await login(email, password);
      router.replace("/app");
    } catch (err) {
      const e = err as Error & { code?: string };
      setCode(e.code ?? null);
      setError((e.code && CODE_MESSAGES[e.code]) || e.message || "Não foi possível entrar.");
    } finally {
      setPending(false);
    }
  }

  const { line: sparkLine, area: sparkArea } = buildSparklinePaths(SPARKLINE, 200, 56);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 48,
    background: "oklch(0.13 0.015 268)",
    border: "1px solid oklch(1 0 0 / 10%)",
    borderRadius: 12,
    padding: "0 16px",
    fontSize: 14,
    fontWeight: 500,
    color: "oklch(0.96 0.005 268)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "oklch(0.62 0.26 268 / 55%)";
    e.target.style.boxShadow =
      "0 0 0 3px oklch(0.62 0.26 268 / 10%), inset 0 1px 0 oklch(1 0 0 / 4%)";
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "oklch(1 0 0 / 10%)";
    e.target.style.boxShadow = "none";
  }

  const cardBase: React.CSSProperties = {
    background: "oklch(0.125 0.015 268)",
    border: "1px solid oklch(1 0 0 / 8%)",
    borderRadius: 18,
    boxShadow:
      "0 12px 40px oklch(0 0 0 / 35%), inset 0 1px 0 oklch(1 0 0 / 6%)",
    cursor: "default",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  };

  const logoMark = (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        flexShrink: 0,
        background:
          "linear-gradient(135deg, oklch(0.62 0.26 268), oklch(0.68 0.24 300))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 24px oklch(0.62 0.26 268 / 45%)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 1.5L13.5 4.5v7L8 14.5L2.5 11.5v-7L8 1.5Z"
          stroke="white"
          strokeWidth="1.4"
          fill="none"
          strokeLinejoin="round"
        />
        <circle cx="8" cy="8" r="2" fill="white" />
      </svg>
    </div>
  );

  const logoText = (
    <span
      style={{
        fontSize: 16,
        fontWeight: 800,
        letterSpacing: "-0.03em",
        background:
          "linear-gradient(135deg, oklch(0.78 0.20 268), oklch(0.82 0.18 300))",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      Aureon
    </span>
  );

  return (
    <div
      className={cn("relative flex min-h-screen overflow-hidden", syne.className)}
      style={{ background: "oklch(0.07 0.012 268)" }}
    >
      {/* ── Background ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 25% 50%, oklch(0.62 0.26 268 / 10%) 0%, transparent 65%), radial-gradient(ellipse 50% 50% at 85% 10%, oklch(0.68 0.24 300 / 7%) 0%, transparent 60%)",
          }}
        />
        <svg
          className="absolute"
          style={{
            width: 640,
            height: 640,
            left: "25%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            opacity: 0.05,
          }}
        >
          {([100, 180, 260, 310] as const).map((r, i) => (
            <circle
              key={r}
              cx={320}
              cy={320}
              r={r}
              fill="none"
              stroke={
                i % 2 === 0 ? "oklch(0.62 0.26 268)" : "oklch(0.68 0.24 300)"
              }
              strokeWidth={i % 2 === 0 ? 1 : 0.5}
              strokeDasharray={i > 1 ? "6 12" : undefined}
              style={{
                transformOrigin: "320px 320px",
                animation: `lp-spin-slow ${25 + i * 12}s linear ${i % 2 === 0 ? "normal" : "reverse"} infinite`,
              }}
            />
          ))}
        </svg>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.8 0 0) 1px, transparent 1px), linear-gradient(to right, oklch(0.8 0 0) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
            opacity: 0.018,
          }}
        />
      </div>

      {/* ── LEFT PANEL — Dashboard preview ── */}
      <div
        className="relative hidden lg:flex flex-col justify-center px-14"
        style={{
          width: "52%",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateX(0)" : "translateX(-24px)",
          transition: "opacity 0.9s ease, transform 0.9s ease",
        }}
      >
        {/* Logo */}
        <div
          className="absolute top-10 left-14"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          {logoMark}
          {logoText}
        </div>

        {/* Headline */}
        <div style={{ marginBottom: 28, maxWidth: 440 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "4px 12px 4px 8px",
              background: "oklch(0.70 0.19 190 / 10%)",
              border: "1px solid oklch(0.70 0.19 190 / 22%)",
              borderRadius: 999,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "oklch(0.70 0.19 190)",
                animation: "lp-badge-blink 2.2s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "oklch(0.70 0.19 190)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Dados ao vivo
            </span>
          </div>

          <h1
            style={{
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.035em",
              color: "oklch(0.95 0.005 268)",
              margin: 0,
            }}
          >
            Seu pipeline,
            <br />
            <span
              style={{
                background:
                  "linear-gradient(125deg, oklch(0.78 0.22 268), oklch(0.82 0.20 300), oklch(0.74 0.22 320))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              inteligente.
            </span>
          </h1>
        </div>

        {/* Main card — Revenue + sparkline */}
        <div
          style={{ ...cardBase, padding: "20px 24px 16px", marginBottom: 12, maxWidth: 460 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 20px 50px oklch(0 0 0 / 40%), inset 0 1px 0 oklch(1 0 0 / 6%)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 12px 40px oklch(0 0 0 / 35%), inset 0 1px 0 oklch(1 0 0 / 6%)";
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "oklch(0.46 0.02 268)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 5,
                }}
              >
                Pipeline Total
              </div>
              <div
                suppressHydrationWarning
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  letterSpacing: "-0.035em",
                  color: "oklch(0.95 0.005 268)",
                  lineHeight: 1,
                }}
              >
                R$ {(revenue / 10).toFixed(1)}M
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 6,
                }}
              >
                <TrendingUp size={11} style={{ color: "oklch(0.70 0.19 190)" }} />
                <span
                  style={{
                    fontSize: 11.5,
                    color: "oklch(0.70 0.19 190)",
                    fontWeight: 600,
                  }}
                >
                  +18.4% este mês
                </span>
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: "oklch(0.62 0.26 268 / 14%)",
                border: "1px solid oklch(0.62 0.26 268 / 22%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={17} style={{ color: "oklch(0.75 0.22 268)" }} />
            </div>
          </div>

          <svg
            width="100%"
            height={56}
            viewBox="0 0 200 56"
            preserveAspectRatio="none"
            style={{ display: "block" }}
          >
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.62 0.26 268)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="oklch(0.62 0.26 268)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={sparkArea} fill="url(#sparkFill)" />
            <path
              d={sparkLine}
              fill="none"
              stroke="oklch(0.72 0.24 268)"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Two mini cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            maxWidth: 460,
          }}
        >
          {/* Leads */}
          <div
            style={{ ...cardBase, borderRadius: 16, padding: "16px 18px" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "oklch(0.46 0.02 268)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Leads Ativos
              </div>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "oklch(0.72 0.22 320 / 14%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={13} style={{ color: "oklch(0.78 0.18 320)" }} />
              </div>
            </div>
            <div
              suppressHydrationWarning
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "oklch(0.95 0.005 268)",
                lineHeight: 1,
                marginBottom: 3,
              }}
            >
              {leads}
            </div>
            <div style={{ fontSize: 11, color: "oklch(0.70 0.19 190)", fontWeight: 600 }}>
              67 em negociação
            </div>
            <div
              style={{
                display: "flex",
                gap: 2.5,
                alignItems: "flex-end",
                marginTop: 10,
                height: 22,
              }}
            >
              {[35, 58, 42, 70, 52, 80, 68].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: `oklch(0.72 0.22 320 / ${20 + i * 10}%)`,
                    borderRadius: 3,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Deals */}
          <div
            style={{ ...cardBase, borderRadius: 16, padding: "16px 18px" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "oklch(0.46 0.02 268)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Fechados no Mês
              </div>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "oklch(0.70 0.19 190 / 14%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Target size={13} style={{ color: "oklch(0.75 0.16 190)" }} />
              </div>
            </div>
            <div
              suppressHydrationWarning
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "oklch(0.95 0.005 268)",
                lineHeight: 1,
                marginBottom: 3,
              }}
            >
              {deals}
            </div>
            <div style={{ fontSize: 11, color: "oklch(0.70 0.19 190)", fontWeight: 600 }}>
              negócios fechados
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
              }}
            >
              <svg width={38} height={38} viewBox="0 0 38 38">
                <circle
                  cx={19}
                  cy={19}
                  r={14}
                  fill="none"
                  stroke="oklch(0.70 0.19 190 / 15%)"
                  strokeWidth={3}
                />
                <circle
                  cx={19}
                  cy={19}
                  r={14}
                  fill="none"
                  stroke="oklch(0.70 0.19 190)"
                  strokeWidth={3}
                  strokeDasharray={`${2 * Math.PI * 14 * 0.68} ${2 * Math.PI * 14}`}
                  strokeLinecap="round"
                  transform="rotate(-90 19 19)"
                />
              </svg>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "oklch(0.95 0.005 268)",
                    lineHeight: 1,
                  }}
                >
                  68%
                </div>
                <div style={{ fontSize: 10, color: "oklch(0.46 0.02 268)", marginTop: 2 }}>
                  conversão
                </div>
              </div>
            </div>
          </div>
        </div>

        <p
          style={{
            position: "absolute",
            bottom: 28,
            left: 56,
            fontSize: 10.5,
            color: "oklch(0.26 0.01 268)",
          }}
        >
          © 2026 Aureon. Todos os direitos reservados.
        </p>
      </div>

      {/* ── RIGHT PANEL — Login form ── */}
      <div
        className="relative flex flex-1 flex-col items-center justify-center px-8"
        style={{
          borderLeft: "1px solid oklch(1 0 0 / 5.5%)",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateX(0)" : "translateX(20px)",
          transition: "opacity 0.9s ease 0.15s, transform 0.9s ease 0.15s",
        }}
      >
        {/* Mobile logo */}
        <div
          className="lg:hidden absolute top-8 left-8"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          {logoMark}
          {logoText}
        </div>

        <div style={{ width: "100%", maxWidth: 376 }}>
          {/* Header */}
          <div style={{ marginBottom: 30 }}>
            <h2
              style={{
                fontSize: 27,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "oklch(0.95 0.005 268)",
                margin: 0,
                lineHeight: 1.2,
                marginBottom: 7,
              }}
            >
              Bem-vindo de volta
            </h2>
            <p
              style={{
                fontSize: 13.5,
                color: "oklch(0.48 0.018 268)",
                margin: 0,
                fontWeight: 400,
                letterSpacing: "-0.005em",
              }}
            >
              Entre para acessar seu painel Aureon
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            {/* Email */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "oklch(0.48 0.018 268)",
                  marginBottom: 8,
                }}
              >
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {/* Password */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "oklch(0.48 0.018 268)",
                  }}
                >
                  Senha
                </label>
                <button
                  type="button"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "oklch(0.65 0.22 268)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "oklch(0.78 0.22 268)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "oklch(0.65 0.22 268)";
                  }}
                >
                  Esqueci a senha
                </button>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {flash && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "oklch(0.72 0.14 160 / 10%)",
                  border: "1px solid oklch(0.72 0.14 160 / 30%)",
                  borderRadius: 11,
                  fontSize: 13,
                  color: "oklch(0.82 0.12 160)",
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                }}
              >
                {flash}
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background:
                    code === "ACCOUNT_PENDING_APPROVAL"
                      ? "oklch(0.75 0.17 80 / 9%)"
                      : "oklch(0.55 0.22 27 / 9%)",
                  border: `1px solid ${
                    code === "ACCOUNT_PENDING_APPROVAL"
                      ? "oklch(0.75 0.17 80 / 28%)"
                      : "oklch(0.55 0.22 27 / 28%)"
                  }`,
                  borderRadius: 11,
                  fontSize: 13,
                  color:
                    code === "ACCOUNT_PENDING_APPROVAL"
                      ? "oklch(0.82 0.14 80)"
                      : "oklch(0.75 0.18 27)",
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={pending}
              style={{
                height: 52,
                width: "100%",
                background: pending
                  ? "oklch(0.42 0.16 268)"
                  : "linear-gradient(135deg, oklch(0.60 0.26 268), oklch(0.66 0.24 300))",
                border: "none",
                borderRadius: 14,
                cursor: pending ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.01em",
                boxShadow: pending
                  ? "none"
                  : "0 4px 22px oklch(0.62 0.26 268 / 32%), inset 0 1px 0 oklch(1 0 0 / 18%)",
                transition: "transform 0.15s, box-shadow 0.15s",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                if (!pending) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 32px oklch(0.62 0.26 268 / 45%), inset 0 1px 0 oklch(1 0 0 / 18%)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = pending
                  ? "none"
                  : "0 4px 22px oklch(0.62 0.26 268 / 32%), inset 0 1px 0 oklch(1 0 0 / 18%)";
              }}
            >
              {pending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar na plataforma
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "22px 0",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "oklch(1 0 0 / 5.5%)" }} />
            <span
              style={{
                fontSize: 10.5,
                color: "oklch(0.32 0.01 268)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              ou
            </span>
            <div style={{ flex: 1, height: 1, background: "oklch(1 0 0 / 5.5%)" }} />
          </div>

          {/* Signup */}
          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "oklch(0.48 0.018 268)",
              margin: 0,
            }}
          >
            Não tem conta?{" "}
            <Link
              href="/signup"
              style={{
                color: "oklch(0.70 0.22 268)",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              Criar conta grátis
              <ArrowUpRight size={12} />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
