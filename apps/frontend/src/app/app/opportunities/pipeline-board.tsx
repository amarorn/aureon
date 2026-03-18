"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CollisionDetection } from "@dnd-kit/core";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";

const stageOnlyCollision: CollisionDetection = (args) => {
  const collisions = closestCenter(args);
  return collisions.filter((c) => String(c.id).startsWith("stage-"));
};
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import { apiHeaders, API_URL } from "@/lib/api";
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
  priority?: "high" | "medium" | "low";
}

async function fetchPipelines(): Promise<Pipeline[]> {
  const res = await fetch(`${API_URL}/pipelines`, { headers: apiHeaders });
  if (!res.ok) {
    throw new Error("Erro ao carregar pipelines.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchOpportunities(pipelineId: string): Promise<Opportunity[]> {
  const res = await fetch(`${API_URL}/opportunities?pipelineId=${pipelineId}`, {
    headers: apiHeaders,
  });
  if (!res.ok) {
    throw new Error("Erro ao carregar oportunidades.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function PipelineBoard() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [moveError, setMoveError] = useState<string | null>(null);

  const {
    data: pipelines = [],
    isLoading: loadingPipelines,
    error: pipelinesError,
  } = useQuery({
    queryKey: ["pipelines"],
    queryFn: fetchPipelines,
  });

  const pipeline =
    pipelines.find((p) => p.id === selectedPipelineId) ??
    pipelines.find((p) => p.isDefault) ??
    pipelines[0];
  const pipelineId = pipeline?.id ?? null;

  const {
    data: opportunities = [],
    error: opportunitiesError,
  } = useQuery({
    queryKey: ["opportunities", pipelineId],
    queryFn: () => fetchOpportunities(pipelineId as string),
    enabled: Boolean(pipelineId),
  });

  const moveMutation = useMutation({
    mutationFn: async ({
      oppId,
      stageId,
    }: {
      oppId: string;
      stageId: string;
    }) => {
      const res = await fetch(`${API_URL}/opportunities/${oppId}/stage`, {
        method: "PUT",
        headers: apiHeaders,
        body: JSON.stringify({ stageId }),
      });
      if (!res.ok) {
        let message = "Erro ao mover oportunidade.";
        try {
          const data = await res.json();
          if (typeof data?.message === "string") message = data.message;
          else if (Array.isArray(data?.message) && data.message.length) {
            message = String(data.message[0]);
          }
        } catch {
          const text = await res.text().catch(() => "");
          if (text) message = text;
        }
        throw new Error(message);
      }
      return res.json();
    },
    onMutate: async ({ oppId, stageId }) => {
      setMoveError(null);
      if (!pipelineId) return { previous: [] as Opportunity[] };

      await queryClient.cancelQueries({ queryKey: ["opportunities", pipelineId] });
      const previous =
        queryClient.getQueryData<Opportunity[]>(["opportunities", pipelineId]) ?? [];

      queryClient.setQueryData<Opportunity[]>(["opportunities", pipelineId], (current = []) =>
        current.map((opp) => (opp.id === oppId ? { ...opp, stageId } : opp))
      );

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (pipelineId && context?.previous) {
        queryClient.setQueryData(["opportunities", pipelineId], context.previous);
      }
      setMoveError(
        error instanceof Error ? error.message : "Erro ao mover oportunidade."
      );
    },
    onSettled: () => {
      if (pipelineId) {
        queryClient.invalidateQueries({ queryKey: ["opportunities", pipelineId] });
      }
    },
  });

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
    if (!over || !pipelineId) return;

    const oppId = active.id as string;
    const overId = String(over.id);
    let nextStageId: string | null = null;
    if (overId.startsWith("stage-")) {
      nextStageId = overId.replace("stage-", "");
    } else {
      const oppOver = opportunities.find((o) => o.id === overId);
      if (oppOver) nextStageId = oppOver.stageId;
    }
    if (!nextStageId) return;

    const currentOpp = opportunities.find((opp) => opp.id === oppId);
    if (!currentOpp || currentOpp.stageId === nextStageId) return;

    moveMutation.mutate({ oppId, stageId: nextStageId });
  }

  const stages = pipeline?.stages ?? [];
  const opps = opportunities;
  const activeOpp = activeId ? opps.find((o) => o.id === activeId) : null;

  if (loadingPipelines) {
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

  if (pipelinesError) {
    return (
      <div className="glass-card rounded-2xl py-16 flex flex-col items-center gap-4 text-center">
        <p className="text-destructive text-sm">Erro ao carregar pipelines.</p>
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="glass-card rounded-2xl py-16 flex flex-col items-center gap-4 text-center">
        <p className="text-muted-foreground text-sm">
          Nenhum pipeline cadastrado para este tenant.
        </p>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="glass-card rounded-2xl py-16 flex flex-col items-center gap-4 text-center">
        <p className="text-muted-foreground text-sm">
          Este pipeline nao possui estagios configurados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={pipelineId}
            onChange={(e) => {
              setMoveError(null);
              setSelectedPipelineId(e.target.value || null);
            }}
            className="h-9 appearance-none rounded-xl border border-border bg-background/50 pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer"
          >
            {pipelines.map((p) => (
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
              }).format(opps.reduce((sum, opp) => sum + Number(opp.value || 0), 0))}
            </span>{" "}
            total
          </span>
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

      {opportunitiesError ? (
        <div className="glass-card rounded-2xl py-16 flex flex-col items-center gap-4 text-center">
          <p className="text-destructive text-sm">Erro ao carregar oportunidades.</p>
        </div>
      ) : null}

      {moveError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {moveError}
        </div>
      ) : null}

      {view === "list" && !opportunitiesError && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Oportunidade</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Contato</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Estagio</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valor</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Prior.</th>
                <th className="px-2 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {opps.map((opp, i) => {
                const stage = stages.find((s) => s.id === opp.stageId);
                const priorityDot = {
                  high: "bg-red-400",
                  medium: "bg-amber-400",
                  low: "bg-slate-400",
                };
                const priority = opp.priority ?? "medium";
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
                        className={`inline-block h-2 w-2 rounded-full ${
                          priorityDot[priority as keyof typeof priorityDot] ?? priorityDot.medium
                        }`}
                        title={priority}
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

      {view === "kanban" && !opportunitiesError ? (
        <DndContext
          sensors={sensors}
          collisionDetection={stageOnlyCollision}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <DroppableStage
                key={stage.id}
                stage={stage}
                opportunities={opps.filter((opp) => opp.stageId === stage.id)}
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
                {activeOpp.contact?.name ? (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {activeOpp.contact.name}
                  </p>
                ) : null}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : null}
    </div>
  );
}
