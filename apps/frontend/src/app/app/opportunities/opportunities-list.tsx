"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "291686ec-369b-46ef-8083-226ae6eeafb7";

export function OpportunitiesList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["opportunities"],
    queryFn: () =>
      fetch(`${API_URL}/opportunities`, {
        headers: { "X-Tenant-Id": TENANT_ID },
      }).then((r) => (r.ok ? r.json() : [])),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (error) return <p className="text-destructive">Erro ao carregar oportunidades.</p>;

  const opportunities = Array.isArray(data) ? data : [];

  if (opportunities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma oportunidade cadastrada. Crie um contato primeiro e depois uma oportunidade.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {opportunities.map((o: { id: string; title: string; value: number; contact?: { name: string }; stage?: { name: string } }) => (
        <Card key={o.id}>
          <CardContent className="py-4">
            <p className="font-medium">{o.title}</p>
            <p className="text-sm text-muted-foreground">
              {o.contact?.name} · {o.stage?.name} · R$ {Number(o.value || 0).toLocaleString("pt-BR")}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
