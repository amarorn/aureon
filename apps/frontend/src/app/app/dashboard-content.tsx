"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import * as echarts from "echarts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { apiHeaders, API_URL } from "@/lib/api";
import {
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Zap,
  Clock,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
} from "lucide-react";

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

function Chart({ option }: { option: Record<string, unknown> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, "dark");
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
  }, [option]);
  return <div ref={ref} style={{ height: 280, width: "100%" }} />;
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  glow: string;
  sub?: string;
}

function MetricCard({ title, value, icon, gradient, glow, sub }: MetricCardProps) {
  return (
    <div className={`glass-card rounded-2xl p-5 hover:scale-[1.01] transition-transform duration-200 ${glow}`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-lg ${gradient}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  );
}

export function DashboardContent() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pipelineId, setPipelineId] = useState("");

  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (pipelineId) params.set("pipelineId", pipelineId);

  const { data: metrics, isLoading, error } = useQuery({
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

  const funnelOption = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "oklch(0.13 0.015 268)",
      borderColor: "oklch(1 0 0 / 8%)",
      textStyle: { color: "#e2e8f0" },
    },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category" as const,
      data: metrics?.funnel?.map((f: { stageName: string }) => f.stageName) ?? [],
      axisLabel: { color: "#94a3b8", fontSize: 11 },
      axisLine: { lineStyle: { color: "oklch(1 0 0 / 8%)" } },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: { color: "#94a3b8", fontSize: 11 },
      splitLine: { lineStyle: { color: "oklch(1 0 0 / 6%)" } },
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
      backgroundColor: "oklch(0.13 0.015 268)",
      borderColor: "oklch(1 0 0 / 8%)",
      textStyle: { color: "#e2e8f0" },
    },
    legend: {
      bottom: 0,
      textStyle: { color: "#94a3b8", fontSize: 11 },
    },
    series: [
      {
        type: "pie" as const,
        radius: ["40%", "65%"],
        center: ["50%", "45%"],
        itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: "transparent" },
        data:
          metrics?.distributionByStage?.map((d: { stageName: string; count: number; color: string }) => ({
            name: d.stageName,
            value: d.count,
            itemStyle: { color: d.color },
          })) ?? [],
      },
    ],
  };

  const leadSourceOption = {
    tooltip: {
      trigger: "item",
      backgroundColor: "oklch(0.13 0.015 268)",
      borderColor: "oklch(1 0 0 / 8%)",
      textStyle: { color: "#e2e8f0" },
    },
    legend: {
      right: 0,
      top: "center",
      orient: "vertical" as const,
      textStyle: { color: "#94a3b8", fontSize: 11 },
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

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-full p-8">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex flex-1 items-center justify-center h-full p-8">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">Erro ao carregar métricas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral das suas métricas de vendas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-5">
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de oportunidades"
          value={String(metrics.totalOpportunities)}
          icon={<TrendingUp className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-violet-600 to-indigo-700"
          glow="hover:shadow-[0_0_20px_oklch(0.62_0.26_268/15%)]"
          sub="Oportunidades no funil"
        />
        <MetricCard
          title="Receita ganha"
          value={formatCurrency(metrics.revenueWon)}
          icon={<DollarSign className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-emerald-600 to-teal-700"
          glow="hover:shadow-[0_0_20px_oklch(0.7_0.19_162/15%)]"
          sub="Total convertido"
        />
        <MetricCard
          title="Taxa de conversão"
          value={`${metrics.conversionRate?.toFixed(1) ?? 0}%`}
          icon={<Target className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          glow="hover:shadow-[0_0_20px_oklch(0.78_0.20_85/15%)]"
          sub="Oportunidades fechadas"
        />
        <MetricCard
          title="Ticket médio"
          value={formatCurrency(metrics.averageTicket ?? 0)}
          icon={<BarChart3 className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-pink-600 to-rose-700"
          glow="hover:shadow-[0_0_20px_oklch(0.65_0.22_0/15%)]"
          sub="Valor médio por oportunidade"
        />
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Sales Velocity"
          value={formatCurrency(metrics.salesVelocity ?? 0)}
          icon={<Zap className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-cyan-600 to-blue-700"
          glow="hover:shadow-[0_0_20px_oklch(0.7_0.19_220/15%)]"
          sub="Receita gerada por mês"
        />
        <MetricCard
          title="Duração média do ciclo"
          value={formatDays(metrics.averageCycleDuration ?? 0)}
          icon={<Clock className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-purple-600 to-violet-700"
          glow="hover:shadow-[0_0_20px_oklch(0.6_0.24_300/15%)]"
          sub="Tempo médio para fechar"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-1">Funil de vendas</h2>
          <p className="text-xs text-muted-foreground mb-4">Oportunidades por estágio</p>
          <Chart option={funnelOption} />
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-1">Distribuição por estágio</h2>
          <p className="text-xs text-muted-foreground mb-4">Proporção de oportunidades</p>
          <Chart option={distributionOption} />
        </div>

        <div className="glass-card rounded-2xl p-6 md:col-span-2">
          <h2 className="text-sm font-semibold text-foreground mb-1">Lead Source</h2>
          <p className="text-xs text-muted-foreground mb-4">Origem dos seus leads</p>
          <Chart option={leadSourceOption} />
        </div>
      </div>
    </div>
  );
}
