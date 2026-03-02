"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiHeaders, API_URL } from "@/lib/api";

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: () =>
      fetch(`${API_URL}/opportunities/${id}`, { headers: apiHeaders }).then(
        (r) => (r.ok ? r.json() : null)
      ),
  });

  if (isLoading) return <p className="p-8">Carregando...</p>;
  if (error || !data)
    return <p className="p-8 text-destructive">Oportunidade não encontrada.</p>;

  return (
    <div className="space-y-8">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link href="/app" className="text-lg font-semibold">
            Aureon
          </Link>
        </div>
      </header>
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Voltar
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-xl font-bold">{data.title}</h1>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Contato:</span>{" "}
                {data.contact?.name}
              </p>
              <p>
                <span className="text-muted-foreground">Estágio:</span>{" "}
                {data.stage?.name}
              </p>
              <p>
                <span className="text-muted-foreground">Valor:</span> R${" "}
                {Number(data.value || 0).toLocaleString("pt-BR")}
              </p>
              {data.notes && (
                <p>
                  <span className="text-muted-foreground">Observações:</span>{" "}
                  {data.notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
