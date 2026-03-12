# Integração LinkedIn

## Checklist rápido (Lead Gen em lote)

1. **`INTEGRATION_LINKEDIN_LEADGEN_SCOPES=true`** no `.env` (ou credenciais por tenant com mesmo fluxo).
2. **Reconectar** LinkedIn em `/app/integrations` (desconectar → conectar de novo) para o token incluir `r_marketing_leadgen_automation`.
3. **Produto Lead Sync** aprovado no app [LinkedIn Developers](https://www.linkedin.com/developers/) (programa à parte do Advertising API).
4. **Configurar `ownerUrn`** via **PUT** (abaixo) — sponsoredAccount (ads) ou organization (orgânico).
5. **POST** `sync-leadgen-batch` ou **GET** `lead-form-responses` para testar.

---

## 1. Escopos e reconexão

| Escopo | Uso |
|--------|-----|
| `openid` + `profile` + `email` | Sign In (usuário único / userinfo) |
| `r_marketing_leadgen_automation` | Lead Sync: `leadFormResponses`, `leadForms`, webhooks |

- Com **`INTEGRATION_LINKEDIN_LEADGEN_SCOPES=true`**, a URL de autorização já inclui o escopo Lead Gen.
- **Obrigatório reconectar** depois de mudar o env (token antigo não ganha escopo novo).
- Redirect no app LinkedIn:  
  `{API_BASE_URL}/{API_PREFIX}/integrations/oauth/callback`  
  Ex.: `http://localhost:3001/api/v1/integrations/oauth/callback`

**Deprecados (não usar):** `r_liteprofile`, `r_basicprofile`, `r_emailaddress`.

---

## 2. Owner URN (sponsoredAccount vs organization)

A API de respostas exige **quem é o dono** do formulário:

| Tipo de lead | `leadType` | `ownerUrn` (exemplo) |
|--------------|------------|----------------------|
| Anúncios (Campaign Manager) | `SPONSORED` | `urn:li:sponsoredAccount:522529623` |
| Página de produto org | `ORGANIZATION_PRODUCT` | `urn:li:organization:5509810` |
| Company Page | `COMPANY` | `urn:li:organization:5509810` |
| Evento | `EVENT` | conforme doc LinkedIn |

- **sponsoredAccount**: ID numérico da conta de anúncios (Campaign Manager).
- **organization**: ID numérico da organização/página de empresa.
- O membro que autorizou o OAuth precisa ter papel adequado (ex.: LEAD_GEN_FORMS_MANAGER, ADMINISTRATOR na página, etc.).

Onde achar o ID: URL do Campaign Manager / página da empresa, ou APIs `adAccounts` / organização conforme [Account Access](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/account-access-controls).

---

## 3. Configurar leadgen-config (PUT)

**PUT** `/integrations/linkedin/leadgen-config`  
Headers: `X-Tenant-Id`, `Content-Type: application/json`

**Exemplo sponsoredAccount (ads):**

```json
{
  "ownerUrn": "urn:li:sponsoredAccount:522529623",
  "leadType": "SPONSORED",
  "versionedLeadGenFormUrn": "urn:li:versionedLeadGenForm:(urn:li:leadGenForm:3162,1)"
}
```

**Exemplo organization (orgânico):**

```json
{
  "ownerUrn": "urn:li:organization:5509810",
  "leadType": "COMPANY"
}
```

- `versionedLeadGenFormUrn` é **opcional** — filtra um formulário; sem ele vêm respostas de todos os forms daquele owner (conforme limites da API).
- **GET** `/integrations/linkedin/leadgen-config` — confere o que está salvo em `integration.config`.

---

## 4. API (referência)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/integrations/oauth/url/linkedin` | Inicia OAuth (Lead Gen se env true) |
| GET | `/integrations/linkedin/status` | `{ connected }` |
| GET | `/integrations/linkedin/userinfo` | Debug OpenID |
| POST | `/integrations/linkedin/sync-leads` | 1 Contact via userinfo |
| PUT | `/integrations/linkedin/leadgen-config` | Grava ownerUrn + leadType + formUrn opcional |
| GET | `/integrations/linkedin/leadgen-config` | Lê config |
| GET | `/integrations/linkedin/lead-form-responses` | Lista respostas (`ownerUrn` na query ou na config) |
| POST | `/integrations/linkedin/sync-leadgen-batch` | Importa em lote → Contact (dedupe e-mail) |

**curl exemplo (sync em lote):**

```bash
curl -X POST "$API/integrations/linkedin/sync-leadgen-batch" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"maxResponses": 25}'
```

Body opcional: `ownerUrn`, `leadType`, `versionedLeadGenFormUrn` sobrescrevem a config salva.

---

## 5. Mapeamento resposta → Contact

- `formResponse.answers[]`: `textQuestionAnswer`, `emailQuestionAnswer`, `phoneNumberQuestionAnswer`.
- E-mail por regex; telefone por padrão numérico; nome = primeiro texto que não for e-mail.
- `source: LinkedIn Lead Gen`; `notes` com `responseId` / `submittedAt`.

---

## 6. Banco (enum PostgreSQL)

Se ainda não existir o provider `linkedin`:

```sql
ALTER TYPE integrations_provider_enum ADD VALUE IF NOT EXISTS 'linkedin';
```

---

## 7. Versão REST

O backend usa header `LinkedIn-Version: 202411`. Se a API retornar **403**, atualize conforme [versionamento Marketing API](https://learn.microsoft.com/en-us/linkedin/marketing/versioning).

---

## Env resumido

```env
INTEGRATION_LINKEDIN_CLIENT_ID=
INTEGRATION_LINKEDIN_CLIENT_SECRET=
INTEGRATION_LINKEDIN_LEADGEN_SCOPES=true
```

Credenciais **por tenant**: `PUT /integrations/oauth-credentials` com bloco `linkedin` — ver `docs/TENANT_OAUTH.md`.
