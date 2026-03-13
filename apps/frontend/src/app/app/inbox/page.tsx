"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InboxList } from "./inbox-list";
import { Inbox, Hash, FileText, Plus, Mail, RefreshCw } from "lucide-react";
import { apiHeaders, API_URL } from "@/lib/api";

export default function InboxPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`${API_URL}/email-inbox/sync`, {
        method: "POST",
        headers: apiHeaders,
      });
      const data = await res.json();
      const parts = [];
      if (data.gmail) parts.push(`Gmail: ${data.gmail.synced} novos`);
      if (data.outlook) parts.push(`Outlook: ${data.outlook.synced} novos`);
      setSyncMsg(parts.length ? parts.join(" | ") : "Nenhum email novo");
    } catch {
      setSyncMsg("Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }
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
            onClick={handleSync}
            disabled={syncing}
            className="border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar emails
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setSyncing(true);
              setSyncMsg(null);
              try {
                const res = await fetch(`${API_URL}/integrations/instagram/sync`, { method: "POST", headers: apiHeaders });
                const d = await res.json();
                setSyncMsg(`Instagram: ${d.synced ?? 0} novas mensagens`);
              } catch { setSyncMsg("Erro ao sincronizar Instagram"); }
              finally { setSyncing(false); }
            }}
            disabled={syncing}
            className="border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar Instagram
          </Button>
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

      {syncMsg && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
          <Mail className="h-4 w-4 inline mr-2" />
          {syncMsg}
        </div>
      )}

      {/* Content */}
      <InboxList />
    </div>
  );
}
