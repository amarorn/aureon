"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { apiHeaders, API_URL } from "@/lib/api";

export function ContactsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts"],
    queryFn: () =>
      fetch(`${API_URL}/contacts`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (error) return <p className="text-destructive">Erro ao carregar contatos.</p>;

  const contacts = Array.isArray(data) ? data : [];

  if (contacts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Nenhum contato cadastrado.</p>
          <Button asChild>
            <Link href="/app/contacts/new">Criar primeiro contato</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {contacts.map((c: { id: string; name: string; email?: string; company?: string }) => (
        <Card key={c.id}>
          <CardHeader className="pb-2">
            <Link href={`/app/contacts/${c.id}`} className="font-semibold hover:underline">
              {c.name}
            </Link>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {c.email && <p>{c.email}</p>}
            {c.company && <p>{c.company}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
