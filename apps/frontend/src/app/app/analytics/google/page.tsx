"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import * as echarts from "echarts";
import Link from "next/link";
import { apiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { GaWorldMap } from "@/components/ga-world-map";
import {
  BarChart3,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Settings2,
} from "lucide-react";

interface GaStatus {
  connected: boolean;
  propertyId: string | null;
}

interface AccountSummaries {
  accountSummaries?: Array<{
    displayName?: string;
    propertySummaries?: Array<{
      displayName?: string;
      property?: string;
    }>;
  }>;
  error?: string;
}

interface GaOverviewSummary {
  sessions: number;
  totalUsers: number;
  newUsers: number;
  screenPageViews: number;
  eventCount: number;
  averageSessionDuration: number;
  engagementRate: number;
}

interface GaOverviewTimeseriesPoint {
  date: string;
  sessions: number;
  users: number;
  screenPageViews: number;
  eventCount: number;
}

interface GaOverview {
  days: number;
  summary?: GaOverviewSummary;
  timeseries?: { points: GaOverviewTimeseriesPoint[] };
  channels?: {
    rows: Array<{ channel: string; sessions: number; users: number }>;
  };
  topPages?: {
    rows: Array<{ pagePath: string; views: number; sessions: number }>;
  };
  countries?: { rows: Array<{ country: string; sessions: number }> };
  geoMap?: { rows: Array<{ country: string; sessions: number }> };
  regions?: {
    rows: Array<{ region: string; country: string; sessions: number }>;
  };
  cities?: {
    rows: Array<{
      city: string;
      region: string;
      country: string;
      sessions: number;
    }>;
  };
  errors?: string[];
  error?: string;
}

function formatGaDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}`;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function truncatePath(path: string, max = 42): string {
  if (!path) return "";
  if (path.length <= max) return path;
  return path.slice(0, max - 1) + "…";
}

function useEchartsOption(
  option: echarts.EChartsOption | null,
  theme: string,
) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !option) return;
    const chart = echarts.init(ref.current, theme);
    chart.setOption({ backgroundColor: "transparent", ...option });
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [option, theme]);
  return ref;
}

export default function GoogleAnalyticsPage() {
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const chartTheme = resolvedTheme === "dark" ? "dark" : "light";
  const axisColor = chartTheme === "dark" ? "#94a3b8" : "#64748b";
  const splitColor =
    chartTheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const [reportDays, setReportDays] = useState(30);

  const { data: status, isLoading: statusLoading } = useQuery<GaStatus>({
    queryKey: ["ga-status"],
    queryFn: () =>
      fetch(`${API_URL}/analytics/google/status`, { headers: apiHeaders }).then(
        (r) => (r.ok ? r.json() : { connected: false, propertyId: null }),
      ),
  });

  const { data: summaries, isLoading: summariesLoading } =
    useQuery<AccountSummaries>({
      queryKey: ["ga-account-summaries"],
      queryFn: () =>
        fetch(`${API_URL}/analytics/google/account-summaries`, {
          headers: apiHeaders,
        }).then((r) => r.json()),
      enabled: Boolean(status?.connected),
    });

  const { data: overview, isLoading: overviewLoading } = useQuery<GaOverview>({
    queryKey: ["ga-overview", status?.propertyId, reportDays],
    queryFn: () =>
      fetch(
        `${API_URL}/analytics/google/overview?days=${reportDays}`,
        { headers: apiHeaders },
      ).then((r) => r.json()),
    enabled: Boolean(status?.connected && status?.propertyId),
  });

  const setPropertyMutation = useMutation({
    mutationFn: (propertyId: string) =>
      fetch(`${API_URL}/analytics/google/config`, {
        method: "PUT",
        headers: apiHeaders,
        body: JSON.stringify({ propertyId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      setPropertyPickerOpen(false);
      queryClient.invalidateQueries({ queryKey: ["ga-status"] });
      queryClient.invalidateQueries({ queryKey: ["ga-overview"] });
    },
  });

  const connected = status?.connected;
  const hasError =
    summaries && "error" in summaries && summaries.error;
  const overviewError =
    overview && ("error" in overview && overview.error) ||
    (overview?.errors && overview.errors.length > 0);

  const timeseriesOption = useMemo((): echarts.EChartsOption | null => {
    const pts = overview?.timeseries?.points;
    if (!pts?.length) return null;
    const dates = pts.map((p) => formatGaDate(p.date));
    return {
      tooltip: { trigger: "axis" },
      legend: {
        data: ["Sessões", "Usuários", "Views", "Eventos"],
        textStyle: { color: axisColor },
      },
      grid: { left: 48, right: 24, top: 44, bottom: 28 },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: axisColor, rotate: 40, fontSize: 10 },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: axisColor },
        splitLine: { lineStyle: { color: splitColor } },
      },
      series: [
        {
          name: "Sessões",
          type: "line",
          smooth: true,
          data: pts.map((p) => p.sessions),
          itemStyle: { color: "#f59e0b" },
        },
        {
          name: "Usuários",
          type: "line",
          smooth: true,
          data: pts.map((p) => p.users),
          itemStyle: { color: "#8b5cf6" },
        },
        {
          name: "Views",
          type: "line",
          smooth: true,
          data: pts.map((p) => p.screenPageViews),
          itemStyle: { color: "#06b6d4" },
        },
        {
          name: "Eventos",
          type: "line",
          smooth: true,
          data: pts.map((p) => p.eventCount),
          itemStyle: { color: "#22c55e" },
        },
      ],
    };
  }, [overview?.timeseries, axisColor, splitColor]);

  const channelsOption = useMemo((): echarts.EChartsOption | null => {
    const rows = overview?.channels?.rows;
    if (!rows?.length) return null;
    const names = rows.map((r) => r.channel);
    const values = rows.map((r) => r.sessions);
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 120, right: 24, top: 16, bottom: 24 },
      xAxis: {
        type: "value",
        axisLabel: { color: axisColor },
        splitLine: { lineStyle: { color: splitColor } },
      },
      yAxis: {
        type: "category",
        data: names,
        axisLabel: { color: axisColor, fontSize: 11 },
      },
      series: [
        {
          name: "Sessões",
          type: "bar",
          data: values,
          itemStyle: { color: "#f59e0b", borderRadius: [0, 4, 4, 0] },
        },
      ],
    };
  }, [overview?.channels, axisColor, splitColor]);

  const topPagesOption = useMemo((): echarts.EChartsOption | null => {
    const rows = overview?.topPages?.rows;
    if (!rows?.length) return null;
    const names = rows.map((r) => truncatePath(r.pagePath, 36));
    const values = rows.map((r) => r.views);
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 8, right: 48, top: 16, bottom: 8 },
      xAxis: {
        type: "value",
        axisLabel: { color: axisColor },
        splitLine: { lineStyle: { color: splitColor } },
      },
      yAxis: {
        type: "category",
        data: names,
        axisLabel: { color: axisColor, fontSize: 10 },
        inverse: true,
      },
      series: [
        {
          name: "Views",
          type: "bar",
          data: values,
          itemStyle: { color: "#8b5cf6", borderRadius: [0, 4, 4, 0] },
        },
      ],
    };
  }, [overview?.topPages, axisColor, splitColor]);

  const countriesOption = useMemo((): echarts.EChartsOption | null => {
    const rows = overview?.countries?.rows;
    if (!rows?.length) return null;
    return {
      tooltip: { trigger: "item" },
      series: [
        {
          name: "Sessões",
          type: "pie",
          radius: ["40%", "68%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6 },
          label: { color: axisColor, fontSize: 10 },
          data: rows.map((r) => ({
            name: r.country || "(desconhecido)",
            value: r.sessions,
          })),
        },
      ],
    };
  }, [overview?.countries, axisColor]);

  const lineRef = useEchartsOption(timeseriesOption, chartTheme);
  const channelsRef = useEchartsOption(channelsOption, chartTheme);
  const pagesRef = useEchartsOption(topPagesOption, chartTheme);
  const countriesRef = useEchartsOption(countriesOption, chartTheme);

  const summary = overview?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="size-7 text-amber-500" />
            Google Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            GA4: sessões, usuários, views, eventos, canais, páginas, países e mapa
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/app/integrations">
            <ExternalLink className="size-3.5" />
            Integrações
          </Link>
        </Button>
      </div>

      {statusLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando status…
        </div>
      ) : !connected ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              Google Analytics não conectado
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte em Integrações com a mesma conta que tem acesso à
              propriedade GA4.
            </p>
            <Button asChild className="mt-3" size="sm">
              <Link href="/app/integrations">Ir para Integrações</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 flex flex-wrap items-center gap-3 text-emerald-400 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Conectado</span>
              {status?.propertyId && !propertyPickerOpen && (
                <span className="text-muted-foreground truncate">
                  ·{" "}
                  <code className="text-foreground">{status.propertyId}</code>
                </span>
              )}
            </div>
            {status?.propertyId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:text-emerald-100"
                onClick={() => {
                  setPropertyPickerOpen((o) => !o);
                  if (!propertyPickerOpen) {
                    queryClient.invalidateQueries({
                      queryKey: ["ga-account-summaries"],
                    });
                  }
                }}
              >
                <Settings2 className="size-3.5 mr-1.5" />
                {propertyPickerOpen ? "Fechar" : "Trocar propriedade"}
              </Button>
            )}
          </div>

          {(!status?.propertyId || propertyPickerOpen) && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="font-semibold text-foreground mb-2">
                {status?.propertyId
                  ? "Escolher outra propriedade GA4"
                  : "Escolher propriedade GA4"}
              </h2>
              {status?.propertyId && (
                <p className="text-xs text-muted-foreground mb-3">
                  Atual: <code>{status.propertyId}</code> — clique em outra para
                  trocar.
                </p>
              )}
              {summariesLoading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : hasError ? (
                <p className="text-sm text-destructive">
                  {String(summaries.error)} — ative as APIs Google Analytics
                  Admin e Data no Cloud Console.
                </p>
              ) : (
                <ul className="space-y-3">
                  {summaries?.accountSummaries?.map((acc, i) => (
                    <li key={i}>
                      <p className="text-xs text-muted-foreground mb-1">
                        {acc.displayName ?? "Conta"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {acc.propertySummaries?.map((p, j) => {
                          const isCurrent =
                            p.property === status?.propertyId ||
                            p.property ===
                              status?.propertyId?.replace(
                                /^properties\//,
                                "",
                              );
                          return (
                            <Button
                              key={j}
                              variant={isCurrent ? "default" : "secondary"}
                              size="sm"
                              disabled={setPropertyMutation.isPending}
                              onClick={() =>
                                p.property &&
                                setPropertyMutation.mutate(p.property)
                              }
                            >
                              {p.displayName ?? p.property}
                              {isCurrent ? " (atual)" : ""}
                            </Button>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {status?.propertyId && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="font-semibold text-foreground">
                    Últimos {reportDays} dias
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-1">
                      Período:
                    </span>
                    {[7, 14, 30, 90].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant={reportDays === d ? "default" : "outline"}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => setReportDays(d)}
                      >
                        {d}d
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={() =>
                        queryClient.invalidateQueries({
                          queryKey: ["ga-overview"],
                        })
                      }
                    >
                      <RefreshCw className="size-3.5" />
                      Atualizar
                    </Button>
                  </div>
                </div>

                {overview?.errors && overview.errors.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 mb-4">
                    Alguns blocos falharam (API/propriedade):{" "}
                    {overview.errors.join("; ")}
                  </div>
                )}

                {overviewLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-8">
                    <Loader2 className="size-5 animate-spin" />
                    Carregando métricas…
                  </div>
                ) : overviewError && !summary ? (
                  <p className="text-sm text-destructive">
                    {overview?.error ||
                      (overview?.errors && overview.errors[0]) ||
                      "Erro ao carregar overview"}
                  </p>
                ) : (
                  <>
                    {summary && (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiCard
                          label="Sessões"
                          value={summary.sessions.toLocaleString()}
                        />
                        <KpiCard
                          label="Usuários"
                          value={summary.totalUsers.toLocaleString()}
                        />
                        <KpiCard
                          label="Novos usuários"
                          value={summary.newUsers.toLocaleString()}
                        />
                        <KpiCard
                          label="Views (páginas)"
                          value={summary.screenPageViews.toLocaleString()}
                        />
                        <KpiCard
                          label="Eventos"
                          value={summary.eventCount.toLocaleString()}
                        />
                        <KpiCard
                          label="Duração média sessão"
                          value={formatDuration(
                            summary.averageSessionDuration,
                          )}
                        />
                        <KpiCard
                          label="Taxa de engajamento"
                          value={
                            summary.engagementRate > 0
                              ? `${(summary.engagementRate * 100).toFixed(1)}%`
                              : "—"
                          }
                        />
                        <KpiCard
                          label="Período"
                          value={`${reportDays} dias`}
                          muted
                        />
                      </div>
                    )}

                    {timeseriesOption && (
                      <div className="mt-6 rounded-xl border border-border bg-background/30 p-4">
                        <h3 className="text-sm font-medium text-foreground mb-2">
                          Evolução diária
                        </h3>
                        <div
                          ref={lineRef}
                          className="min-h-[300px] w-full"
                          style={{ height: 300 }}
                        />
                      </div>
                    )}

                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                      {channelsOption && (
                        <div className="rounded-xl border border-border bg-background/30 p-4">
                          <h3 className="text-sm font-medium text-foreground mb-2">
                            Sessões por canal
                          </h3>
                          <div
                            ref={channelsRef}
                            className="min-h-[280px] w-full"
                            style={{ height: 280 }}
                          />
                        </div>
                      )}
                      {countriesOption && (
                        <div className="rounded-xl border border-border bg-background/30 p-4">
                          <h3 className="text-sm font-medium text-foreground mb-2">
                            Sessões por país
                          </h3>
                          <div
                            ref={countriesRef}
                            className="min-h-[280px] w-full"
                            style={{ height: 280 }}
                          />
                        </div>
                      )}
                    </div>

                    {overview?.geoMap?.rows && overview.geoMap.rows.length > 0 && (
                      <div className="mt-6 rounded-xl border border-border bg-background/30 p-4">
                        <h3 className="text-sm font-medium text-foreground mb-2">
                          Mapa de sessões por local (país)
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          Mesmos dados geográficos do GA4; arraste e use scroll para
                          zoom. Bubbles nos países com coordenada conhecida reforçam
                          o volume quando o nome não casa com a malha do mapa.
                        </p>
                        <GaWorldMap
                          rows={overview.geoMap.rows}
                          regionRows={overview.regions?.rows}
                          theme={chartTheme}
                          height={400}
                        />
                      </div>
                    )}

                    {overview?.regions?.rows &&
                      overview.regions.rows.length > 0 && (
                        <div className="mt-6 rounded-xl border border-border bg-background/30 p-4">
                          <h3 className="text-sm font-medium text-foreground mb-2">
                            Estados / regiões com mais sessões
                          </h3>
                          <p className="text-xs text-muted-foreground mb-3">
                            Dimensão <code className="text-foreground">region</code> do
                            GA4 (estado ou província) com país para desambiguar.
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border text-left text-muted-foreground">
                                  <th className="py-2 pr-4">Estado / região</th>
                                  <th className="py-2 pr-4">País</th>
                                  <th className="py-2 text-right">Sessões</th>
                                </tr>
                              </thead>
                              <tbody>
                                {overview.regions.rows.map((row, i) => (
                                  <tr
                                    key={`${row.region}-${row.country}-${i}`}
                                    className="border-b border-border/60"
                                  >
                                    <td className="py-2 pr-4">
                                      {row.region || "—"}
                                    </td>
                                    <td className="py-2 pr-4 text-muted-foreground">
                                      {row.country || "—"}
                                    </td>
                                    <td className="py-2 text-right font-medium">
                                      {row.sessions.toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    {overview?.cities?.rows && overview.cities.rows.length > 0 && (
                      <div className="mt-6 rounded-xl border border-border bg-background/30 p-4">
                        <h3 className="text-sm font-medium text-foreground mb-2">
                          Cidades com mais sessões
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border text-left text-muted-foreground">
                                <th className="py-2 pr-4">Cidade</th>
                                <th className="py-2 pr-4">Estado / região</th>
                                <th className="py-2 pr-4">País</th>
                                <th className="py-2 text-right">Sessões</th>
                              </tr>
                            </thead>
                            <tbody>
                              {overview.cities.rows.map((row, i) => (
                                <tr
                                  key={`${row.city}-${row.region}-${row.country}-${i}`}
                                  className="border-b border-border/60"
                                >
                                  <td className="py-2 pr-4">{row.city || "—"}</td>
                                  <td className="py-2 pr-4 text-muted-foreground">
                                    {row.region || "—"}
                                  </td>
                                  <td className="py-2 pr-4 text-muted-foreground">
                                    {row.country || "—"}
                                  </td>
                                  <td className="py-2 text-right font-medium">
                                    {row.sessions.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {topPagesOption && (
                      <div className="mt-6 rounded-xl border border-border bg-background/30 p-4">
                        <h3 className="text-sm font-medium text-foreground mb-2">
                          Páginas com mais views
                        </h3>
                        <div
                          ref={pagesRef}
                          className="min-h-[320px] w-full"
                          style={{ height: Math.max(320, (overview?.topPages?.rows?.length ?? 0) * 28) }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-lg font-semibold mt-0.5 ${
          muted ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
