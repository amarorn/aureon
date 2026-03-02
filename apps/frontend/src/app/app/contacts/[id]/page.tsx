"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { apiHeaders, API_URL } from "@/lib/api";
import { TasksSection } from "./tasks-section";
import { CallsSection } from "./calls-section";
import { AddToQueueButton } from "./add-to-queue-button";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["contact", id],
    queryFn: () =>
      fetch(`${API_URL}/contacts/${id}`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : null
      ),
  });

  if (isLoading) return <p className="p-8">Carregando...</p>;
  if (error || !data) return <p className="p-8 text-destructive">Contato não encontrado.</p>;

  return (
    <div className="p-8 space-y-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/app/inbox/new?contactId=${id}`}>Iniciar conversa</Link>
            </Button>
            <AddToQueueButton contactId={id} />
            <Button asChild>
              <Link href={`/app/contacts/${id}/edit`}>Editar</Link>
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold">{data.name}</h1>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.email && <p><span className="text-muted-foreground">E-mail:</span> {data.email}</p>}
            {data.phone && <p><span className="text-muted-foreground">Telefone:</span> {data.phone}</p>}
            {data.company && <p><span className="text-muted-foreground">Empresa:</span> {data.company}</p>}
            {data.notes && <p><span className="text-muted-foreground">Observações:</span> {data.notes}</p>}
          </CardContent>
        </Card>
        <div className="mt-6 space-y-6">
          <TasksSection contactId={id} />
          <CallsSection contactId={id} />
        </div>
    </div>
  );
}
