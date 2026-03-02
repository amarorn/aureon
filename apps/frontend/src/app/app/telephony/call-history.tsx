"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { apiHeaders, API_URL } from "@/lib/api";
import Link from "next/link";

interface Call {
  id: string;
  phoneNumber: string;
  direction: string;
  status: string;
  durationSeconds: number | null;
  startedAt: string;
  contact?: { id: string; name: string };
}

export function CallHistory() {
  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["calls"],
    queryFn: () =>
      fetch(`${API_URL}/calls`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const callList = Array.isArray(calls) ? calls : [];

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  if (callList.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma chamada registrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-64 overflow-y-auto">
          {callList.slice(0, 20).map((call: Call) => (
            <div
              key={call.id}
              className="flex items-center justify-between border-b px-4 py-3 last:border-0"
            >
              <div>
                <Link
                  href={`/app/contacts/${call.contact?.id}`}
                  className="font-medium hover:underline"
                >
                  {call.contact?.name || call.phoneNumber}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {call.phoneNumber} · {call.direction} · {call.status}
                  {call.durationSeconds != null && ` · ${call.durationSeconds}s`}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(call.startedAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
