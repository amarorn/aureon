"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiHeaders, API_URL } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";

interface QueueItem {
  id: string;
  contactId: string;
  order: number;
  status: string;
  contact?: { id: string; name: string; phone?: string };
}

export function PowerDialer() {
  const queryClient = useQueryClient();
  const [phoneToDial, setPhoneToDial] = useState("");

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["call-queue"],
    queryFn: () =>
      fetch(`${API_URL}/call-queue`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const { data: nextItem } = useQuery({
    queryKey: ["call-queue", "next"],
    queryFn: () =>
      fetch(`${API_URL}/call-queue/next`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : null
      ),
  });

  const completeMutation = useMutation({
    mutationFn: async ({ queueId, contactId, phone }: { queueId: string; contactId: string; phone: string }) => {
      await fetch(`${API_URL}/call-queue/${queueId}/completed`, {
        method: "POST",
        headers: apiHeaders,
      });
      await fetch(`${API_URL}/calls`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          contactId,
          phoneNumber: phone,
          direction: "outbound",
          status: "completed",
          durationSeconds: 0,
          startedAt: new Date().toISOString(),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
  });

  const skipMutation = useMutation({
    mutationFn: (queueId: string) =>
      fetch(`${API_URL}/call-queue/${queueId}/skipped`, {
        method: "POST",
        headers: apiHeaders,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (queueId: string) =>
      fetch(`${API_URL}/call-queue/${queueId}`, {
        method: "DELETE",
        headers: apiHeaders,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/call-queue/clear`, {
        method: "DELETE",
        headers: apiHeaders,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
    },
  });

  const queueList = Array.isArray(queue) ? queue : [];
  const next = nextItem as QueueItem | null;
  const phone = next?.contact?.phone || phoneToDial || "";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <span>Fila: {queueList.length} contatos</span>
        {queueList.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
          >
            Limpar fila
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {next ? (
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Próxima chamada</p>
            <p className="font-semibold">{next.contact?.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                placeholder="Telefone"
                value={phone}
                onChange={(e) => setPhoneToDial(e.target.value)}
                className="max-w-[200px]"
              />
              <Button
                size="sm"
                onClick={() =>
                  completeMutation.mutate({
                    queueId: next.id,
                    contactId: next.contactId,
                    phone: phone || "0",
                  })
                }
                disabled={completeMutation.isPending}
              >
                Registrar chamada
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => skipMutation.mutate(next.id)}
                disabled={skipMutation.isPending}
              >
                Pular
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum contato na fila. Adicione contatos a partir da lista de contatos.
          </p>
        )}

        <div className="max-h-48 space-y-1 overflow-y-auto">
          {queueList.map((item: QueueItem) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded border px-3 py-2 text-sm"
            >
              <Link
                href={`/app/contacts/${item.contactId}`}
                className="hover:underline"
              >
                {item.contact?.name}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeMutation.mutate(item.id)}
              >
                Remover
              </Button>
            </div>
          ))}
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link href="/app/contacts">Adicionar contatos à fila</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
