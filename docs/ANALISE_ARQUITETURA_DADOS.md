# Análise da base de dados – aderência ao sistema e integrações

Visão de **Data Architect**: modelo de dados, integração, governança e lacunas em relação ao sistema e às integrações atuais.

---

## 1. Visão geral do modelo

### 1.1 Multi-tenancy

- **Padrão**: todas as entidades transacionais possuem `tenant_id` (UUID), alinhado à arquitetura descrita em `ARQUITETURA.md`.
- **Tenant**: tabela `tenants` com `id`, `slug`, `name`, `active`, `oauth_config` (JSONB). Credenciais OAuth por cliente ficam em `oauth_config`; fallback em variáveis de ambiente.
- **Isolamento**: migration RLS existe (`1730419200000-EnableRLS.sql`) com função `set_tenant_context`; as policies por tabela estão em comentário — **recomendação**: ativar policies em todas as tabelas com `tenant_id` antes de produção.

### 1.2 Entidades transacionais (com tenant_id)

| Domínio        | Entidades | Observação |
|----------------|-----------|------------|
| CRM            | Contact, Tag, Pipeline, Stage, Opportunity, Task, Interaction | Consistente; Contact com `source` para origem (ex.: LinkedIn Lead Gen). |
| Conversations  | Channel, Conversation, Message, MessageAttachment, MessageTemplate | Channel com `config` JSONB; sem FK para `integrations`. |
| Telefonia      | Call, CallQueueItem, SmsMessage | Call com contactId; adequado ao dialer. |
| Calendar       | Appointment | `google_event_id`, `outlook_event_id`, `meeting_url`, `booking_external_id` — aderente a Google Calendar, Outlook, Zoom, Calendly/Cal.com. |
| Proposals      | Proposal, ProposalItem | `meeting_url`, campos de assinatura (Clicksign/DocuSign) — aderente. |
| Automação      | Workflow, WorkflowRun | trigger_config e actions em JSONB. |
| Email marketing| EmailCampaign, EmailCampaignRecipient, EmailTemplate | tenant_id presente. |
| Reputação      | ReviewRequest | tenant_id presente. |
| Pagamentos     | Payment | tenant_id presente. |
| Integrações    | Integration | Ver seção 2. |

---

## 2. Aderência às integrações atuais

### 2.1 Tabela `integrations`

- **Colunas**: `id`, `tenant_id`, `provider` (enum), `status`, `credentials` (JSONB), `config` (JSONB), `created_at`, `updated_at`.
- **Uso**:
  - **OAuth** (Google, Facebook, LinkedIn, Zoom): tokens em `credentials`; config opcional (ex.: Google Ads `customerId` em `config`).
  - **API key / config-only** (WhatsApp, Asaas, SendGrid, Amazon SES, Stripe, Mercado Pago, Twilio, Instagram, Calendly, Cal.com): parâmetros em `config`; `credentials` pode ser null ou usado para token.
  - **LinkedIn Lead Gen**: `config` com `leadGenOwnerUrn`, `leadGenLeadType`, `versionedLeadGenFormUrn` — aderente.

### 2.2 Enum `IntegrationProvider`

O enum em código inclui todos os providers usados na UI e nos serviços: Google (Analytics, Business Profile, Ads, Calendar), Facebook Ads, LinkedIn, Zoom, WhatsApp, Asaas, SendGrid, Amazon SES, Stripe, Mercado Pago, Twilio, Instagram, Calendly, Cal.com, Clicksign, DocuSign, Gmail, Outlook, RD Station, TikTok Ads, Slack, Microsoft Teams.

- **Risco**: em PostgreSQL o enum é criado/alterado via TypeORM `synchronize: true` ou migrations. Se o banco foi criado antes de algum valor (ex.: `linkedin`, `zoom`, `calendly`, `cal_com`), pode faltar valor no enum no DB — **recomendação**: garantir migration ou sync que adicione `ADD VALUE IF NOT EXISTS` para novos providers, ou usar `synchronize` em dev e migrations em prod.

### 2.3 Credenciais e configuração por tipo de integração

| Integração      | Onde fica | Aderência |
|-----------------|-----------|-----------|
| Google *        | `tenants.oauth_config` (por tenant) ou env; tokens em `integrations.credentials`; GA4/property em `integrations.config` | OK |
| Facebook Ads    | idem OAuth + `integrations.credentials` | OK |
| LinkedIn        | idem; Lead Gen em `integrations.config` | OK |
| Zoom            | idem; tokens em `integrations.credentials` | OK |
| WhatsApp        | `integrations.config` (phoneNumberId, accessToken) via IntegrationService create/update | OK |
| Asaas           | `integrations.config` (apiKey, environment) | OK |
| SendGrid / SES  | `integrations.config` (apiKey ou accessKeyId/secretAccessKey) | OK |
| Calendly/Cal.com| `integrations.config` (bookingUrl, baseUrl, userUri) | OK |
| Stripe/Mercado Pago / Twilio / Instagram | `integrations.config` e/ou credentials | OK |

Não há tabela separada por provedor; um único modelo `integrations` com `config`/`credentials` JSONB atende todas as integrações atuais — padrão adequado para flexibilidade e menos migrações.

### 2.4 Dados de negócio gerados pelas integrações

- **Contact.source**: preenchido no sync de LinkedIn Lead Gen e outras origens — adequado para rastreio de origem.
- **Appointment.meeting_url / google_event_id**: preenchidos por Zoom e Google Calendar — aderente.
- **Proposal.meeting_url**: usado na view/PDF — aderente.
- **Interaction**: não possui campo explícito “origem da integração” (ex.: `source` ou `integration_id`); hoje o tipo é note/email/call/meeting/task. Para auditoria fina (ex.: “interação veio do LinkedIn”) pode ser útil `source` ou `external_id` em interações futuras — **opcional**.

---

## 3. Lacunas e riscos

### 3.1 Segurança e governança

- **Segredos em texto**: `tenants.oauth_config` e `integrations.credentials`/`config` armazenam segredos em JSONB sem criptografia em repouso. **Recomendação**: em produção, usar criptografia (coluna ou vault) para campos sensíveis; documentado em `TENANT_OAUTH.md`.
- **RLS**: policies por tabela não estão aplicadas (apenas exemplo em comentário). **Recomendação**: implementar policy em todas as tabelas com `tenant_id` e garantir `set_config('app.tenant_id', ...)` em todo request autenticado.

### 3.2 Entidades ainda não modeladas (conforme STATUS_PROJETO)

- **User**: não existe tabela `users`; autenticação/JWT/RBAC ainda não implementados. Quando existir, será necessário `user_id` onde fizer sentido (ex.: atribuição de conversas, auditoria) e possível vínculo tenant ↔ user.
- **Event** (eventos de domínio para Kafka): não há tabela de eventos persistidos; hoje o uso de Kafka é planejado. Pode ser apenas event log ou outbox — definir quando integrar Kafka.

### 3.3 Canal ↔ Integração

- **Channel** (Conversations): tem `type` (whatsapp, email, instagram, telegram, other) e `config` JSONB, mas **não há FK para `integrations.id`**. Para canais que usam integração (ex.: WhatsApp do tenant), hoje a ligação é implícita por tenant + tipo. **Recomendação**: opcionalmente adicionar `integration_id` (nullable) em `channels` para amarrar canal à integração do tenant e evitar ambiguidade quando houver mais de uma conta WhatsApp por tenant.

### 3.4 Índices e desempenho

- TypeORM costuma criar PK e FKs; índices explícitos em `tenant_id`, `(tenant_id, provider)` em `integrations` e em colunas de filtro frequente (ex.: `contacts.tenant_id`, `appointments.start_at`) melhoram consultas. **Recomendação**: revisar queries quentes e adicionar índices via migration.
- **synchronize: true** em `sync.ts`: adequado para dev; em produção preferir **migrations** para controle de alterações de schema.

### 3.5 Consistência do STATUS_PROJETO

- Em `STATUS_PROJETO.md`, Task, Call e Workflow constam como “Falta”, mas as entidades existem no código. **Recomendação**: atualizar o documento para refletir que essas entidades estão implementadas.

---

## 4. Resumo executivo

| Critério                | Avaliação | Comentário |
|-------------------------|-----------|------------|
| Multi-tenancy           | Adequado  | tenant_id em todas as entidades transacionais; tenants.oauth_config para OAuth por cliente. |
| Integrações atuais      | Aderente | Um único modelo `integrations` (provider + credentials + config) cobre OAuth e API-key; LinkedIn Lead Gen em config. |
| Calendar / reuniões     | Aderente | appointment.meeting_url, google_event_id; proposal.meeting_url. |
| CRM e Contact           | Aderente | source para origem; interações e tarefas vinculadas. |
| Segurança (RLS, segredos)| Parcial  | RLS não aplicado por tabela; segredos em claro no DB. |
| Escalabilidade          | Aceitável| Índices podem ser refinados; schema suporta crescimento. |
| Governança              | Parcial  | Falta User e política de auditoria; documentação de oauth_config existe. |

**Conclusão**: A base de dados está **aderente ao sistema e às integrações atuais**. O desenho (tenant_id, tabela única de integrações com JSONB, campos de meeting e proposta) suporta bem os fluxos existentes. As principais melhorias são: ativar RLS, proteger segredos em produção, opcionalmente amarrar Channel à Integration e, quando houver usuários e eventos, evoluir o modelo (User, Event/outbox) e atualizar o STATUS_PROJETO.
