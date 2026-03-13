"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiHeaders, API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Puzzle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";

// OAuth providers — connect via redirect
const OAUTH_PROVIDERS = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Inbox nativo: receba e envie emails diretamente pelo CRM, linkados ao contato",
    color: "from-red-500 to-red-700",
    initials: "GM",
  },
  {
    id: "outlook",
    name: "Outlook / Microsoft 365",
    description: "Inbox nativo via Microsoft Graph: emails sincronizados ao CRM em tempo real",
    color: "from-blue-600 to-indigo-700",
    initials: "OL",
  },
  {
    id: "google_calendar",
    name: "Google Agenda",
    description: "Sincronize agendamentos com o Google Calendar",
    color: "from-blue-500 to-indigo-600",
    initials: "GC",
  },
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
  {
    id: "zoom",
    name: "Zoom",
    description:
      "Criar reuniões via API; link no agendamento e proposta (join_url)",
    color: "from-blue-600 to-blue-800",
    initials: "Z",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description:
      "OpenID: perfil e e-mail; sync para Contact. Lead Gen em massa via Marketing API depois",
    color: "from-sky-600 to-blue-700",
    initials: "in",
  },
] as const;

/**
 * Roadmap: ainda sem OAuth/backend. Onde “paramos”:
 * - LinkedIn: não existe IntegrationProvider nem fluxo OAuth no integration.service.
 * - Zoom/Meet: idem; Google Calendar já conecta mas não cria Meet automaticamente nem link em proposta.
 */
const PLANNED_PROVIDERS = [
  {
    id: "linkedin_leadgen",
    name: "LinkedIn Lead Gen — UX",
    description:
      "Backend: PUT leadgen-config + GET lead-form-responses + POST sync-leadgen-batch. Falta UI para ownerUrn e disparo em um clique.",
    color: "from-sky-700 to-blue-800",
    initials: "LG",
    nextSteps:
      "INTEGRATION_LINKEDIN_LEADGEN_SCOPES=true + reconectar. Configurar ownerUrn (sponsoredAccount/organization). Ver docs/INTEGRACAO_LINKEDIN.md.",
  },
  {
    id: "meet_zoom_ux",
    name: "Meet + Zoom — UX unificada",
    description:
      "Checkbox na UI do calendário (addGoogleMeet / useZoomMeeting) e proposta exibindo meetingUrl",
    color: "from-indigo-600 to-violet-700",
    initials: "UX",
    nextSteps:
      "calendar/new com toggles Zoom/Meet; proposta [id] exibe meetingUrl. PDF: usar impressão do browser ou futuro endpoint PDF incluindo o link.",
  },
] as const;

// API-key providers — connect via form
const APIKEY_PROVIDERS = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Envie mensagens e notificações via WhatsApp Cloud API",
    color: "from-green-500 to-emerald-600",
    initials: "WA",
    fields: [
      { key: "phoneNumberId", label: "Phone Number ID", placeholder: "123456789012345", secret: false },
      { key: "accessToken", label: "Access Token", placeholder: "EAAxxxxxxxxxx...", secret: true },
    ],
    configEndpoint: "whatsapp/config",
    statusEndpoint: "whatsapp/status",
    docsHint: "Meta for Developers → seu app → WhatsApp → API Setup",
  },
  {
    id: "asaas",
    name: "Asaas",
    description: "Cobranças via PIX, boleto e cartão integradas ao pipeline",
    color: "from-violet-500 to-purple-600",
    initials: "AS",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "$aact_xxxxx...", secret: true },
      {
        key: "environment",
        label: "Ambiente",
        placeholder: "sandbox",
        secret: false,
        options: ["sandbox", "production"] as string[],
      },
    ],
    configEndpoint: "asaas/config",
    statusEndpoint: "asaas/status",
    docsHint: "asaas.com → Minha Conta → Integrações → API",
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    description: "Gateway dominante no Brasil — PIX, cartão, boleto, link de pagamento",
    color: "from-sky-500 to-blue-600",
    initials: "MP",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "APP_USR-xxxxx...", secret: true },
    ],
    configEndpoint: "mercadopago/config",
    statusEndpoint: "mercadopago/status",
    docsHint: "mercadopago.com/developers → Suas integrações → Credenciais de produção/sandbox",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Clientes internacionais — cartão, Apple Pay, Google Pay",
    color: "from-indigo-500 to-violet-600",
    initials: "ST",
    fields: [
      { key: "secretKey", label: "Secret Key", placeholder: "sk_live_xxxxx ou sk_test_xxxxx", secret: true },
    ],
    configEndpoint: "stripe/config",
    statusEndpoint: "stripe/status",
    docsHint: "dashboard.stripe.com/apikeys → Secret key (test ou live)",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Entrega de campanhas, sequências e emails transacionais",
    color: "from-cyan-500 to-sky-600",
    initials: "SG",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "SG.xxxxxxxxx", secret: true },
      { key: "fromEmail", label: "From Email", placeholder: "noreply@empresa.com", secret: false },
      { key: "fromName", label: "From Name", placeholder: "Equipe Aureon", secret: false },
      { key: "replyToEmail", label: "Reply-To (opcional)", placeholder: "suporte@empresa.com", secret: false },
    ],
    configEndpoint: "sendgrid/config",
    statusEndpoint: "sendgrid/status",
    docsHint: "sendgrid.com → Settings → API Keys. Use um sender/domain verificado.",
  },
  {
    id: "amazon-ses",
    name: "Amazon SES",
    description: "Envio transacional e em lote via infraestrutura AWS",
    color: "from-amber-500 to-orange-600",
    initials: "SES",
    fields: [
      { key: "accessKeyId", label: "Access Key ID", placeholder: "AKIA...", secret: false },
      { key: "secretAccessKey", label: "Secret Access Key", placeholder: "xxxxxxxx", secret: true },
      { key: "region", label: "Region", placeholder: "us-east-1", secret: false },
      { key: "fromEmail", label: "From Email", placeholder: "noreply@empresa.com", secret: false },
      { key: "fromName", label: "From Name", placeholder: "Equipe Aureon", secret: false },
      { key: "replyToEmail", label: "Reply-To (opcional)", placeholder: "suporte@empresa.com", secret: false },
      { key: "configurationSetName", label: "Configuration Set (opcional)", placeholder: "marketing-prod", secret: false },
    ],
    configEndpoint: "amazon-ses/config",
    statusEndpoint: "amazon-ses/status",
    docsHint: "AWS Console → SES → SMTP/IAM credenciais e domínio/email verificado na região escolhida.",
  },
  {
    id: "clicksign",
    name: "ClickSign",
    description: "Assinatura eletrônica de propostas com fluxo nativo no CRM",
    color: "from-emerald-500 to-teal-600",
    initials: "CS",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "clk_xxxxxxxxx", secret: true },
      { key: "baseUrl", label: "Base URL", placeholder: "https://sandbox.clicksign.com", secret: false },
    ],
    configEndpoint: "clicksign/config",
    statusEndpoint: "clicksign/status",
    docsHint: "developers.clicksign.com → token da API v3. Em produção, troque sandbox pela base da conta.",
  },
  {
    id: "docusign",
    name: "DocuSign",
    description: "Assinatura eletrônica com envelope e link de assinatura embutido",
    color: "from-sky-500 to-blue-700",
    initials: "DS",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "eyJ...", secret: true },
      { key: "accountId", label: "Account ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", secret: false },
      { key: "basePath", label: "Base Path", placeholder: "https://demo.docusign.net", secret: false },
      { key: "returnUrl", label: "Return URL (opcional)", placeholder: "http://localhost:3000/app/proposals", secret: false },
    ],
    configEndpoint: "docusign/config",
    statusEndpoint: "docusign/status",
    docsHint: "developers.docusign.com → use accountId e basePath da conta conectada. O access token pode ser gerado no ambiente demo para testes.",
  },
  {
    id: "instagram",
    name: "Instagram DM",
    description: "Receba e envie mensagens diretas do Instagram integradas ao inbox do CRM",
    color: "from-pink-500 to-rose-600",
    initials: "IG",
    fields: [
      {
        key: "igUserId",
        label: "Instagram Business Account ID",
        placeholder: "17841400000000000",
        secret: false,
      },
      {
        key: "pageAccessToken",
        label: "Page Access Token",
        placeholder: "EAAxxxxxxxxxxxxxxxx...",
        secret: true,
      },
    ],
    configEndpoint: "instagram/config",
    statusEndpoint: "instagram/status",
    docsHint: "Meta for Developers → Produtos → Instagram Messaging. Webhook callback: POST /integrations/instagram/webhook?tenantId={SEU_TENANT_ID}",
  },
] as const;

type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number]["id"];

const OAUTH_CREDENTIALS_DOCS =
  "Fallback global: .env INTEGRATION_* . Por tenant: preencha abaixo e use Conectar (redirect OAuth). Redirect no app do provedor = {API_BASE_URL}/{API_PREFIX}/integrations/oauth/callback";

type OAuthCredentialMode = "clientSecret" | "appSecret";

const OAUTH_PROVIDER_CREDENTIALS: Record<
  OAuthProviderId,
  { bodyKey: string; idLabel: string; secretLabel: string; mode: OAuthCredentialMode; hint?: string }
> = {
  google_calendar: {
    bodyKey: "google_calendar",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    mode: "clientSecret",
    hint: "Google Cloud Console → APIs → Credenciais → OAuth 2.0. Opcional: chave google no body aplica a todos os Google.",
  },
  google_analytics: {
    bodyKey: "google_analytics",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    mode: "clientSecret",
  },
  google_business_profile: {
    bodyKey: "google_business_profile",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    mode: "clientSecret",
  },
  google_ads: {
    bodyKey: "google_ads",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    mode: "clientSecret",
    hint: "Developer Token (GOOGLE_ADS_DEVELOPER_TOKEN) continua no .env do servidor.",
  },
  facebook_ads: {
    bodyKey: "facebook_ads",
    idLabel: "App ID",
    secretLabel: "App Secret",
    mode: "appSecret",
    hint: "Meta for Developers → seu app → Configurações → Básico",
  },
  zoom: {
    bodyKey: "zoom",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    mode: "clientSecret",
    hint: "marketplace.zoom.us → app OAuth → redirect igual ao callback do backend",
  },
  linkedin: {
    bodyKey: "linkedin",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    mode: "clientSecret",
    hint: "developers.linkedin.com → Auth → Redirect URL = callback do backend",
  },
  gmail: {
    bodyKey: "gmail",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    mode: "clientSecret",
    hint: "Google Cloud Console → APIs → Credenciais → OAuth 2.0. Escopos necessários: gmail.readonly, gmail.send, gmail.modify, userinfo.email",
  },
  outlook: {
    bodyKey: "outlook",
    idLabel: "Client ID (Application ID)",
    secretLabel: "Client Secret",
    mode: "clientSecret",
    hint: "portal.azure.com → App registrations → Authentication → Redirect URI = callback do backend",
  },
};

interface Integration {
  id: string;
  provider: string;
  status: string;
}

// ── OAuth Card (Conectar OU credenciais por tenant, estilo WhatsApp) ───────
function OAuthCard({
  provider,
  integration,
  onConnect,
  onDisconnect,
  onSaved,
}: {
  provider: (typeof OAUTH_PROVIDERS)[number];
  integration?: Integration;
  onConnect: (id: OAuthProviderId) => void;
  onDisconnect: (id: string) => void;
  onSaved: (msg: string) => void;
}) {
  const isConnected = integration?.status === "connected";
  const creds = OAUTH_PROVIDER_CREDENTIALS[provider.id];
  const [open, setOpen] = useState(false);
  const [idValue, setIdValue] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cardMsg, setCardMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!creds) return;
    const idTrim = idValue.trim();
    const secretTrim = secretValue.trim();
    if (!idTrim || !secretTrim) {
      setCardMsg({ type: "error", text: "Preencha ID e segredo para salvar credenciais do tenant." });
      return;
    }
    setSaving(true);
    setCardMsg(null);
    try {
      const block =
        creds.mode === "appSecret"
          ? { appId: idTrim, appSecret: secretTrim }
          : { clientId: idTrim, clientSecret: secretTrim };
      const res = await fetch(`${API_URL}/integrations/oauth-credentials`, {
        method: "PUT",
        headers: apiHeaders,
        body: JSON.stringify({ [creds.bodyKey]: block }),
      });
      if (res.ok) {
        setOpen(false);
        setIdValue("");
        setSecretValue("");
        onSaved(`${provider.name}: credenciais do cliente salvas. Use Conectar para autorizar.`);
        setCardMsg({
          type: "success",
          text: "Credenciais salvas. Clique em Conectar para abrir o OAuth.",
        });
      } else {
        const d = await res.json().catch(() => ({}));
        setCardMsg({ type: "error", text: (d as { message?: string })?.message ?? "Erro ao salvar." });
      }
    } catch {
      setCardMsg({ type: "error", text: "Erro de conexão." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-6 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center shadow-md`}>
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

      {cardMsg && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs mb-3",
            cardMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400",
          )}
        >
          {cardMsg.type === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          {cardMsg.text}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="border-white/[0.08] bg-white/[0.03] hover:bg-accent text-xs gap-1.5"
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Configurar parâmetros
        </Button>
        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => integration && onDisconnect(integration.id)}
            className="border-white/[0.08] bg-white/[0.03] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all text-xs"
          >
            Desconectar
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onConnect(provider.id)}
            className="gradient-primary text-white hover:opacity-90 transition-opacity border-0 text-xs"
          >
            Conectar
          </Button>
        )}
      </div>

      {open && creds && (
        <form onSubmit={handleSaveCredentials} className="mt-4 space-y-3 border-t border-white/[0.07] pt-4">
          <p className="text-[11px] text-muted-foreground/80">{OAUTH_CREDENTIALS_DOCS}</p>
          {creds.hint && (
            <p className="text-[11px] text-muted-foreground/60">{creds.hint}</p>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">{creds.idLabel}</label>
            <input
              type="text"
              value={idValue}
              onChange={(e) => setIdValue(e.target.value)}
              placeholder={creds.mode === "appSecret" ? "App ID" : "Client ID"}
              className="w-full h-9 rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">{creds.secretLabel}</label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={secretValue}
                onChange={(e) => setSecretValue(e.target.value)}
                placeholder="Segredo do app"
                className="w-full h-9 rounded-xl border border-border bg-background/50 px-3 pr-9 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="gradient-primary text-white border-0 glow-primary-sm text-xs"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Salvar credenciais
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Planned / roadmap (sem conectar ainda) ─────────────────────────────────
function PlannedCard({
  provider,
}: {
  provider: (typeof PLANNED_PROVIDERS)[number];
}) {
  const [showSteps, setShowSteps] = useState(false);
  return (
    <div className="glass-card rounded-2xl p-6 border border-dashed border-white/10 opacity-95">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center shadow-md`}
          >
            <span className="text-white text-[10px] font-bold">{provider.initials}</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{provider.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="text-xs border-amber-500/30 bg-amber-500/10 text-amber-400"
        >
          Em breve
        </Badge>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground hover:text-foreground -ml-2"
        onClick={() => setShowSteps((s) => !s)}
      >
        {showSteps ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
        Próximos passos técnicos
      </Button>
      {showSteps && (
        <p className="text-[11px] text-muted-foreground mt-2 pl-1 border-l-2 border-amber-500/40">
          {provider.nextSteps}
        </p>
      )}
    </div>
  );
}

// ── API Key Card ────────────────────────────────────────────────────────────
function ApiKeyCard({
  provider,
  onSaved,
}: {
  provider: (typeof APIKEY_PROVIDERS)[number];
  onSaved: (msg: string) => void;
}) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [cardMsg, setCardMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/integrations/${provider.statusEndpoint}`, { headers: apiHeaders })
      .then((r) => (r.ok ? r.json() : { connected: false }))
      .then((d) => setConnected(Boolean(d.connected)))
      .catch(() => setConnected(false));
  }, [provider.statusEndpoint]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setCardMsg(null);
    try {
      const res = await fetch(`${API_URL}/integrations/${provider.configEndpoint}`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(values),
      });
      if (res.ok) {
        setConnected(true);
        setOpen(false);
        onSaved(`${provider.name} configurado com sucesso.`);
      } else {
        const d = await res.json().catch(() => ({}));
        setCardMsg({ type: "error", text: (d as { message?: string })?.message ?? "Erro ao salvar." });
      }
    } catch {
      setCardMsg({ type: "error", text: "Erro de conexão." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-6 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center shadow-md`}>
            <span className="text-white text-xs font-bold">{provider.initials}</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{provider.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
          </div>
        </div>
        {connected === true && (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
            Conectado
          </Badge>
        )}
      </div>

      {cardMsg && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs mb-3 ${
          cardMsg.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          {cardMsg.type === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          {cardMsg.text}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          className="border-white/[0.08] bg-white/[0.03] hover:bg-accent text-xs gap-1.5"
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {connected ? "Reconfigurar" : "Configurar"}
        </Button>
      </div>

      {open && (
        <form onSubmit={handleSave} className="mt-4 space-y-3 border-t border-white/[0.07] pt-4">
          <p className="text-[11px] text-muted-foreground/60">{provider.docsHint}</p>
          {provider.fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                {field.label}
              </label>
              {"options" in field && field.options ? (
                <select
                  value={values[field.key] ?? field.placeholder}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  className="w-full h-9 rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors appearance-none"
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <input
                    type={field.secret && !showSecret[field.key] ? "password" : "text"}
                    placeholder={field.placeholder}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    className="w-full h-9 rounded-xl border border-border bg-background/50 px-3 pr-9 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  {field.secret && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowSecret((v) => ({ ...v, [field.key]: !v[field.key] }))
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      {showSecret[field.key] ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="gradient-primary text-white border-0 glow-primary-sm text-xs"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Salvar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
function IntegrationsContent() {
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(() => {
    if (successParam) return { type: "success", text: `Integração ${successParam} conectada com sucesso.` };
    if (errorParam) return { type: "error", text: decodeURIComponent(errorParam) };
    return null;
  });

  useEffect(() => {
    if (successParam || errorParam) window.history.replaceState({}, "", "/app/integrations");
  }, [errorParam, successParam]);

  useEffect(() => {
    fetch(`${API_URL}/integrations`, { headers: apiHeaders })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setIntegrations(Array.isArray(data) ? data : []))
      .catch(() => setIntegrations([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleOAuthConnect(provider: OAuthProviderId) {
    try {
      const res = await fetch(`${API_URL}/integrations/oauth/url/${provider}`, { headers: apiHeaders });
      const data = await res.json();
      if (res.ok && data?.url) window.location.assign(data.url);
      else setMessage({ type: "error", text: (data as { message?: string })?.message ?? "Integração não configurada." });
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
        setIntegrations((prev) => prev.map((i) => (i.id === id ? { ...i, status: "disconnected" } : i)));
      }
    } catch {
      setMessage({ type: "error", text: "Erro ao desconectar." });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg glow-primary-sm">
          <Puzzle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Conecte suas ferramentas ao CRM</p>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-3 rounded-xl p-4 text-sm ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">
              Comunicação & Pagamentos
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {APIKEY_PROVIDERS.map((provider) => (
                <ApiKeyCard
                  key={provider.id}
                  provider={provider}
                  onSaved={(msg) => setMessage({ type: "success", text: msg })}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">
              Marketing & Analytics
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {OAUTH_PROVIDERS.map((provider) => (
                <OAuthCard
                  key={provider.id}
                  provider={provider}
                  integration={integrations.find((i) => i.provider === provider.id)}
                  onConnect={handleOAuthConnect}
                  onDisconnect={handleDisconnect}
                  onSaved={(msg) => setMessage({ type: "success", text: msg })}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">
              Roadmap — prospecção & reuniões
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Ainda não há provider no backend; hoje só placeholders em calendário
              (local) e origem do contato. Expandir para OAuth e fluxos abaixo.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {PLANNED_PROVIDERS.map((provider) => (
                <PlannedCard key={provider.id} provider={provider} />
              ))}
            </div>
          </div>
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
