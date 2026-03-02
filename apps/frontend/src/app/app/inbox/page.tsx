import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InboxList } from "./inbox-list";
import { Inbox, Hash, FileText, Plus } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg glow-primary-sm">
            <Inbox className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Central de conversas e mensagens</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] gap-2"
          >
            <Link href="/app/inbox/channels">
              <Hash className="h-3.5 w-3.5" />
              Canais
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] gap-2"
          >
            <Link href="/app/inbox/templates">
              <FileText className="h-3.5 w-3.5" />
              Templates
            </Link>
          </Button>
          <Button
            asChild
            className="gradient-primary text-white glow-primary-sm hover:opacity-90 transition-opacity border-0 gap-2"
          >
            <Link href="/app/inbox/new">
              <Plus className="h-4 w-4" />
              Nova conversa
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <InboxList />
    </div>
  );
}
