"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiHeaders, API_URL } from "@/lib/api";

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [variablesStr, setVariablesStr] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["message-templates"],
    queryFn: () =>
      fetch(`${API_URL}/message-templates`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; content: string; variables?: string[] }) =>
      fetch(`${API_URL}/message-templates`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      setName("");
      setContent("");
      setVariablesStr("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/message-templates/${id}`, {
        method: "DELETE",
        headers: apiHeaders,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && content.trim()) {
      const variables = variablesStr
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      createMutation.mutate({ name: name.trim(), content: content.trim(), variables });
    }
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
            <h1 className="text-xl font-bold">Templates de mensagem</h1>
            <p className="text-sm text-muted-foreground">
              Use variáveis como {"{{nome}}"}, {"{{empresa}}"} no conteúdo
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Saudação inicial"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Conteúdo</Label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Olá {{nome}}, tudo bem?"
                  rows={3}
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div>
                <Label>Variáveis (separadas por vírgula)</Label>
                <Input
                  value={variablesStr}
                  onChange={(e) => setVariablesStr(e.target.value)}
                  placeholder="nome, empresa"
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending || !name.trim() || !content.trim()}>
                Criar template
              </Button>
            </form>
          </CardContent>
        </Card>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {(templates as { id: string; name: string; content: string; variables: string[] }[]).map(
              (t) => (
                <Card key={t.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{t.content}</p>
                      {t.variables?.length ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Variáveis: {t.variables.join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(t.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Remover
                    </Button>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
    </div>
  );
}
