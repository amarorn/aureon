"use client";

import { useDraggable } from "@dnd-kit/core";
import Link from "next/link";
import { GripVertical } from "lucide-react";

interface Opportunity {
  id: string;
  title: string;
  value: number;
  contact?: { name: string };
  priority?: "high" | "medium" | "low";
  daysInStage?: number;
}

const PRIORITY_CONFIG = {
  high: { dot: "bg-red-400", label: "Alta" },
  medium: { dot: "bg-amber-400", label: "Média" },
  low: { dot: "bg-slate-400", label: "Baixa" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function DraggableCard({
  opp,
  stageColor,
}: {
  opp: Opportunity;
  stageColor?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: opp.id,
  });

  const priority = opp.priority ?? "medium";
  const priorityCfg = PRIORITY_CONFIG[priority];
  const accentColor = stageColor ?? "#8b5cf6";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`glass-card rounded-xl p-3.5 transition-all duration-150 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40 scale-95" : "hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
      }`}
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      {/* Grip icon + title row */}
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/25" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/app/opportunities/${opp.id}`}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors leading-snug line-clamp-2"
            onClick={(e) => e.stopPropagation()}
          >
            {opp.title}
          </Link>
        </div>
        <div
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityCfg.dot}`}
          title={`Prioridade: ${priorityCfg.label}`}
        />
      </div>

      {/* Value */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          }).format(Number(opp.value || 0))}
        </span>
        {opp.daysInStage !== undefined && (
          <span className="text-[10px] text-muted-foreground/60">
            {opp.daysInStage}d neste estágio
          </span>
        )}
      </div>

      {/* Contact avatar row */}
      {opp.contact?.name && (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[9px] font-bold">
            {getInitials(opp.contact.name)}
          </div>
          <span className="text-xs text-muted-foreground truncate">{opp.contact.name}</span>
        </div>
      )}
    </div>
  );
}
