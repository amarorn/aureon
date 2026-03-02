"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { apiHeaders, API_URL } from "@/lib/api";

interface Call {
  id: string;
  phoneNumber: string;
  direction: string;
  status: string;
  durationSeconds: number | null;
  startedAt: string;
}

export function CallsSection({ contactId }: { contactId: string }) {
  const { data: calls = [] } = useQuery({
    queryKey: ["calls", contactId],
    queryFn: () =>
      fetch(`${API_URL}/calls?contactId=${contactId}`, {
        headers: apiHeaders,
      }).then((r) => (r.ok ? r.json() : [])),
  });

  const callList = Array.isArray(calls) ? calls : [];

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Chamadas</h2>
      </CardHeader>
      <CardContent>
        {callList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma chamada.</p>
        ) : (
          <ul className="space-y-2">
            {callList.map((c: Call) => (
              <li key={c.id} className="flex justify-between text-sm">
                <span>
                  {c.phoneNumber} · {c.direction} · {c.status}
                  {c.durationSeconds != null && ` (${c.durationSeconds}s)`}
                </span>
                <span className="text-muted-foreground">
                  {new Date(c.startedAt).toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
