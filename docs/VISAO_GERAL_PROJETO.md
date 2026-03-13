# Visão Geral do Projeto Aureon

Documento consolidado com contexto geral, implementações e roadmap do projeto.

---

## Visão do Produto

**Aureon** é uma plataforma SaaS multi-tenant para gestão de relacionamento (CRM), comunicação, automação, telefonia e análise de vendas. O produto integra vendas, marketing, suporte e operações em um único ambiente.

---

## Stack Tecnológica

| Camada | Tecnologia | Status |
|--------|------------|--------|
| Backend | Node.js, NestJS, TypeScript | Implementado |
| Banco Transacional | PostgreSQL (multi-tenant via `tenant_id`, RLS) | Implementado |
| Event Streaming | Kafka / Redpanda | Docker disponível, integração pendente |
| Processamento Assíncrono | Redis, BullMQ | Docker disponível, integração pendente |
| Banco Analítico | ClickHouse | Docker disponível, integração pendente |
| Search | OpenSearch | Docker disponível, integração pendente |
| Frontend | Next.js 16, TypeScript, TailwindCSS, ShadCN, Zustand, TanStack Query, ECharts | Implementado |
| WebSockets | Socket.io | Pendente |

---

## Estrutura do Projeto

```
aureon/
├── apps/
│   ├── backend/          # NestJS API
│   │   └── src/
│   │       ├── crm/          # Contatos, oportunidades, pipeline, tarefas, tags, interações
│   │       ├── conversations/ # Canais, conversas, mensagens, templates
│   │       ├── telephony/    # Chamadas, power dialer, fila
│   │       ├── automation/   # Workflows, triggers, ações
│   │       ├── dashboard/    # Métricas e funil
│   │       ├── integrations/ # OAuth, WhatsApp, Asaas, LinkedIn, Zoom
│   │       ├── analytics/    # Google Analytics
│   │       ├── ads/          # Google Ads
│   │       ├── business/     # Google Business Profile
│   │       ├── calendar/     # Appointments, Google Calendar, Outlook Calendar
│   │       ├── email-marketing/ # Campanhas, templates
│   │       ├── reputation/   # Avaliações
│   │       ├── proposals/    # Propostas comerciais
│   │       └── tenant/       # Multi-tenancy
│   └── frontend/         # Next.js app
├── docs/
├── docker-compose.yml
└── package.json
```

---

## Infraestrutura (Docker)

| Serviço | Porta | Uso |
|---------|-------|-----|
| PostgreSQL | 5433 | Banco transacional |
| Redis | 6379 | Cache, BullMQ |
| Redpanda | 9092 | Eventos (Kafka) |
| ClickHouse | 8123 | Analytics |
| OpenSearch | 9200 | Busca |

Comando para subir: `docker compose up -d postgres redis`

---

## Multi-tenancy

- Todas as entidades possuem `tenant_id` (UUID)
- Header `X-Tenant-Id` ou variável `DEFAULT_TENANT_ID` no `.env`
- OAuth por tenant em `tenants.oauth_config` (JSONB)
- Row Level Security (RLS) no PostgreSQL – migrations criadas, aplicação pendente

---

## O que Está Implementado

### Fase 0 – Fundação
- [x] Monorepo (npm workspaces)
- [x] Backend NestJS
- [x] Frontend Next.js
- [x] Docker (PostgreSQL, Redis, Redpanda, ClickHouse, OpenSearch)
- [x] TypeORM com entidades

### Fase 1 – CRM
- [x] **Contact** – CRUD, tags, interações
- [x] **Opportunity** – pipeline, estágios, receita
- [x] **Pipeline** e **Stage** – customizáveis, drag-and-drop
- [x] **Task** – vinculada a contato/oportunidade, toggle concluído
- [x] **Tag** – organização de contatos
- [x] **Interaction** – histórico de interações
- [x] UI pipeline com drag-and-drop
- [x] Edição de contatos no frontend

### Fase 2 – Conversations
- [x] Inbox unificada
- [x] **Channel** – WhatsApp, e-mail, Instagram, Telegram
- [x] **Conversation** – status aberta/fechada, atribuição
- [x] **Message** – envio, templates, anexos
- [x] **MessageTemplate** – variáveis
- [x] Criar tarefa/oportunidade a partir da conversa
- [x] Atribuição e reabertura de conversas

### Fase 3 – Telefonia
- [x] **Call** – registro de chamadas
- [x] Power dialer
- [x] Fila de chamadas (CallQueue)
- [x] Histórico por contato
- [x] Associação chamada–contato

### Fase 4 – Automação
- [x] **Workflow** – modelo de automação
- [x] Triggers: `contact_created`, `opportunity_created`, `opportunity_moved`, `task_created`
- [x] Ações: criar tarefa, atualizar estágio, notificação (placeholder)

### Fase 5 – Dashboard
- [x] Métricas: oportunidades, receita, taxa de conversão
- [x] Ticket médio, Sales Velocity, duração do ciclo
- [x] Funil de vendas
- [x] Lead Source
- [x] Filtros: período, pipeline, usuário
- [x] API `GET /api/v1/dashboard/metrics`

### Fase 6 – Integrações
- [x] OAuth: Google Analytics, Google Business Profile, Facebook Ads, Google Ads
- [x] LinkedIn OAuth + Lead Gen (config, sync batch)
- [x] Zoom OAuth
- [x] **Pagamentos (Asaas, Mercado Pago, Stripe)** – cobranças vinculadas ao pipeline
  - Asaas: PIX, boleto, cartão (Brasil)
  - Mercado Pago: gateway dominante no Brasil
  - Stripe: clientes internacionais (USD)
  - Entidade Payment + API GET /payments?opportunityId= e ?pipelineId=
- [x] WhatsApp (status, config, mensagens, templates)
- [x] Google Calendar e Microsoft 365 / Outlook Calendar (appointments, sync, import, opção Teams)
- [x] Email Marketing (campanhas, templates)
- [x] Reputação (review requests)
- [x] Propostas comerciais
- [x] UI de integrações em `/app/integrations`
- [ ] Zoom/Meet – reunião ao agendar (roadmap)

### Telefonia (Twilio)
- [x] **Twilio** – SMS + VoIP com provedor real
  - Config por tenant: Account SID, Auth Token, número Twilio (E.164)
  - Ligação outbound: Twilio liga para o contato; ao atender, conecta ao número do agente (TwiML Dial)
  - Gravação: `Record=true`; URL da gravação no callback de status e no registro da chamada
  - Transcrição: parâmetro `Transcribe` disponível na criação da chamada
  - Webhooks: `GET /telephony/twilio/connect?callId=` (TwiML), `POST /telephony/twilio/status` (atualiza Call), `POST /telephony/twilio/inbound-sms` (SMS recebido)
  - SMS: `POST /integrations/twilio/sms` (enviar); inbound persiste em `sms_messages`
  - Entidade `SmsMessage`: tenantId, contactId, phoneNumber, direction, body, externalSid
  - Em produção, configurar `API_BASE_URL` para a URL pública para os webhooks Twilio

### Módulos Adicionais
- [x] **Calendar** – appointments, sync/import Google Calendar e Outlook (Microsoft 365), opção reunião Teams
- [x] **Email Marketing** – campanhas, templates, envio
- [x] **Reputation** – solicitação de avaliações
- [x] **Proposals** – propostas comerciais com itens
- [x] **Analytics** – Google Analytics
- [x] **Ads** – Google Ads
- [x] **Business** – Google Business Profile

---

## Principais Endpoints da API

### CRM
| Método | Endpoint |
|--------|----------|
| POST/GET/PUT/DELETE | /api/v1/contacts |
| POST/GET/PUT/DELETE | /api/v1/opportunities |
| PUT | /api/v1/opportunities/:id/stage |
| POST/GET/DELETE | /api/v1/pipelines |
| POST/GET/DELETE | /api/v1/tags |
| POST/GET/PUT/DELETE | /api/v1/tasks |
| PUT | /api/v1/tasks/:id/toggle |
| POST/GET/DELETE | /api/v1/interactions |

### Conversations
| Método | Endpoint |
|--------|----------|
| POST/GET/PUT/DELETE | /api/v1/channels |
| POST/GET/PUT/DELETE | /api/v1/conversations |
| POST/GET | /api/v1/conversations/:id/messages |
| PUT | /api/v1/conversations/:id/assign \| close \| reopen |
| POST | /api/v1/conversations/:id/create-task \| create-opportunity |
| POST/GET/PUT/DELETE | /api/v1/message-templates |

### Telefonia
| Método | Endpoint |
|--------|----------|
| POST/GET/DELETE | /api/v1/calls |
| POST/GET | /api/v1/call-queue |
| GET | /api/v1/call-queue/next |
| POST | /api/v1/call-queue/:id/completed \| skipped |
| DELETE | /api/v1/call-queue/clear |

### Automação
| Método | Endpoint |
|--------|----------|
| POST/GET/PUT/DELETE | /api/v1/workflows |

### Dashboard
| Método | Endpoint |
|--------|----------|
| GET | /api/v1/dashboard/metrics |

### Integrações
| Método | Endpoint |
|--------|----------|
| GET | /api/v1/integrations/oauth/url/:provider |
| GET | /api/v1/integrations/oauth/callback |
| POST/GET | /api/v1/integrations |
| POST | /api/v1/integrations/:id/disconnect |

---

## O que Falta Implementar

### Segurança
- [ ] User + JWT + Refresh Token
- [ ] RBAC (roles e permissões)
- [ ] Criptografia de dados sensíveis
- [ ] Auditoria de eventos

### Infra e Observabilidade
- [ ] WebSockets (Socket.io) no backend e frontend
- [ ] Integração Kafka/Redpanda (produtores/consumidores)
- [ ] BullMQ em produção
- [ ] ClickHouse para ETL e analytics
- [ ] OpenSearch para busca
- [ ] OpenTelemetry, Prometheus, Grafana
- [ ] Sentry (error tracking)
- [ ] Aplicar e testar RLS no PostgreSQL

### Deploy
- [ ] Terraform
- [ ] CI/CD
- [ ] Ambientes Dev/Staging/Production

### Modelo de Eventos
- [ ] ContactCreated, ContactUpdated
- [ ] OpportunityCreated, OpportunityMoved, OpportunityWon
- [ ] MessageReceived, MessageSent
- [ ] CallStarted, CallFinished
- [ ] TaskCreated, TaskCompleted
- [ ] Projeções analíticas

---

## Configuração (Variáveis de Ambiente)

Ver `.env.example`. Principais:

- `DEFAULT_TENANT_ID` – tenant padrão
- `DB_*` – PostgreSQL
- `REDIS_URL` – Redis
- `NEXT_PUBLIC_API_URL` – URL da API para o frontend
- `INTEGRATION_*` – credenciais OAuth por provider

---

## Início Rápido

```bash
# 1. Infraestrutura
docker compose up -d postgres redis

# 2. Config
cp .env.example .env

# 3. Dependências
npm install

# 4. Schema do banco
npm run db:sync --workspace=backend

# 5. Seed (tenant e pipeline padrão)
npm run seed --workspace=backend

# 6. Rodar
npm run dev:backend
npm run dev:frontend
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:3001/api/v1  

---

## Documentos Relacionados

| Documento | Conteúdo |
|-----------|----------|
| [STATUS_PROJETO.md](STATUS_PROJETO.md) | Status detalhado por módulo e entidade |
| [ARQUITETURA.md](ARQUITETURA.md) | Fluxo de dados, multi-tenancy, endpoints |
| [TENANT_OAUTH.md](TENANT_OAUTH.md) | OAuth por tenant |
| [INTEGRACAO_LINKEDIN.md](INTEGRACAO_LINKEDIN.md) | LinkedIn Lead Gen |
| [INTEGRACAO_MEET_ZOOM.md](INTEGRACAO_MEET_ZOOM.md) | Zoom/Meet (roadmap) |

---

## Pontos Pendentes (Produto)

- Volume esperado de mensagens/dia
- Quantidade estimada de tenants
- SLA desejado
- Retenção de dados
- Compliance (LGPD/GDPR)
