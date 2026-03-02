"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiHeaders, API_URL } from "@/lib/api";

const CHANNEL_TYPES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
  { value: "other", label: "Outro" },
];

export default function ChannelsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState("whatsapp");

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: () =>
      fetch(`${API_URL}/channels`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; type: string }) =>
      fetch(`${API_URL}/channels`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      setName("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/channels/${id}`, {
        method: "DELETE",
        headers: apiHeaders,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) createMutation.mutate({ name: name.trim(), type });
  };

  return (
    <div className="space-y-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/inbox">Voltar</Link>
          </Button>
        </div>
        <Card className="mb-6">
          <CardHeader>
            <h1 className="text-xl font-bold">Canais</h1>
            <p className="text-sm text-muted-foreground">
              Configure canais de comunicação (WhatsApp, e-mail, etc.)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <div className="flex-1">
                <Label>Nome</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: WhatsApp Vendas"
                  className="mt-1"
                />
              </div>
              <div className="w-32">
                <Label>Tipo</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                >
                  {CHANNEL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
                  Adicionar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {(channels as { id: string; name: string; type: string }[]).map((ch) => (
              <Card key={ch.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{ch.name}</p>
                    <p className="text-sm text-muted-foreground">{ch.type}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(ch.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Remover
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
