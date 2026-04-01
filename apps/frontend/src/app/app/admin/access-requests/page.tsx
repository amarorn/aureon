"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiHeaders, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Shield } from "lucide-react";
import { useState } from "react";

type AccessRequest = {
  id: string;
  status: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  requestedPackageCode: string;
  createdAt: string;
  tenant?: { id: string; name: string; slug: string };
};

export default function AdminAccessRequestsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [pkg, setPkg] = useState<Record<string, string>>({});

  const { data: requests = [], isLoading } = useQuery<AccessRequest[]>({
    queryKey: ["admin-access-requests"],
    queryFn: () =>
      fetch(`${API_URL}/admin/access-requests/pending`, {
        headers: getApiHeaders(),
      }).then((r) => (r.ok ? r.json() : [])),
    enabled: Boolean(user?.isPlatformUser),
  });

  const approve = useMutation({
    mutationFn: async ({ id, packageCode }: { id: string; packageCode: string }) => {
      const res = await fetch(`${API_URL}/admin/access-requests/${id}/approve`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({ packageCode }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-access-requests"] }),
  });

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user?.isPlatformUser) {
    return (
      <div className="rounded-2xl border border-white/[0.08] p-8 text-center">
        <Shield className="size-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Área restrita à equipe Aureon.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/app">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cadastros pendentes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aprove solicitações e defina o pacote contratado.
        </p>
      </div>

      {isLoading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : requests.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma pendência.</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{r.companyName}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.contactName} · {r.contactEmail} · {r.contactPhone}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pacote solicitado: {r.requestedPackageCode}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={pkg[r.id] ?? r.requestedPackageCode}
                    onChange={(e) => setPkg((p) => ({ ...p, [r.id]: e.target.value }))}
                    className="h-9 rounded-lg border border-white/[0.08] bg-background px-2 text-sm"
                  >
                    <option value="starter">starter</option>
                    <option value="growth">growth</option>
                    <option value="scale">scale</option>
                  </select>
                  <Button
                    size="sm"
                    disabled={approve.isPending}
                    onClick={() =>
                      approve.mutate({
                        id: r.id,
                        packageCode: pkg[r.id] ?? r.requestedPackageCode,
                      })
                    }
                  >
                    Aprovar
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
