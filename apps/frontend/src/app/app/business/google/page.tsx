"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getApiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Building2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface GbpStatus {
  connected: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
}

export default function GoogleBusinessProfilePage() {
  const { data: status, isLoading } = useQuery<GbpStatus>({
    queryKey: ["gbp-status"],
    queryFn: () =>
      fetch(`${API_URL}/business/google/status`, { headers: getApiHeaders() }).then(
        (r) =>
          r.ok
            ? r.json()
            : {
                connected: false,
                hasAccessToken: false,
                hasRefreshToken: false,
              },
      ),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="size-7 text-cyan-500" />
            Google Business Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Perfil no Google, avaliações e informações do negócio
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/app/integrations">
              <ExternalLink className="size-3.5" />
              Integrações
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <a
              href="https://business.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-3.5" />
              Abrir Business Profile
            </a>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando…
        </div>
      ) : !status?.connected ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              Google Business Profile não conectado
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Em Integrações, conecte o card Google Business Profile (escopo{" "}
              <code className="text-foreground">business.manage</code>). Use
              usuário de teste no Console se o app estiver em modo teste.
            </p>
            <Button asChild className="mt-3" size="sm">
              <Link href="/app/integrations">Ir para Integrações</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            Conectado
          </div>
          <p className="text-muted-foreground mt-3 text-sm">
            Avaliações, horário, fotos e desempenho do perfil ficam no painel
            oficial. Use <strong>Abrir Business Profile</strong> ou{" "}
            <a
              className="text-primary underline"
              href="https://business.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              business.google.com
            </a>
            .
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Integração via API (listar locais, respostas a avaliações etc.) pode
            ser adicionada depois com Business Profile API e token já obtido no
            OAuth.
          </p>
        </div>
      )}
    </div>
  );
}
