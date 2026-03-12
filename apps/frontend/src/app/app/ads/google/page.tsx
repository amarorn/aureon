"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface AdsStatus {
  connected: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  customerId: string | null;
  developerTokenConfigured: boolean;
}

export default function GoogleAdsPage() {
  const queryClient = useQueryClient();
  const [customerInput, setCustomerInput] = useState("");

  const { data: status, isLoading } = useQuery<AdsStatus>({
    queryKey: ["google-ads-status"],
    queryFn: () =>
      fetch(`${API_URL}/ads/google/status`, { headers: apiHeaders }).then(
        (r) =>
          r.ok
            ? r.json()
            : {
                connected: false,
                hasAccessToken: false,
                hasRefreshToken: false,
                customerId: null,
                developerTokenConfigured: false,
              },
      ),
  });

  const setCustomerMutation = useMutation({
    mutationFn: (customerId: string) =>
      fetch(`${API_URL}/ads/google/config`, {
        method: "PUT",
        headers: apiHeaders,
        body: JSON.stringify({ customerId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-ads-status"] });
      setCustomerInput("");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="size-7 text-emerald-500" />
            Google Ads
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Conecte em Integrações; campanhas e métricas detalhadas ficam no
            Google Ads
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
              href="https://ads.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-3.5" />
              Abrir Google Ads
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
              Google Ads não conectado
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Em Integrações, clique em Conectar no card Google Ads e conclua o
              OAuth. Use o mesmo Client ID/secret do Calendar/Analytics, com
              escopo adwords.
            </p>
            <Button asChild className="mt-3" size="sm">
              <Link href="/app/integrations">Ir para Integrações</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              Conectado
            </div>
            {status.customerId && (
              <p className="text-muted-foreground">
                ID da conta (customer):{" "}
                <code className="text-foreground">{status.customerId}</code>
              </p>
            )}
            {!status.developerTokenConfigured && (
              <p className="text-amber-200/90 text-xs">
                Para o Aureon consultar métricas via API no futuro, será
                necessário{" "}
                <code className="text-foreground">GOOGLE_ADS_DEVELOPER_TOKEN</code>{" "}
                no .env (token de desenvolvedor no Centro de API do Google
                Ads).
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-semibold text-foreground mb-2">
              Onde ver campanhas e resultados
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Relatórios completos (impressões, cliques, conversões, custo)
              estão no painel oficial. Use o botão acima{" "}
              <strong>Abrir Google Ads</strong> ou{" "}
              <a
                className="text-primary underline"
                href="https://ads.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                ads.google.com
              </a>
              .
            </p>
            <h3 className="text-sm font-medium text-foreground mt-4 mb-2">
              ID da conta (opcional)
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Formato numérico (ex.: 1234567890). Aparece no canto superior
              direito do Google Ads ao selecionar a conta.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex.: 1234567890"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm w-48"
                value={customerInput}
                onChange={(e) => setCustomerInput(e.target.value)}
              />
              <Button
                size="sm"
                disabled={setCustomerMutation.isPending || !customerInput.trim()}
                onClick={() =>
                  setCustomerMutation.mutate(customerInput.trim())
                }
              >
                Salvar ID
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
