"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiHeaders, API_URL } from "@/lib/api";
import {
  CreditCard,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
} from "lucide-react";

type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

interface AsaasCharge {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  billingType: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeUrl?: string;
}

// ── Asaas Charge Modal ─────────────────────────────────────────────────────
function AsaasChargeModal({
  opportunityTitle,
  opportunityValue,
  contactName,
  onClose,
}: {
  opportunityTitle: string;
  opportunityValue: number;
  contactName?: string;
  onClose: () => void;
}) {
  const today = new Date();
  today.setDate(today.getDate() + 3);
  const defaultDue = today.toISOString().split("T")[0];

  const [form, setForm] = useState({
    customerName: contactName ?? "",
    customerEmail: "",
    customerCpfCnpj: "",
    value: String(opportunityValue || ""),
    dueDate: defaultDue,
    description: opportunityTitle,
    billingType: "PIX" as BillingType,
  });
  const [charge, setCharge] = useState<AsaasCharge | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/integrations/asaas/charges`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          ...form,
          value: parseFloat(form.value),
        }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data?.charge) setCharge(data.charge);
    },
  });

  const paymentUrl =
    charge?.invoiceUrl ?? charge?.bankSlipUrl ?? charge?.pixQrCodeUrl ?? null;

  function copyLink() {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Criar cobrança</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{opportunityTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!charge ? (
          <>
            {/* Form */}
            <div className="space-y-3">
              {[
                { key: "customerName", label: "Nome do cliente", placeholder: "João Silva" },
                { key: "customerEmail", label: "E-mail (opcional)", placeholder: "joao@empresa.com" },
                { key: "customerCpfCnpj", label: "CPF/CNPJ (opcional)", placeholder: "000.000.000-00" },
                { key: "description", label: "Descrição", placeholder: "Referente a..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full h-9 rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    className="w-full h-9 rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full h-9 rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Forma de pagamento</label>
                <div className="flex gap-2">
                  {(["PIX", "BOLETO", "CREDIT_CARD"] as BillingType[]).map((bt) => (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, billingType: bt }))}
                      className={`flex-1 h-9 rounded-xl text-xs font-medium transition-all border ${
                        form.billingType === bt
                          ? "gradient-primary text-white border-primary/30 shadow-sm"
                          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {bt === "CREDIT_CARD" ? "Cartão" : bt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {createMutation.data?.error && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {createMutation.data.error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}
                className="border-white/[0.08] bg-white/[0.03] text-xs">
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!form.customerName || !form.value || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="gradient-primary text-white border-0 glow-primary-sm text-xs gap-1.5"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5" />
                )}
                Gerar cobrança
              </Button>
            </div>
          </>
        ) : (
          /* Success state */
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Cobrança criada!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(charge.value)}
                  {" · "}Vence em {new Date(charge.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>

            {paymentUrl && (
              <div className="flex gap-2">
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl gradient-primary text-white text-xs font-medium glow-primary-sm hover:opacity-90 transition-opacity"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir link de pagamento
                </a>
                <button
                  onClick={copyLink}
                  className="h-9 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={onClose}
              className="w-full border-white/[0.08] bg-white/[0.03] text-xs">
              Fechar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [showCharge, setShowCharge] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: () =>
      fetch(`${API_URL}/opportunities/${id}`, { headers: apiHeaders }).then(
        (r) => (r.ok ? r.json() : null)
      ),
  });

  const { data: asaasStatus } = useQuery({
    queryKey: ["asaas-status"],
    queryFn: () =>
      fetch(`${API_URL}/integrations/asaas/status`, { headers: apiHeaders })
        .then((r) => (r.ok ? r.json() : { connected: false })),
    staleTime: 60_000,
  });

  if (isLoading) return <p className="p-8">Carregando...</p>;
  if (error || !data)
    return <p className="p-8 text-destructive">Oportunidade não encontrada.</p>;

  return (
    <div className="space-y-8">
      {showCharge && (
        <AsaasChargeModal
          opportunityTitle={data.title}
          opportunityValue={Number(data.value || 0)}
          contactName={data.contact?.name}
          onClose={() => setShowCharge(false)}
        />
      )}

      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Voltar
        </Button>
        {asaasStatus?.connected && (
          <Button
            size="sm"
            onClick={() => setShowCharge(true)}
            className="border-violet-500/20 bg-violet-500/[0.06] text-violet-400 hover:bg-violet-500/10 gap-1.5 text-xs border"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Criar cobrança
          </Button>
        )}
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
              <span className="text-muted-foreground">Valor:</span>{" "}
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(data.value || 0))}
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
