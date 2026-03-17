"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { InboxList } from "./inbox-list";
import {
  Inbox,
  Hash,
  FileText,
  Plus,
  Mail,
  RefreshCw,
  Instagram,
} from "lucide-react";
import { apiHeaders, API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PageTour } from "@/components/page-tour";

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState<"email" | "instagram" | null>(null);
  const [syncMsg, setSyncMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    syncEmailOnLoad();
  }, []);

  async function syncEmailOnLoad() {
    try {
      const res = await fetch(`${API_URL}/email-inbox/sync`, {
        method: "POST",
        headers: apiHeaders,
      });
      if (!res.ok) return;
      const data = await res.json();
      const synced = (data.gmail?.synced ?? 0) + (data.outlook?.synced ?? 0);
      if (synced > 0) {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        setSyncMsg({ type: "success", text: `${synced} novo(s) e-mail(s). Veja o sino de notificações.` });
      }
    } catch {
      // silencioso no load
    }
  }

  async function syncEmail() {
    setSyncing("email");
    setSyncMsg(null);
    try {
      const res = await fetch(`${API_URL}/email-inbox/sync`, {
        method: "POST",
        headers: apiHeaders,
      });
      const data = await res.json();
      const parts: string[] = [];
      if (data.gmail) parts.push(`Gmail: ${data.gmail.synced} novos`);
      if (data.outlook) parts.push(`Outlook: ${data.outlook.synced} novos`);
      const synced = (data.gmail?.synced ?? 0) + (data.outlook?.synced ?? 0);
      if (synced > 0) queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSyncMsg({
        type: "success",
        text: parts.length ? parts.join(" · ") : "Nenhum email novo",
      });
    } catch {
      setSyncMsg({ type: "error", text: "Erro ao sincronizar emails" });
    } finally {
      setSyncing(null);
    }
  }

  async function syncInstagram() {
    setSyncing("instagram");
    setSyncMsg(null);
    try {
      const res = await fetch(`${API_URL}/integrations/instagram/sync`, {
        method: "POST",
        headers: apiHeaders,
      });
      const data = await res.json();
      setSyncMsg({
        type: "success",
        text: `Instagram: ${data.synced ?? 0} novas mensagens`,
      });
    } catch {
      setSyncMsg({ type: "error", text: "Erro ao sincronizar Instagram" });
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageTour tourId="inbox" />
      {/* Page header */}
      <div className="flex items-center justify-between gap-4" data-tour="inbox-header">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg glow-primary-sm shrink-0">
            <Inbox className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Central de conversas e mensagens
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Sync buttons */}
          <button
            data-tour="inbox-sync-email"
            onClick={syncEmail}
            disabled={syncing !== null}
            title="Sincronizar emails"
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-xs text-muted-foreground hover:text-foreground transition-all disabled:opacity-50",
            )}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", syncing === "email" && "animate-spin")}
            />
            <Mail className="h-3.5 w-3.5" />
          </button>

          <button
            data-tour="inbox-sync-instagram"
            onClick={syncInstagram}
            disabled={syncing !== null}
            title="Sincronizar Instagram"
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-xs text-muted-foreground hover:text-foreground transition-all disabled:opacity-50",
            )}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", syncing === "instagram" && "animate-spin")}
            />
            <Instagram className="h-3.5 w-3.5" />
          </button>

          <div className="w-px h-5 bg-white/[0.08] mx-1" />

          {/* Navigation links */}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] gap-1.5 text-xs h-8"
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
            className="border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] gap-1.5 text-xs h-8"
          >
            <Link href="/app/inbox/templates">
              <FileText className="h-3.5 w-3.5" />
              Templates
            </Link>
          </Button>

          <Button
            size="sm"
            asChild
            className="gradient-primary text-white glow-primary-sm hover:opacity-90 transition-opacity border-0 gap-1.5 h-8 text-xs"
          >
            <Link href="/app/inbox/new">
              <Plus className="h-3.5 w-3.5" />
              Nova conversa
            </Link>
          </Button>
        </div>
      </div>

      {/* Sync feedback */}
      {syncMsg && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm",
            syncMsg.type === "success"
              ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
              : "border-red-500/20 bg-red-500/10 text-red-400"
          )}
        >
          <Mail className="h-4 w-4 shrink-0" />
          {syncMsg.text}
          <button
            onClick={() => setSyncMsg(null)}
            className="ml-auto text-current/60 hover:text-current transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Inbox list */}
      <div data-tour="inbox-list">
        <InboxList />
      </div>
    </div>
  );
}
