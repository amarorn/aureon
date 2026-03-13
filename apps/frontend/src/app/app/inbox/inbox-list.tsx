"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiHeaders, API_URL } from "@/lib/api";

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  instagram: "Instagram",
  telegram: "Telegram",
  other: "Outro",
};

export function InboxList() {
  const [statusFilter, setStatusFilter] = useState<string>("open");

  const { data, isLoading, error } = useQuery({
    queryKey: ["conversations", statusFilter],
    queryFn: () =>
      fetch(`${API_URL}/conversations?status=${statusFilter}`, {
        headers: apiHeaders,
      }).then((r) => (r.ok ? r.json() : [])),
  });

  const conversations = Array.isArray(data) ? data : [];

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (error) return <p className="text-destructive">Erro ao carregar conversas.</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={statusFilter === "open" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("open")}
        >
          Abertas
        </Button>
        <Button
          variant={statusFilter === "closed" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("closed")}
        >
          Fechadas
        </Button>
      </div>
      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhuma conversa.</p>
            <p className="text-sm text-muted-foreground">
              Crie uma conversa a partir de um contato.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map(
            (c: {
              id: string;
              contact?: { name: string };
              channel?: { type: string; name: string };
              status: string;
              subject?: string;
              updatedAt: string;
            }) => (
              <Link key={c.id} href={`/app/inbox/${c.id}`}>
                <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{c.contact?.name ?? "Sem contato"}</p>
                        {c.channel?.type === "email" && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                            Email
                          </span>
                        )}
                      </div>
                      {c.subject ? (
                        <p className="text-sm text-muted-foreground truncate">{c.subject}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {CHANNEL_LABELS[c.channel?.type ?? "other"] ?? c.channel?.name} —{" "}
                          {c.status === "open" ? "Aberta" : "Fechada"}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0 ml-3">
                      {new Date(c.updatedAt).toLocaleDateString("pt-BR")}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
