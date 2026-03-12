# OAuth por tenant (cliente)

Cada cliente pode usar **seu próprio** app Google/Facebook/LinkedIn/Zoom. As variáveis `INTEGRATION_*` no `.env` passam a ser **fallback** quando o tenant não tem credenciais próprias.

## Onde fica salvo

- Coluna **`tenants.oauth_config`** (JSONB), mesclada via API.
- **Segredos** ficam no banco; em produção use criptografia em repouso, vault ou rotação.

## UI

Em **Integrações** (`/app/integrations`), cada provider OAuth tem **Configurar parâmetros** (mesmo padrão do WhatsApp Business): expandir, colar Client ID / Secret (ou App ID / Secret no Facebook), **Salvar credenciais**, depois **Conectar** para o redirect OAuth. Sem preencher, continua valendo o fallback do `.env`.

## API

**PUT** `/integrations/oauth-credentials`  
Headers: `X-Tenant-Id: <uuid do tenant>`  
Body (exemplo): mesclar só o que for necessário.

```json
{
  "google": {
    "clientId": "xxx.apps.googleusercontent.com",
    "clientSecret": "GOCSPX-..."
  },
  "google_calendar": {
    "clientId": "...",
    "clientSecret": "..."
  },
  "facebook_ads": {
    "appId": "...",
    "appSecret": "..."
  },
  "linkedin": {
    "clientId": "...",
    "clientSecret": "..."
  },
  "zoom": {
    "clientId": "...",
    "clientSecret": "..."
  }
}
```

- **Google**: por provider específico (`google_analytics`, `google_calendar`, …) ou chave **`google`** como padrão para todos os Google.
- **Facebook**: `appId` / `appSecret` (ou `clientId` / `clientSecret` como alias).

Depois de gravar, o fluxo **Conectar** em Integrações usa automaticamente as credenciais desse tenant. O **redirect URI** no console de cada app continua sendo o mesmo do backend (`.../integrations/oauth/callback`).

## Refresh Google

`refreshGoogleAccessToken` usa `google_calendar` ou `google` do tenant; senão cai no `.env`, para não quebrar refresh quando o token foi emitido pelo app do cliente.

## Ordem de precedência

1. `tenants.oauth_config.<provider>`
2. Variáveis de ambiente `INTEGRATION_*`
