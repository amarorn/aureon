"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { apiHeaders, API_URL } from "@/lib/api";

function NewConversationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contactId, setContactId] = useState(searchParams.get("contactId") ?? "");
  const [channelId, setChannelId] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () =>
      fetch(`${API_URL}/contacts`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: () =>
      fetch(`${API_URL}/channels`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const createMutation = useMutation({
    mutationFn: async (body: { contactId: string; channelId: string }) => {
      const res = await fetch(`${API_URL}/conversations`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao criar conversa");
      return res.json();
    },
    onSuccess: (conv) => {
      router.push(`/app/inbox/${conv.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactId && channelId) {
      createMutation.mutate({ contactId, channelId });
    }
  };

  return (
    <div className="space-y-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/inbox">Voltar</Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold">Nova conversa</h1>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Contato</Label>
                <select
                  required
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Selecione</option>
                  {(contacts as { id: string; name: string }[]).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Canal</Label>
                <select
                  required
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Selecione</option>
                  {(channels as { id: string; name: string; type: string }[]).map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} ({ch.type})
                    </option>
                  ))}
                </select>
              </div>
              {channels.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Crie um canal em Configurações primeiro.
                </p>
              )}
              <Button
                type="submit"
                disabled={createMutation.isPending || !contactId || !channelId}
              >
                Iniciar conversa
              </Button>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}

export default function NewConversationPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8">
          <p className="text-muted-foreground">Carregando...</p>
      </div>
    }>
      <NewConversationForm />
    </Suspense>
  );
}
