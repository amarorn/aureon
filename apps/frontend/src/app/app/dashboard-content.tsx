"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import * as echarts from "echarts";
import { Label } from "@/components/ui/label";
import { apiHeaders, API_URL } from "@/lib/api";
import { MOCK_METRICS } from "@/lib/mock-data";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  Zap,
  Clock,
  SlidersHorizontal,
  Loader2,
  CheckCircle2,
  UserPlus,
  ArrowUpRight,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  DashboardViewSwitcher,
  DashboardGoogleAnalyticsView,
  DashboardGoogleAdsView,
  DashboardBusinessProfileView,
  getStoredDashboardView,
  type DashboardViewId,
} from "@/components/dashboard-integration-views";
import { PageTour } from "@/components/page-tour";

// Meta mensal fixa para demonstração
const MONTHLY_GOAL = 350_000;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDays(ms: number) {
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  return `${days} dias`;
}

const chartTheme = {
  light: {
    tooltipBg: "oklch(1 0 0)",
    tooltipBorder: "oklch(0.88 0.01 268 / 60%)",
    tooltipText: "oklch(0.2 0.02 268)",
    axisLabel: "oklch(0.45 0.02 268)",
    axisLine: "oklch(0.88 0.01 268 / 60%)",
    splitLine: "oklch(0.88 0.01 268 / 40%)",
  },
  dark: {
    tooltipBg: "oklch(0.13 0.015 268)",
    tooltipBorder: "oklch(1 0 0 / 8%)",
    tooltipText: "#e2e8f0",
    axisLabel: "#94a3b8",
    axisLine: "oklch(1 0 0 / 8%)",
    splitLine: "oklch(1 0 0 / 6%)",
  },
};

function Chart({
  option,
  theme,
}: {
  option: Record<string, unknown>;
  theme: "light" | "dark";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, theme);
    chart.setOption({
      backgroundColor: "transparent",
      ...(option as echarts.EChartsOption),
    });
    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [option, theme]);
  return <div ref={ref} style={{ height: 260, width: "100%" }} />;
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  glow: string;
  sub?: string;
  trend?: number;
}

function MetricCard({ title, value, icon, gradient, glow, sub, trend }: MetricCardProps) {
  const isPositive = (trend ?? 0) >= 0;
  return (
    <div
      className={`glass-card rounded-2xl p-5 hover:scale-[1.02] transition-all duration-200 ${glow} group`}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-lg ${gradient} group-hover:scale-110 transition-transform duration-200`}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
      <div className="flex items-center justify-between mt-1.5">
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {trend !== undefined && (
          <div
            className={`flex items-center gap-0.5 text-xs font-medium rounded-full px-2 py-0.5 ${
              isPositive
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}

const activityIconMap: Record<string, { icon: React.ReactNode; bg: string }> = {
  won: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    bg: "bg-emerald-500/10",
  },
  contact: {
    icon: <UserPlus className="h-3.5 w-3.5 text-violet-400" />,
    bg: "bg-violet-500/10",
  },
  stage: {
    icon: <ArrowUpRight className="h-3.5 w-3.5 text-amber-400" />,
    bg: "bg-amber-500/10",
  },
};

export function DashboardContent() {
  const [dashboardView, setDashboardView] = useState<DashboardViewId>(() =>
    typeof window !== "undefined" ? getStoredDashboardView() : "main",
  );
  const { resolvedTheme } = useTheme();
  const chartMode = (resolvedTheme === "dark" ? "dark" : "light") as "light" | "dark";
  const colors = chartTheme[chartMode];

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pipelineId, setPipelineId] = useState("");

  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (pipelineId) params.set("pipelineId", pipelineId);

  const { data: rawMetrics, isLoading } = useQuery({
    queryKey: ["dashboard", "metrics", startDate, endDate, pipelineId],
    queryFn: () =>
      fetch(`${API_URL}/dashboard/metrics?${params}`, {
        headers: apiHeaders,
      }).then((r) => (r.ok ? r.json() : null)),
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () =>
      fetch(`${API_URL}/pipelines`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  // Usa dados reais se disponíveis, caso contrário usa mock
  const metrics = rawMetrics ?? MOCK_METRICS;
  const isMock = !rawMetrics && !isLoading;
  const trends = (metrics as typeof MOCK_METRICS).trends ?? MOCK_METRICS.trends;
  const recentActivity =
    (metrics as typeof MOCK_METRICS).recentActivity ?? MOCK_METRICS.recentActivity;

  const funnelOption = {
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText },
    },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category" as const,
      data: metrics?.funnel?.map((f: { stageName: string }) => f.stageName) ?? [],
      axisLabel: { color: colors.axisLabel, fontSize: 11 },
      axisLine: { lineStyle: { color: colors.axisLine } },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: { color: colors.axisLabel, fontSize: 11 },
      splitLine: { lineStyle: { color: colors.splitLine } },
    },
    series: [
      {
        type: "bar" as const,
        barMaxWidth: 48,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: metrics?.funnel?.map((f: { count: number; color: string }) => ({
          value: f.count,
          itemStyle: { color: f.color },
        })) ?? [],
      },
    ],
  };

  const distributionOption = {
    tooltip: {
      trigger: "item",
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText },
    },
    legend: {
      bottom: 0,
      textStyle: { color: colors.axisLabel, fontSize: 11 },
    },
    series: [
      {
        type: "pie" as const,
        radius: ["40%", "65%"],
        center: ["50%", "45%"],
        itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: "transparent" },
        data:
          metrics?.distributionByStage?.map(
            (d: { stageName: string; count: number; color: string }) => ({
              name: d.stageName,
              value: d.count,
              itemStyle: { color: d.color },
            })
          ) ?? [],
      },
    ],
  };

  const leadSourceOption = {
    tooltip: {
      trigger: "item",
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText },
    },
    legend: {
      right: 0,
      top: "center",
      orient: "vertical" as const,
      textStyle: { color: colors.axisLabel, fontSize: 11 },
    },
    series: [
      {
        type: "pie" as const,
        radius: ["40%", "65%"],
        center: ["40%", "50%"],
        itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: "transparent" },
        data:
          metrics?.leadSource?.map((l: { source: string; count: number }) => ({
            name: l.source,
            value: l.count,
          })) ?? [],
      },
    ],
  };

  if (dashboardView !== "main") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visualização por integração — páginas detalhadas continuam no menu
            </p>
          </div>
          <DashboardViewSwitcher value={dashboardView} onChange={setDashboardView} />
        </div>
        <div className="glass-card rounded-2xl p-6">
          {dashboardView === "analytics" && <DashboardGoogleAnalyticsView />}
          {dashboardView === "ads" && <DashboardGoogleAdsView />}
          {dashboardView === "business" && <DashboardBusinessProfileView />}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <DashboardViewSwitcher value={dashboardView} onChange={setDashboardView} />
        <div className="flex flex-1 items-center justify-center h-full p-8">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Carregando métricas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageTour tourId="dashboard" />
      <DashboardViewSwitcher value={dashboardView} onChange={setDashboardView} />

      {/* Header */}
      <div className="flex items-center justify-between" data-tour="dashboard-header">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão geral das suas métricas de vendas
          </p>
        </div>
        {isMock && (
          <div className="flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400">
            <Sparkles className="h-3.5 w-3.5" />
            Dados de demonstração
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-5" data-tour="dashboard-filters">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Início</Label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background/50 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Fim</Label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background/50 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Pipeline</Label>
            <select
              value={pipelineId}
              onChange={(e) => setPipelineId(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background/50 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            >
              <option value="">Todos</option>
              {(pipelines as { id: string; name: string }[]).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-tour="dashboard-cards">
        <MetricCard
          title="Total de oportunidades"
          value={String(metrics.totalOpportunities)}
          icon={<TrendingUp className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-violet-600 to-indigo-700"
          glow="hover:shadow-[0_0_24px_oklch(0.62_0.26_268/20%)]"
          sub="Oportunidades no funil"
          trend={trends.totalOpportunities}
        />
        <MetricCard
          title="Receita ganha"
          value={formatCurrency(metrics.revenueWon)}
          icon={<DollarSign className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-emerald-600 to-teal-700"
          glow="hover:shadow-[0_0_24px_oklch(0.7_0.19_162/20%)]"
          sub="Total convertido"
          trend={trends.revenueWon}
        />
        <MetricCard
          title="Taxa de conversão"
          value={`${metrics.conversionRate?.toFixed(1) ?? 0}%`}
          icon={<Target className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          glow="hover:shadow-[0_0_24px_oklch(0.78_0.20_85/20%)]"
          sub="Oportunidades fechadas"
          trend={trends.conversionRate}
        />
        <MetricCard
          title="Ticket médio"
          value={formatCurrency(metrics.averageTicket ?? 0)}
          icon={<BarChart3 className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-pink-600 to-rose-700"
          glow="hover:shadow-[0_0_24px_oklch(0.65_0.22_0/20%)]"
          sub="Valor médio por oportunidade"
          trend={trends.averageTicket}
        />
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Sales Velocity"
          value={formatCurrency(metrics.salesVelocity ?? 0)}
          icon={<Zap className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-cyan-600 to-blue-700"
          glow="hover:shadow-[0_0_24px_oklch(0.7_0.19_220/20%)]"
          sub="Receita gerada por mês"
          trend={trends.salesVelocity}
        />
        <MetricCard
          title="Duração média do ciclo"
          value={formatDays(metrics.averageCycleDuration ?? 0)}
          icon={<Clock className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-purple-600 to-violet-700"
          glow="hover:shadow-[0_0_24px_oklch(0.6_0.24_300/20%)]"
          sub="Tempo médio para fechar"
          trend={trends.averageCycleDuration}
        />
      </div>

      {/* Meta de vendas */}
      {(() => {
        const won = metrics.revenueWon ?? 0;
        const pct = Math.min((won / MONTHLY_GOAL) * 100, 100);
        const remaining = Math.max(MONTHLY_GOAL - won, 0);
        const isAhead = won >= MONTHLY_GOAL * 0.75;
        return (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Trophy className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Meta mensal de receita</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pct >= 100
                      ? "Meta atingida!"
                      : `Faltam ${formatCurrency(remaining)} para a meta`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{pct.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(won)} / {formatCurrency(MONTHLY_GOAL)}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  pct >= 100
                    ? "bg-gradient-to-r from-emerald-500 to-green-400"
                    : isAhead
                    ? "bg-gradient-to-r from-amber-500 to-orange-400"
                    : "bg-gradient-to-r from-violet-600 to-indigo-500"
                }`}
                style={{ width: `${pct}%` }}
              />
              {/* 75% marker */}
              <div className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: "75%" }} />
            </div>
            {/* Milestones */}
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/60">
              <span>R$ 0</span>
              <span>75% — {formatCurrency(MONTHLY_GOAL * 0.75)}</span>
              <span>{formatCurrency(MONTHLY_GOAL)}</span>
            </div>
          </div>
        );
      })()}

      {/* Charts + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Charts col */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-0.5">Funil de vendas</h2>
              <p className="text-xs text-muted-foreground mb-4">Oportunidades por estágio</p>
              <Chart option={funnelOption} theme={chartMode} />
            </div>
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-0.5">
                Distribuição por estágio
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Proporção de oportunidades</p>
              <Chart option={distributionOption} theme={chartMode} />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-0.5">Lead Source</h2>
            <p className="text-xs text-muted-foreground mb-4">Origem dos seus leads</p>
            <Chart option={leadSourceOption} theme={chartMode} />
          </div>
        </div>

        {/* Activity feed */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <h2 className="text-sm font-semibold text-foreground mb-0.5">Atividade recente</h2>
          <p className="text-xs text-muted-foreground mb-5">Últimas movimentações</p>
          <div className="flex-1 space-y-4">
            {recentActivity.map(
              (act: {
                id: string;
                type: string;
                text: string;
                value?: number;
                time: string;
                avatar: string;
              }) => {
                const meta = activityIconMap[act.type] ?? activityIconMap.contact;
                return (
                  <div key={act.id} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.bg}`}
                    >
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground/90 leading-relaxed">{act.text}</p>
                      {act.value && (
                        <p className="text-xs font-semibold text-emerald-500 mt-0.5">
                          {formatCurrency(act.value)}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">{act.time}</p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
