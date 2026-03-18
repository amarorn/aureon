"use client";

import { useDroppable } from "@dnd-kit/core";
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
  priority?: "high" | "medium" | "low";
  daysInStage?: number;
}

function formatCurrencyCompact(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
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

  const totalValue = opportunities.reduce((sum, o) => sum + Number(o.value || 0), 0);

  return (
    <div ref={setNodeRef} className="flex min-w-[272px] max-w-[272px] flex-shrink-0 flex-col gap-2">
      {/* Column header */}
      <div
        className={`rounded-xl px-3 py-2.5 transition-colors ${
          isOver ? "bg-primary/10" : "bg-background/40"
        }`}
        style={{ borderTop: `2px solid ${stage.color}` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-sm font-semibold text-foreground truncate">{stage.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {totalValue > 0 && (
              <span className="text-[10px] font-medium text-muted-foreground">
                {formatCurrencyCompact(totalValue)}
              </span>
            )}
            <span
              className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: stage.color }}
            >
              {opportunities.length}
            </span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div
        className={`flex flex-col gap-2 rounded-xl p-2 min-h-[120px] transition-colors ${
          isOver ? "bg-primary/5 ring-1 ring-primary/30" : "bg-transparent"
        }`}
      >
        {opportunities.map((opp) => (
          <DraggableCard key={opp.id} opp={opp} stageColor={stage.color} />
        ))}
        {opportunities.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground/40">
            Solte aqui
          </div>
        )}
      </div>
    </div>
  );
}
