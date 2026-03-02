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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import { apiHeaders, API_URL, TENANT_ID } from "@/lib/api";
import { DraggableCard } from "./draggable-card";
import { DroppableStage } from "./droppable-stage";

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

  const { data: pipelines, isLoading: loadingPipelines } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () =>
      fetch(`${API_URL}/pipelines`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const pipelineList = Array.isArray(pipelines) ? pipelines : [];
  const pipeline =
    pipelineList.find(
      (p: Pipeline) => p.id === selectedPipelineId || p.isDefault
    ) || pipelineList[0];
  const pipelineId = pipeline?.id || selectedPipelineId;

  const { data: opportunities, isLoading: loadingOpps } = useQuery({
    queryKey: ["opportunities", pipelineId],
    queryFn: () =>
      fetch(`${API_URL}/opportunities?pipelineId=${pipelineId}`, {
        headers: apiHeaders,
      }).then((r) => (r.ok ? r.json() : [])),
    enabled: !!pipelineId,
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
    const stageId = over.id as string;
    if (stageId.startsWith("stage-")) {
      const realStageId = stageId.replace("stage-", "");
      moveMutation.mutate({ oppId, stageId: realStageId });
    }
  }

  const opps = Array.isArray(opportunities) ? opportunities : [];
  const stages = pipeline?.stages || [];
  const activeOpp = activeId ? opps.find((o: Opportunity) => o.id === activeId) : null;

  if (loadingPipelines || !pipeline) {
    return <p className="text-muted-foreground">Carregando pipelines...</p>;
  }

  if (stages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhum estágio no pipeline. Execute o seed e crie um pipeline.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <select
          value={pipelineId || ""}
          onChange={(e) => setSelectedPipelineId(e.target.value || null)}
          className="rounded-md border px-3 py-2"
        >
          {pipelineList.map((p: Pipeline) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
          ))}
        </select>
        <Button asChild>
          <Link href="/app/opportunities/new">Nova oportunidade</Link>
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
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
            <Card className="w-64 cursor-grabbing shadow-lg">
              <CardContent className="py-3">
                <p className="font-medium">{activeOpp.title}</p>
                <p className="text-sm text-muted-foreground">
                  {activeOpp.contact?.name} · R$ {Number(activeOpp.value || 0).toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
