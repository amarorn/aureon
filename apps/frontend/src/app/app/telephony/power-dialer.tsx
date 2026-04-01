"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, Phone } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiHeaders, API_URL } from "@/lib/api";

interface QueueItem {
  id: string;
  contactId: string;
  order: number;
  status: string;
  contact?: { id: string; name: string; phone?: string };
}

const AGENT_PHONE_STORAGE_KEY = "telephony-agent-phone";

export function PowerDialer() {
  const queryClient = useQueryClient();
  const [phoneOverrides, setPhoneOverrides] = useState<Record<string, string>>({});
  const [agentPhone, setAgentPhone] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(AGENT_PHONE_STORAGE_KEY) ?? "";
  });
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const trimmedPhone = agentPhone.trim();
    if (trimmedPhone) {
      window.localStorage.setItem(AGENT_PHONE_STORAGE_KEY, trimmedPhone);
      return;
    }
    window.localStorage.removeItem(AGENT_PHONE_STORAGE_KEY);
  }, [agentPhone]);

  const { data: twilioStatus } = useQuery({
    queryKey: ["twilio-status"],
    queryFn: () =>
      fetch(`${API_URL}/integrations/twilio/status`, { headers: getApiHeaders() }).then((r) =>
        r.ok ? r.json() : { connected: false }
      ),
    staleTime: 60_000,
  });

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["call-queue"],
    queryFn: () =>
      fetch(`${API_URL}/call-queue`, { headers: getApiHeaders() }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const { data: nextItem } = useQuery({
    queryKey: ["call-queue", "next"],
    queryFn: () =>
      fetch(`${API_URL}/call-queue/next`, { headers: getApiHeaders() }).then((r) =>
        r.ok ? r.json() : null
      ),
  });

  const next = nextItem as QueueItem | null;
  const phoneToDial = next ? phoneOverrides[next.id] ?? next.contact?.phone ?? "" : "";

  const dialMutation = useMutation({
    mutationFn: async ({
      queueId,
      contactId,
      phone,
      currentAgentPhone,
    }: {
      queueId: string;
      contactId: string;
      phone: string;
      currentAgentPhone: string;
    }) => {
      const dialResponse = await fetch(`${API_URL}/calls/initiate`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          contactId,
          to: phone,
          agentPhoneNumber: currentAgentPhone,
          record: true,
          transcribe: false,
        }),
      });
      const dialData = await dialResponse.json().catch(() => null);
      if (!dialResponse.ok || !dialData?.call) {
        const errorMessage =
          typeof dialData?.error === "string"
            ? dialData.error
            : typeof dialData?.message === "string"
              ? dialData.message
              : Array.isArray(dialData?.message) && dialData.message.length
                ? String(dialData.message[0])
                : "Falha ao iniciar chamada.";
        throw new Error(errorMessage);
      }

      const queueResponse = await fetch(`${API_URL}/call-queue/${queueId}/calling`, {
        method: "POST",
        headers: getApiHeaders(),
      });

      return {
        call: dialData.call,
        queueSynced: queueResponse.ok,
      };
    },
    onSuccess: ({ queueSynced }) => {
      setResult({
        ok: true,
        msg: queueSynced
          ? "Ligacao iniciada. Atenda seu telefone."
          : "Ligacao iniciada, mas a fila nao foi sincronizada.",
      });
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
      queryClient.invalidateQueries({ queryKey: ["call-queue", "next"] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
    onError: (error) => {
      setResult({
        ok: false,
        msg: error instanceof Error ? error.message : "Erro de conexão.",
      });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async (queueId: string) => {
      const res = await fetch(`${API_URL}/call-queue/${queueId}/skipped`, {
        method: "POST",
        headers: getApiHeaders(),
      });
      if (!res.ok) throw new Error("Nao foi possivel pular o contato.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
      queryClient.invalidateQueries({ queryKey: ["call-queue", "next"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (queueId: string) => {
      const res = await fetch(`${API_URL}/call-queue/${queueId}`, {
        method: "DELETE",
        headers: getApiHeaders(),
      });
      if (!res.ok) throw new Error("Nao foi possivel remover da fila.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
      queryClient.invalidateQueries({ queryKey: ["call-queue", "next"] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/call-queue/clear`, {
        method: "DELETE",
        headers: getApiHeaders(),
      });
      if (!res.ok) throw new Error("Nao foi possivel limpar a fila.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
      queryClient.invalidateQueries({ queryKey: ["call-queue", "next"] });
    },
  });

  const queueList = Array.isArray(queue) ? queue : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <span>Fila: {queueList.length} contatos</span>
        {queueList.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
          >
            Limpar fila
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Seu número (E.164)
          </label>
          <Input
            placeholder="+5511999999999"
            value={agentPhone}
            onChange={(e) => setAgentPhone(e.target.value)}
          />
        </div>

        {!twilioStatus?.connected ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Conecte o Twilio em{" "}
            <Link href="/app/integrations" className="underline underline-offset-4">
              Integrações
            </Link>{" "}
            para iniciar chamadas pelo discador.
          </div>
        ) : null}

        {result ? (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              result.ok
                ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {result.msg}
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando fila...</p>
        ) : next ? (
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Próxima chamada</p>
            <p className="font-semibold">{next.contact?.name}</p>
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Telefone"
                value={phoneToDial}
                onChange={(e) => {
                  if (!next) return;
                  setPhoneOverrides((current) => ({
                    ...current,
                    [next.id]: e.target.value,
                  }));
                  setResult(null);
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    dialMutation.mutate({
                      queueId: next.id,
                      contactId: next.contactId,
                      phone: phoneToDial.trim(),
                      currentAgentPhone: agentPhone.trim(),
                    })
                  }
                  disabled={
                    dialMutation.isPending ||
                    !twilioStatus?.connected ||
                    !agentPhone.trim() ||
                    !phoneToDial.trim()
                  }
                  className="gap-1.5"
                >
                  {dialMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Phone className="h-3.5 w-3.5" />
                  )}
                  Iniciar chamada
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
                disabled={removeMutation.isPending}
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
