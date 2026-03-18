"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PipelineBoard } from "./pipeline-board";
import { Kanban, Plus } from "lucide-react";
import { PageTour } from "@/components/page-tour";

export default function OpportunitiesPage() {
  return (
    <div className="space-y-8">
      <PageTour tourId="opportunities" />
      {/* Page header */}
      <div className="flex items-center justify-between" data-tour="opportunities-header">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg glow-primary-sm">
            <Kanban className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas oportunidades de venda</p>
          </div>
        </div>
        <Button
          asChild
          data-tour="opportunities-new-btn"
          className="gradient-primary text-white glow-primary-sm hover:opacity-90 transition-opacity border-0 gap-2"
        >
          <Link href="/app/opportunities/new">
            <Plus className="h-4 w-4" />
            Nova oportunidade
          </Link>
        </Button>
      </div>

      {/* Content */}
      <div data-tour="opportunities-board">
        <PipelineBoard />
      </div>
    </div>
  );
}
