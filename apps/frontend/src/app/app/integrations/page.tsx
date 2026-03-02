"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiHeaders, API_URL } from "@/lib/api";
import { Puzzle, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const PROVIDERS = [
  {
    id: "google_analytics",
    name: "Google Analytics",
    description: "Métricas de tráfego e conversões do site",
    color: "from-orange-500 to-amber-600",
    initials: "GA",
  },
  {
    id: "google_business_profile",
    name: "Google Business Profile",
    description: "Perfil de negócio e avaliações",
    color: "from-blue-500 to-cyan-600",
    initials: "GB",
  },
  {
    id: "facebook_ads",
    name: "Facebook Ads",
    description: "Campanhas e métricas de anúncios",
    color: "from-indigo-500 to-blue-600",
    initials: "FB",
  },
  {
    id: "google_ads",
    name: "Google Ads",
    description: "Campanhas de anúncios no Google",
    color: "from-green-500 to-emerald-600",
    initials: "GG",
  },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

interface Integration {
  id: string;
  provider: string;
  status: string;
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(() => {
    if (successParam) {
      return { type: "success", text: `Integração ${successParam} conectada com sucesso.` };
    }
    if (errorParam) {
      return { type: "error", text: decodeURIComponent(errorParam) };
    }
    return null;
  });

  useEffect(() => {
    if (successParam || errorParam) {
      window.history.replaceState({}, "", "/app/integrations");
    }
  }, [errorParam, successParam]);

  useEffect(() => {
    fetch(`${API_URL}/integrations`, { headers: apiHeaders })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setIntegrations(Array.isArray(data) ? data : []))
      .catch(() => setIntegrations([]))
      .finally(() => setLoading(false));
  }, []);

  function getIntegration(provider: ProviderId) {
    return integrations.find((i) => i.provider === provider);
  }

  async function handleConnect(provider: ProviderId) {
    try {
      const res = await fetch(`${API_URL}/integrations/oauth/url/${provider}`, {
        headers: apiHeaders,
      });
      const data = await res.json();
      if (data?.url) window.location.assign(data.url);
      else setMessage({ type: "error", text: "Integração não configurada." });
    } catch {
      setMessage({ type: "error", text: "Erro ao iniciar conexão." });
    }
  }

  async function handleDisconnect(id: string) {
    try {
      const res = await fetch(`${API_URL}/integrations/${id}/disconnect`, {
        method: "POST",
        headers: apiHeaders,
      });
      if (res.ok) {
        setIntegrations((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: "disconnected" } : i))
        );
      }
    } catch {
      setMessage({ type: "error", text: "Erro ao desconectar." });
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg glow-primary-sm">
          <Puzzle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Conecte suas ferramentas de marketing e análise
          </p>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`flex items-center gap-3 rounded-xl p-4 text-sm ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Integrations grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {PROVIDERS.map((provider) => {
            const integration = getIntegration(provider.id);
            const isConnected = integration?.status === "connected";

            return (
              <div
                key={provider.id}
                className="glass-card rounded-2xl p-6 hover:scale-[1.01] transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center shadow-md`}
                    >
                      <span className="text-white text-xs font-bold">{provider.initials}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{provider.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                    </div>
                  </div>
                  {isConnected && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                      Conectado
                    </Badge>
                  )}
                </div>
                <div className="flex justify-end">
                  {isConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => integration && handleDisconnect(integration.id)}
                      className="border-white/[0.08] bg-white/[0.03] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all text-xs"
                    >
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(provider.id)}
                      className="gradient-primary text-white hover:opacity-90 transition-opacity border-0 text-xs"
                    >
                      Conectar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
