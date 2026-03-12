"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { countryToCoord } from "@/data/country-centroids";
import {
  regionToCoord,
  type RegionRow,
} from "@/data/region-centroids";

const WORLD_JSON_URL =
  "https://raw.githubusercontent.com/apache/echarts/master/test/data/map/json/world.json";

export interface GeoMapRow {
  country: string;
  sessions: number;
}

export function GaWorldMap({
  rows,
  regionRows,
  theme,
  height = 360,
}: {
  rows: GeoMapRow[];
  regionRows?: RegionRow[];
  theme: string;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) {
      setReady(true);
      return;
    }
    let cancelled = false;
    fetch(WORLD_JSON_URL)
      .then((r) => r.json())
      .then((geoJson) => {
        if (cancelled) return;
        try {
          echarts.registerMap("world", geoJson);
          registered.current = true;
          setReady(true);
        } catch {
          setReady(true);
        }
      })
      .catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ref.current || !ready || !rows.length) return;
    const chart = echarts.init(ref.current, theme);
    const maxCountry = Math.max(...rows.map((r) => r.sessions), 1);
    const regionPoints: Array<{
      name: string;
      value: [number, number, number];
    }> = [];
    if (regionRows?.length) {
      for (const r of regionRows) {
        if (!r.sessions || !r.region || r.region === "(not set)") continue;
        const coord = regionToCoord(r);
        if (coord)
          regionPoints.push({
            name: `${r.region} (${r.country})`,
            value: [coord[0], coord[1], r.sessions],
          });
      }
    }
    const maxRegion =
      regionPoints.length > 0
        ? Math.max(...regionPoints.map((p) => p.value[2]), 1)
        : 1;
    const maxSessions = Math.max(maxCountry, maxRegion);

    const mapData = rows
      .filter((r) => r.country && r.country !== "(not set)")
      .map((r) => ({ name: r.country, value: r.sessions }));

    const scatterCountry: Array<{ name: string; value: [number, number, number] }> =
      [];
    for (const r of rows) {
      if (!r.sessions || r.country === "(not set)") continue;
      const coord = countryToCoord(r.country);
      if (coord)
        scatterCountry.push({
          name: r.country,
          value: [coord[0], coord[1], r.sessions],
        });
    }

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (p: unknown) => {
          const params = p as {
            name?: string;
            value?: number | [number, number, number];
            data?: { name?: string; value?: number | [number, number, number] };
            seriesName?: string;
          };
          const name = params.name ?? params.data?.name ?? "";
          const v = params.data?.value ?? params.value;
          const val =
            Array.isArray(v) ? v[2] : typeof v === "number" ? v : 0;
          const label =
            params.seriesName?.includes("Estado") || name.includes("(")
              ? name
              : name;
          return `${label}<br/>Sessões: ${val}`;
        },
      },
      visualMap: {
        min: 0,
        max: maxSessions,
        text: ["Mais", "Menos"],
        realtime: true,
        calculable: true,
        inRange: {
          color: ["#312e81", "#6366f1", "#a5b4fc", "#f59e0b", "#fbbf24"],
        },
        textStyle: {
          color: theme === "dark" ? "#94a3b8" : "#64748b",
        },
        left: 16,
        bottom: 24,
      },
      geo: {
        map: "world",
        roam: true,
        scaleLimit: { min: 0.6, max: 12 },
        itemStyle: {
          areaColor: theme === "dark" ? "#1e293b" : "#e2e8f0",
          borderColor: theme === "dark" ? "#334155" : "#94a3b8",
        },
        emphasis: {
          itemStyle: { areaColor: "#6366f1" },
          label: { show: false },
        },
      },
      series: [
        {
          name: "Sessões (país)",
          type: "map",
          map: "world",
          geoIndex: 0,
          data: mapData,
          emphasis: { label: { show: false } },
        },
        {
          name: "Sessões (país)",
          type: "effectScatter",
          coordinateSystem: "geo",
          data: scatterCountry,
          symbolSize: ((
            _v: unknown,
            params: { data?: { value?: [number, number, number] } },
          ) => {
            const arr = params?.data?.value;
            const n = Array.isArray(arr) ? arr[2] ?? 0 : 0;
            return Math.max(6, Math.min(26, 8 + (n / maxSessions) * 18));
          }) as (v: unknown, p: unknown) => number,
          showEffectOn: "render",
          rippleEffect: { brushType: "stroke", scale: 2.5 },
          itemStyle: { color: "#f59e0b", shadowBlur: 6 },
          zlevel: 1,
        },
        ...(regionPoints.length
          ? [
              {
                name: "Sessões (estado/região)",
                type: "effectScatter" as const,
                coordinateSystem: "geo" as const,
                data: regionPoints,
                symbolSize: ((
                  _v: unknown,
                  params: { data?: { value?: [number, number, number] } },
                ) => {
                  const arr = params?.data?.value;
                  const n = Array.isArray(arr) ? arr[2] ?? 0 : 0;
                  return Math.max(8, Math.min(32, 10 + (n / maxSessions) * 22));
                }) as (v: unknown, p: unknown) => number,
                showEffectOn: "render" as const,
                rippleEffect: { brushType: "stroke" as const, scale: 2 },
                itemStyle: { color: "#22d3ee", shadowBlur: 10 },
                label: {
                  show: true,
                  formatter: (p: { name?: string }) => p.name?.split(" (")[0] ?? "",
                  color: theme === "dark" ? "#e2e8f0" : "#1e293b",
                  fontSize: 10,
                },
                zlevel: 2,
              },
            ]
          : []),
      ],
    };

    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [ready, rows, regionRows, theme]);

  if (!rows.length) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">
        Sem dados geográficos no período.
      </p>
    );
  }

  return (
    <div className="relative">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Carregando mapa…
        </div>
      )}
      <p className="text-xs text-muted-foreground mb-2">
        País: cor na malha e bolhas laranja. Estado (Brasil): bolhas ciano com
        rótulo — dê zoom no país para ver.
      </p>
      <div
        ref={ref}
        style={{ height, width: "100%" }}
        className="min-h-[280px] rounded-lg"
      />
    </div>
  );
}
