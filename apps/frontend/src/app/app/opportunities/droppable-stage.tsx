"use client";

import { useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DraggableCard } from "./draggable-card";

interface Stage {
  id: string;
  name: string;
  order: number;
  color: string;
}

interface Opportunity {
  id: string;
  title: string;
  value: number;
  stageId: string;
  contact?: { name: string };
}

export function DroppableStage({
  stage,
  opportunities,
}: {
  stage: Stage;
  opportunities: Opportunity[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
  });

  return (
    <div ref={setNodeRef} className="min-w-[280px] flex-shrink-0">
      <Card className={`h-full ${isOver ? "ring-2 ring-primary" : ""}`}>
        <CardHeader
          className="border-l-4 py-3"
          style={{ borderLeftColor: stage.color }}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">{stage.name}</span>
            <span className="text-sm text-muted-foreground">
              {opportunities.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {opportunities.map((opp) => (
            <DraggableCard key={opp.id} opp={opp} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
