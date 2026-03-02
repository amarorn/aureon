"use client";

import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface Opportunity {
  id: string;
  title: string;
  value: number;
  contact?: { name: string };
}

export function DraggableCard({ opp }: { opp: Opportunity }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: opp.id,
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <Card
        className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
      >
        <CardContent className="py-3">
          <Link
            href={`/app/opportunities/${opp.id}`}
            className="font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {opp.title}
          </Link>
          <p className="text-sm text-muted-foreground">
            {opp.contact?.name} · R$ {Number(opp.value || 0).toLocaleString("pt-BR")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
