"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { apiHeaders, API_URL } from "@/lib/api";
import { MOCK_PIPELINE, MOCK_OPPORTUNITIES } from "@/lib/mock-data";
import { DraggableCard } from "./draggable-card";
import { DroppableStage } from "./droppable-stage";
import { LayoutGrid, List, ExternalLink } from "lucide-react";

interface Stage {
  id: string;
  name: string;
  order: number;
  color: string;
}

interface Pipeline {
  id: string;
  name: string;
  isDefault?: boolean;
  stages: Stage[];
}

interface Opportunity {
  id: string;
  title: string;
  value: number;
  stageId: string;
  contact?: { name: string };
  stage?: { name: string };
}

export function PipelineBoard() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  // Estado local para mover os cards imediatamente (optimistic update)
  const [localOpps, setLocalOpps] = useState<Opportunity[] | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const { data: pipelines, isLoading: loadingPipelines } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () =>
      fetch(`${API_URL}/pipelines`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const rawPipelineList = Array.isArray(pipelines) ? pipelines : [];
  // Fallback para mock se não há pipelines da API
  const pipelineList = rawPipelineList.length > 0 ? rawPipelineList : [MOCK_PIPELINE];
  const isMock = rawPipelineList.length === 0;

  const pipeline =
    pipelineList.find(
      (p: Pipeline) => p.id === selectedPipelineId || p.isDefault
    ) || pipelineList[0];
  const pipelineId = pipeline?.id || selectedPipelineId;

  const { data: opportunities } = useQuery({
    queryKey: ["opportunities", pipelineId],
    queryFn: () =>
      fetch(`${API_URL}/opportunities?pipelineId=${pipelineId}`, {
        headers: apiHeaders,
      }).then((r) => (r.ok ? r.json() : null)),
    enabled: !!pipelineId && !isMock,
  });

  const moveMutation = useMutation({
    mutationFn: async ({ oppId, stageId }: { oppId: string; stageId: string }) =>
      fetch(`${API_URL}/opportunities/${oppId}/stage`, {
        method: "PUT",
        headers: apiHeaders,
        body: JSON.stringify({ stageId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });

  // Sincroniza estado local quando a query retorna dados novos
  useEffect(() => {
    if (Array.isArray(opportunities)) {
      setLocalOpps(opportunities);
    }
  }, [opportunities]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const oppId = active.id as string;
    const droppableId = over.id as string;
    if (!droppableId.startsWith("stage-")) return;

    const realStageId = droppableId.replace("stage-", "");

    // Atualiza o estado local imediatamente (optimistic)
    setLocalOpps((prev) => {
      const base = prev ?? oppsFromQuery;
      return base.map((o) =>
        o.id === oppId ? { ...o, stageId: realStageId } : o
      );
    });

    // Persiste na API somente se não for mock
    if (!isMock) {
      moveMutation.mutate({ oppId, stageId: realStageId });
    }
  }

  // Oportunidades da query (sem estado local)
  const oppsFromQuery = Array.isArray(opportunities)
    ? opportunities
    : isMock
    ? MOCK_OPPORTUNITIES
    : [];

  // Usa o estado local quando disponível (após primeiro render ou após drag)
  const opps: Opportunity[] = localOpps ?? oppsFromQuery;
  const stages = pipeline?.stages || [];
  const activeOpp = activeId ? opps.find((o: Opportunity) => o.id === activeId) : null;

  if (loadingPipelines || !pipeline) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="min-w-[272px] h-64 glass-card rounded-xl animate-pulse opacity-40"
          />
        ))}
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="glass-card rounded-2xl py-16 flex flex-col items-center gap-4 text-center">
        <p className="text-muted-foreground text-sm">
          Nenhum estágio no pipeline. Execute o seed e crie um pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={pipelineId || ""}
            onChange={(e) => setSelectedPipelineId(e.target.value || null)}
            className="h-9 appearance-none rounded-xl border border-border bg-background/50 pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer"
          >
            {pipelineList.map((p: Pipeline) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <Button
          asChild
          className="gradient-primary text-white border-0 glow-primary-sm hover:opacity-90 transition-opacity h-9"
        >
          <Link href="/app/opportunities/new">+ Nova oportunidade</Link>
        </Button>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            <span className="font-medium text-foreground">{opps.length}</span> oportunidades ·{" "}
            <span className="font-medium text-foreground">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(opps.reduce((s: number, o: Opportunity) => s + Number(o.value || 0), 0))}
            </span>{" "}
            total
          </span>
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border p-0.5 gap-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                view === "kanban"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista Kanban"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                view === "list"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista Lista"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Oportunidade</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Contato</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Estágio</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valor</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Prior.</th>
                <th className="px-2 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {opps.map((opp: Opportunity, i: number) => {
                const stage = stages.find((s: Stage) => s.id === opp.stageId);
                const priorityDot = { high: "bg-red-400", medium: "bg-amber-400", low: "bg-slate-400" };
                const p = (opp as Opportunity & { priority?: string }).priority ?? "medium";
                return (
                  <tr
                    key={opp.id}
                    className={`border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors ${
                      i % 2 === 0 ? "" : "bg-muted/20"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{opp.title}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {opp.contact?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {stage ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                          {stage.name}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        maximumFractionDigits: 0,
                      }).format(Number(opp.value || 0))}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${priorityDot[p as keyof typeof priorityDot] ?? priorityDot.medium}`}
                        title={p}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <Link
                        href={`/app/opportunities/${opp.id}`}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/40 hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {opps.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma oportunidade encontrada
            </div>
          )}
        </div>
      )}

      {/* ── KANBAN VIEW ── */}
      {view === "kanban" && <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map((stage: Stage) => (
            <DroppableStage
              key={stage.id}
              stage={stage}
              opportunities={opps.filter((o: Opportunity) => o.stageId === stage.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOpp ? (
            <div
              className="glass-card w-[260px] rounded-xl p-3.5 cursor-grabbing shadow-2xl opacity-90"
              style={{ borderLeft: "3px solid #8b5cf6" }}
            >
              <p className="text-sm font-semibold text-foreground line-clamp-2">
                {activeOpp.title}
              </p>
              <p className="text-sm font-bold text-foreground mt-2">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                }).format(Number(activeOpp.value || 0))}
              </p>
              {activeOpp.contact?.name && (
                <p className="text-xs text-muted-foreground mt-1.5">{activeOpp.contact.name}</p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>}
    </div>
  );
}
