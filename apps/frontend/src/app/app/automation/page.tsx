import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkflowsList } from "./workflows-list";
import { Zap, Plus } from "lucide-react";

export default function AutomationPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg glow-primary-sm">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Automação</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Crie e gerencie workflows automatizados</p>
          </div>
        </div>
        <Button
          asChild
          className="gradient-primary text-white glow-primary-sm hover:opacity-90 transition-opacity border-0 gap-2"
        >
          <Link href="/app/automation/new">
            <Plus className="h-4 w-4" />
            Novo workflow
          </Link>
        </Button>
      </div>

      {/* Content */}
      <WorkflowsList />
    </div>
  );
}
