"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import * as echarts from "echarts";
import Link from "next/link";
import { apiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface TikTokStatus {
  connected: boolean;
  advertiserId: string | null;
  availableAdvertiserIds: string[];
}

interface TikTokCampaign {
  campaignId: string;
  campaignName: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
}

interface TikTokOverview {
  days: number;
  advertiserId: string;
  summary: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversions: number;
  };
  timeseries: Array<{ date: string; spend: number; impressions: number; clicks: number }>;
  campaigns: TikTokCampaign[];
  errors: string[];
}

const fmt = (n: number, digits = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtInt = (n: number) => n.toLocaleString("pt-BR");

const fmtCurrency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function TikTokAdsPage() {
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const [days, setDays] = useState(30);
  const [advertiserInput, setAdvertiserInput] = useState("");

  const { data: status, isLoading: statusLoading } = useQuery<TikTokStatus>({
    queryKey: ["tiktok-status"],
    queryFn: () =>
      fetch(`${API_URL}/ads/tiktok/status`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : { connected: false, advertiserId: null, availableAdvertiserIds: [] },
      ),
  });

  const { data: overview, isLoading: overviewLoading, refetch } = useQuery<TikTokOverview>({
    queryKey: ["tiktok-overview", days],
    queryFn: () =>
      fetch(`${API_URL}/ads/tiktok/overview?days=${days}`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : null,
      ),
    enabled: status?.connected === true,
  });

  const setAdvertiserMutation = useMutation({
    mutationFn: (advertiserId: string) =>
      fetch(`${API_URL}/ads/tiktok/config`, {
        method: "PUT",
        headers: apiHeaders,
        body: JSON.stringify({ advertiserId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiktok-status"] });
      queryClient.invalidateQueries({ queryKey: ["tiktok-overview"] });
      setAdvertiserInput("");
    },
  });

  // Build chart
  useEffect(() => {
    if (!chartRef.current || !overview?.timeseries?.length) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    const chart = chartInstance.current;

    const textColor = isDark ? "#a1a1aa" : "#52525b";
    const gridColor = isDark ? "#27272a" : "#e4e4e7";
    const areaColor = isDark
      ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(99,102,241,0.3)" },
          { offset: 1, color: "rgba(99,102,241,0)" },
        ])
      : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(99,102,241,0.15)" },
          { offset: 1, color: "rgba(99,102,241,0)" },
        ]);

    chart.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        formatter: (params: echarts.DefaultLabelFormatterCallbackParams[]) => {
          const p = params[0];
          const d = overview.timeseries[p.dataIndex as number];
          return `<b>${d.date}</b><br/>Gasto: ${fmtCurrency(d.spend)}<br/>Impressões: ${fmtInt(d.impressions)}<br/>Cliques: ${fmtInt(d.clicks)}`;
        },
      },
      grid: { top: 16, right: 8, bottom: 40, left: 64 },
      xAxis: {
        type: "category",
        data: overview.timeseries.map((p) => p.date.slice(5)),
        axisLabel: { color: textColor, fontSize: 11 },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: textColor,
          fontSize: 11,
          formatter: (v: number) => (v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`),
        },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          type: "line",
          data: overview.timeseries.map((p) => p.spend),
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#6366f1", width: 2 },
          areaStyle: { color: areaColor },
        },
      ],
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, [overview, isDark]);

  if (statusLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="size-7 text-indigo-400" />
            TikTok Ads
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Métricas de campanhas diretamente do TikTok for Business
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/app/integrations">
              <ExternalLink className="size-3.5" />
              Integrações
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href="https://ads.tiktok.com/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              TikTok Ads Manager
            </a>
          </Button>
        </div>
      </div>

      {/* Not connected */}
      {!status?.connected && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">TikTok Ads não conectado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Em Integrações, clique em Conectar no card TikTok Ads e conclua o OAuth com sua conta
              TikTok for Business.
            </p>
            <Button asChild className="mt-3" size="sm">
              <Link href="/app/integrations">Ir para Integrações</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Connected */}
      {status?.connected && (
        <>
          {/* Status bar */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              Conectado
              {status.advertiserId && (
                <span className="text-muted-foreground text-xs">
                  — Advertiser ID:{" "}
                  <code className="text-foreground">{status.advertiserId}</code>
                </span>
              )}
            </div>
            {status.availableAdvertiserIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                IDs disponíveis:{" "}
                <code className="text-foreground">
                  {status.availableAdvertiserIds.join(", ")}
                </code>
              </p>
            )}
          </div>

          {/* Advertiser config */}
          {!status.advertiserId && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="font-semibold text-foreground mb-1">Selecionar Advertiser ID</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Informe o Advertiser ID da conta para consultar métricas.
                {status.availableAdvertiserIds.length > 0
                  ? ` Disponíveis: ${status.availableAdvertiserIds.join(", ")}`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Ex.: 7000000000000000000"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm w-56"
                  value={advertiserInput}
                  onChange={(e) => setAdvertiserInput(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={setAdvertiserMutation.isPending || !advertiserInput.trim()}
                  onClick={() => setAdvertiserMutation.mutate(advertiserInput.trim())}
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}

          {/* Period + refresh */}
          {status.advertiserId && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {[7, 14, 30, 60, 90].map((d) => (
                  <Button
                    key={d}
                    variant={days === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDays(d)}
                  >
                    {d}d
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 ml-auto"
                  onClick={() => refetch()}
                  disabled={overviewLoading}
                >
                  <RefreshCw className={`size-3.5 ${overviewLoading ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
              </div>

              {overviewLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                  <Loader2 className="size-4 animate-spin" />
                  Carregando métricas…
                </div>
              ) : overview ? (
                <>
                  {/* Summary metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[
                      { label: "Gasto total", value: fmtCurrency(overview.summary.spend) },
                      { label: "Impressões", value: fmtInt(overview.summary.impressions) },
                      { label: "Cliques", value: fmtInt(overview.summary.clicks) },
                      { label: "CTR", value: `${fmt(overview.summary.ctr)}%` },
                      { label: "CPC médio", value: fmtCurrency(overview.summary.cpc) },
                      { label: "CPM", value: fmtCurrency(overview.summary.cpm) },
                      { label: "Conversões", value: fmtInt(overview.summary.conversions) },
                    ].map((m) => (
                      <div key={m.label} className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                        <p className="text-xl font-bold text-foreground mt-1">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Daily spend chart */}
                  {overview.timeseries.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <h2 className="font-semibold text-foreground mb-3">Gasto diário</h2>
                      <div ref={chartRef} className="h-56 w-full" />
                    </div>
                  )}

                  {/* Campaigns table */}
                  {overview.campaigns.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <h2 className="font-semibold text-foreground mb-3">
                        Top campanhas — últimos {days} dias
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-muted-foreground border-b border-border">
                              <th className="text-left pb-2 font-medium">Campanha</th>
                              <th className="text-right pb-2 font-medium">Gasto</th>
                              <th className="text-right pb-2 font-medium">Impr.</th>
                              <th className="text-right pb-2 font-medium">Cliques</th>
                              <th className="text-right pb-2 font-medium">CTR</th>
                              <th className="text-right pb-2 font-medium">CPC</th>
                              <th className="text-right pb-2 font-medium">Conv.</th>
                              <th className="text-right pb-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {overview.campaigns.map((c) => (
                              <tr key={c.campaignId} className="hover:bg-muted/30">
                                <td className="py-2 pr-4 max-w-[180px] truncate text-foreground">
                                  {c.campaignName}
                                </td>
                                <td className="py-2 text-right tabular-nums">
                                  {fmtCurrency(c.spend)}
                                </td>
                                <td className="py-2 text-right tabular-nums text-muted-foreground">
                                  {fmtInt(c.impressions)}
                                </td>
                                <td className="py-2 text-right tabular-nums text-muted-foreground">
                                  {fmtInt(c.clicks)}
                                </td>
                                <td className="py-2 text-right tabular-nums">
                                  {fmt(c.ctr)}%
                                </td>
                                <td className="py-2 text-right tabular-nums text-muted-foreground">
                                  {fmtCurrency(c.cpc)}
                                </td>
                                <td className="py-2 text-right tabular-nums">
                                  {fmtInt(c.conversions)}
                                </td>
                                <td className="py-2 text-right">
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                      c.status === "CAMPAIGN_STATUS_ENABLE"
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {c.status === "CAMPAIGN_STATUS_ENABLE" ? "Ativa" : "Pausada"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {overview.errors.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                      <p className="font-medium mb-1">Avisos</p>
                      {overview.errors.map((e, i) => (
                        <p key={i} className="text-xs">
                          {e}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Change advertiser */}
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h2 className="font-semibold text-foreground mb-2">Trocar Advertiser ID</h2>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        placeholder="Novo Advertiser ID"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm w-56"
                        value={advertiserInput}
                        onChange={(e) => setAdvertiserInput(e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={setAdvertiserMutation.isPending || !advertiserInput.trim()}
                        onClick={() => setAdvertiserMutation.mutate(advertiserInput.trim())}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
