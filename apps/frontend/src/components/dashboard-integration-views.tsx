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
  LayoutDashboard,
  BarChart3,
  Megaphone,
  Building2,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Settings2,
} from "lucide-react";

export type DashboardViewId = "main" | "analytics" | "ads" | "business";

const STORAGE_KEY = "aureon-dashboard-view";

export function getStoredDashboardView(): DashboardViewId {
  if (typeof window === "undefined") return "main";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "analytics" || v === "ads" || v === "business") return v;
  return "main";
}

export function setStoredDashboardView(v: DashboardViewId) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, v);
}

export function DashboardViewSwitcher({
  value,
  onChange,
}: {
  value: DashboardViewId;
  onChange: (v: DashboardViewId) => void;
}) {
  const tabs: { id: DashboardViewId; label: string; icon: React.ReactNode }[] = [
    { id: "main", label: "Principal", icon: <LayoutDashboard className="size-3.5" /> },
    { id: "analytics", label: "Google Analytics", icon: <BarChart3 className="size-3.5" /> },
    { id: "ads", label: "Google Ads", icon: <Megaphone className="size-3.5" /> },
    { id: "business", label: "Business Profile", icon: <Building2 className="size-3.5" /> },
  ];
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card/50 p-1.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            onChange(t.id);
            setStoredDashboardView(t.id);
          }}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
            value === t.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
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

function truncatePath(path: string, max = 32): string {
  if (!path) return "";
  if (path.length <= max) return path;
  return path.slice(0, max - 1) + "…";
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
  errors?: string[];
  error?: string;
}

function useGaChart(
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

export function DashboardGoogleAnalyticsView() {
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const chartTheme = resolvedTheme === "dark" ? "dark" : "light";
  const axisColor = chartTheme === "dark" ? "#94a3b8" : "#64748b";
  const splitColor =
    chartTheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const [reportDays, setReportDays] = useState(30);

  const { data: status } = useQuery({
    queryKey: ["ga-status"],
    queryFn: () =>
      fetch(`${API_URL}/analytics/google/status`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : { connected: false, propertyId: null },
      ),
  });

  const { data: summaries } = useQuery({
    queryKey: ["ga-account-summaries"],
    queryFn: () =>
      fetch(`${API_URL}/analytics/google/account-summaries`, { headers: apiHeaders }).then(
        (r) => r.json(),
      ),
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

  const timeseriesOption = useMemo((): echarts.EChartsOption | null => {
    const pts = overview?.timeseries?.points;
    if (!pts?.length) return null;
    const dates = pts.map((p) => formatGaDate(p.date));
    return {
      tooltip: { trigger: "axis" },
      legend: {
        data: ["Sessões", "Usuários", "Views", "Eventos"],
        textStyle: { color: axisColor, fontSize: 10 },
      },
      grid: { left: 44, right: 16, top: 36, bottom: 24 },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: axisColor, rotate: 35, fontSize: 9 },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: axisColor, fontSize: 9 },
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
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 100, right: 16, top: 8, bottom: 8 },
      xAxis: {
        type: "value",
        axisLabel: { color: axisColor, fontSize: 9 },
        splitLine: { lineStyle: { color: splitColor } },
      },
      yAxis: {
        type: "category",
        data: rows.map((r) => r.channel),
        axisLabel: { color: axisColor, fontSize: 10 },
      },
      series: [
        {
          name: "Sessões",
          type: "bar",
          data: rows.map((r) => r.sessions),
          itemStyle: { color: "#f59e0b", borderRadius: [0, 4, 4, 0] },
        },
      ],
    };
  }, [overview?.channels, axisColor, splitColor]);

  const countriesOption = useMemo((): echarts.EChartsOption | null => {
    const rows = overview?.countries?.rows;
    if (!rows?.length) return null;
    return {
      tooltip: { trigger: "item" },
      series: [
        {
          name: "Sessões",
          type: "pie",
          radius: ["38%", "62%"],
          label: { color: axisColor, fontSize: 9 },
          data: rows.map((r) => ({
            name: r.country || "(desconhecido)",
            value: r.sessions,
          })),
        },
      ],
    };
  }, [overview?.countries, axisColor]);

  const topPagesOption = useMemo((): echarts.EChartsOption | null => {
    const rows = overview?.topPages?.rows;
    if (!rows?.length) return null;
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 4, right: 40, top: 8, bottom: 4 },
      xAxis: {
        type: "value",
        axisLabel: { color: axisColor, fontSize: 9 },
        splitLine: { lineStyle: { color: splitColor } },
      },
      yAxis: {
        type: "category",
        data: rows.map((r) => truncatePath(r.pagePath, 28)),
        axisLabel: { color: axisColor, fontSize: 9 },
        inverse: true,
      },
      series: [
        {
          name: "Views",
          type: "bar",
          data: rows.map((r) => r.views),
          itemStyle: { color: "#8b5cf6", borderRadius: [0, 4, 4, 0] },
        },
      ],
    };
  }, [overview?.topPages, axisColor, splitColor]);

  const lineRef = useGaChart(timeseriesOption, chartTheme);
  const channelsRef = useGaChart(channelsOption, chartTheme);
  const countriesRef = useGaChart(countriesOption, chartTheme);
  const pagesRef = useGaChart(topPagesOption, chartTheme);

  const summary = overview?.summary;

  if (!status?.connected) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
        <AlertCircle className="size-5 text-amber-500 shrink-0" />
        <div>
          <p className="font-medium">Google Analytics não conectado</p>
          <Button asChild size="sm" className="mt-2">
            <Link href="/app/integrations">Integrações</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="size-4" />
          GA4
          {status.propertyId && (
            <code className="text-xs text-muted-foreground">{status.propertyId}</code>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 14, 30, 90].map((d) => (
            <Button
              key={d}
              type="button"
              variant={reportDays === d ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setReportDays(d)}
            >
              {d}d
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["ga-overview"] })
            }
          >
            <RefreshCw className="size-3" />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/analytics/google" className="gap-1">
              <ExternalLink className="size-3" />
              Página completa
            </Link>
          </Button>
        </div>
      </div>

      {status.propertyId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPropertyPickerOpen((o) => !o)}
        >
          <Settings2 className="size-3 mr-1" />
          {propertyPickerOpen ? "Fechar" : "Trocar propriedade"}
        </Button>
      )}

      {propertyPickerOpen && summaries?.accountSummaries && (
        <div className="rounded-xl border border-border p-3 space-y-2">
          {summaries.accountSummaries.map(
            (acc: { displayName?: string; propertySummaries?: { displayName?: string; property?: string }[] }, i: number) => (
              <div key={i}>
                <p className="text-xs text-muted-foreground">{acc.displayName}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {acc.propertySummaries?.map((p, j) => (
                    <Button
                      key={j}
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      disabled={setPropertyMutation.isPending}
                      onClick={() => p.property && setPropertyMutation.mutate(p.property)}
                    >
                      {p.displayName ?? p.property}
                    </Button>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {overview?.errors && overview.errors.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {overview.errors.join("; ")}
        </p>
      )}

      {status.propertyId && overviewLoading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="size-4 animate-spin" />
          Carregando métricas…
        </div>
      )}

      {status.propertyId && summary && !overviewLoading && (
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-background/50 p-2">
            <p className="text-[10px] text-muted-foreground">Sessões</p>
            <p className="text-lg font-semibold">{summary.sessions.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-2">
            <p className="text-[10px] text-muted-foreground">Usuários</p>
            <p className="text-lg font-semibold">{summary.totalUsers.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-2">
            <p className="text-[10px] text-muted-foreground">Views</p>
            <p className="text-lg font-semibold">{summary.screenPageViews.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-2">
            <p className="text-[10px] text-muted-foreground">Eventos</p>
            <p className="text-lg font-semibold">{summary.eventCount.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-2">
            <p className="text-[10px] text-muted-foreground">Novos</p>
            <p className="text-lg font-semibold">{summary.newUsers.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-2">
            <p className="text-[10px] text-muted-foreground">Duração méd.</p>
            <p className="text-lg font-semibold">
              {formatDuration(summary.averageSessionDuration)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-2">
            <p className="text-[10px] text-muted-foreground">Engajamento</p>
            <p className="text-lg font-semibold">
              {summary.engagementRate > 0
                ? `${(summary.engagementRate * 100).toFixed(0)}%`
                : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-2">
            <p className="text-[10px] text-muted-foreground">Período</p>
            <p className="text-lg font-semibold text-muted-foreground">{reportDays}d</p>
          </div>
        </div>
      )}

      {timeseriesOption && (
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground mb-1">Evolução diária</p>
          <div ref={lineRef} className="h-[220px] w-full min-h-[220px]" />
        </div>
      )}

      {(channelsOption || countriesOption) && (
        <div className="grid gap-3 md:grid-cols-2">
          {channelsOption && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">Por canal</p>
              <div ref={channelsRef} className="h-[220px] w-full min-h-[220px]" />
            </div>
          )}
          {countriesOption && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">Por país</p>
              <div ref={countriesRef} className="h-[220px] w-full min-h-[220px]" />
            </div>
          )}
        </div>
      )}

      {overview?.geoMap?.rows && overview.geoMap.rows.length > 0 && (
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground mb-1">
            Mapa por país (sessões)
          </p>
          <GaWorldMap
            rows={overview.geoMap.rows}
            regionRows={overview.regions?.rows}
            theme={chartTheme}
            height={280}
          />
        </div>
      )}

      {topPagesOption && (
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground mb-1">Top páginas (views)</p>
          <div
            ref={pagesRef}
            className="w-full min-h-[240px]"
            style={{
              height: Math.max(240, (overview?.topPages?.rows?.length ?? 0) * 22),
            }}
          />
        </div>
      )}
    </div>
  );
}

export function DashboardGoogleAdsView() {
  const { data: status } = useQuery({
    queryKey: ["google-ads-status"],
    queryFn: () =>
      fetch(`${API_URL}/ads/google/status`, { headers: apiHeaders }).then((r) =>
        r.ok
          ? r.json()
          : { connected: false },
      ),
  });
  if (!status?.connected) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <AlertCircle className="size-5 text-amber-500 inline mr-2" />
        <span className="text-sm">Google Ads não conectado.</span>
        <Button asChild size="sm" className="ml-2">
          <Link href="/app/integrations">Integrações</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-emerald-400 text-sm">
        <CheckCircle2 className="size-4" />
        Conectado
        {status.customerId && (
          <code className="text-xs text-muted-foreground">customer {status.customerId}</code>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Campanhas e métricas no painel oficial.
      </p>
      <div className="flex gap-2">
        <Button asChild size="sm">
          <a href="https://ads.google.com/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3 mr-1" />
            Abrir Google Ads
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/ads/google">Página completa</Link>
        </Button>
      </div>
    </div>
  );
}

export function DashboardBusinessProfileView() {
  const { data: status } = useQuery({
    queryKey: ["gbp-status"],
    queryFn: () =>
      fetch(`${API_URL}/business/google/status`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : { connected: false },
      ),
  });
  if (!status?.connected) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <AlertCircle className="size-5 text-amber-500 inline mr-2" />
        <span className="text-sm">Business Profile não conectado.</span>
        <Button asChild size="sm" className="ml-2">
          <Link href="/app/integrations">Integrações</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-emerald-400 text-sm">
        <CheckCircle2 className="size-4" />
        Conectado
      </div>
      <p className="text-sm text-muted-foreground">
        Perfil, avaliações e insights em business.google.com
      </p>
      <div className="flex gap-2">
        <Button asChild size="sm">
          <a href="https://business.google.com/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3 mr-1" />
            Abrir Business Profile
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/business/google">Página completa</Link>
        </Button>
      </div>
    </div>
  );
}
