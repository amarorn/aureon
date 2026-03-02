# Arquitetura Aureon

## Visão Geral

Sistema multi-tenant com backend NestJS, frontend Next.js e infraestrutura assíncrona.

## Multi-tenancy

- Todas as entidades transacionais possuem `tenant_id` (UUID)
- Row Level Security (RLS) no PostgreSQL para isolamento
- Contexto de tenant definido via `set_config('app.tenant_id', ...)` por request

## Fluxo de Dados

```
Frontend (Next.js)
    |
    | REST / WebSocket
    v
Backend (NestJS)
    |
    +---> PostgreSQL (transacional)
    +---> Redis (cache, BullMQ)
    +---> Kafka/Redpanda (eventos)
    +---> ClickHouse (analytics)
    +---> OpenSearch (busca)
```

## Módulos Planejados

1. **CRM**: Contatos, pipeline, oportunidades, tarefas
2. **Conversations**: Inbox, canais, templates, atribuição
3. **Telefonia**: Power dialer, chamadas, filas (implementado)
4. **Automação**: Workflows, triggers, ações
5. **Dashboard**: Métricas, funil, filtros (implementado)
6. **Integrações**: Google Analytics, Google Business Profile, Facebook Ads, Google Ads (implementado)

## Fase 1 - CRM (Implementado)

- [x] Entidade Contact com tenant_id
- [x] Entidade Opportunity com estágios
- [x] Entidade Tag
- [x] Entidade Task (contato/oportunidade)
- [x] Pipeline customizável
- [x] CRUD de contatos e oportunidades
- [x] Histórico de interações
- [x] UI pipeline com drag-and-drop
- [x] Edição de contatos

### Endpoints API

- `POST/GET/PUT/DELETE /api/v1/contacts`
- `POST/GET/PUT/DELETE /api/v1/tasks` - `?contactId=` ou `?opportunityId=`
- `PUT /api/v1/tasks/:id/toggle` - marcar concluída
- `POST/GET/PUT/DELETE /api/v1/opportunities`
- `PUT /api/v1/opportunities/:id/stage` - movimentar estágio
- `POST/GET/DELETE /api/v1/pipelines`
- `POST/GET/DELETE /api/v1/tags`
- `POST/GET/DELETE /api/v1/interactions` - `?contactId=` ou `?opportunityId=`

## Fase 2 - Conversations (Implementado)

- [x] Inbox unificada
- [x] Canais (WhatsApp, e-mail, Instagram, Telegram)
- [x] Envio de mensagens com templates e anexos
- [x] Atribuição e status (aberta/fechada)
- [x] Criar tarefa/oportunidade via conversa

### Endpoints API Conversations

- `POST/GET/PUT/DELETE /api/v1/channels`
- `POST/GET/PUT/DELETE /api/v1/conversations` - `?status=` `?contactId=` `?channelId=`
- `POST/GET /api/v1/conversations/:id/messages`
- `PUT /api/v1/conversations/:id/assign` `PUT /api/v1/conversations/:id/close` `PUT /api/v1/conversations/:id/reopen`
- `POST /api/v1/conversations/:id/create-task` `POST /api/v1/conversations/:id/create-opportunity`
- `POST/GET/PUT/DELETE /api/v1/message-templates`

Header `X-Tenant-Id` ou `DEFAULT_TENANT_ID` no .env

### Telefonia

- `POST/GET/DELETE /api/v1/calls` - registro de chamadas, `?contactId=`
- `POST/GET /api/v1/call-queue` - fila de chamadas
- `GET /api/v1/call-queue/next` - próximo da fila
- `POST /api/v1/call-queue/:id/completed` - marcar como chamada feita
- `POST /api/v1/call-queue/:id/skipped` - pular
- `DELETE /api/v1/call-queue/clear` - limpar fila

### Dashboard

- `GET /api/v1/dashboard/metrics` - `?startDate=` `?endDate=` `?pipelineId=` `?userId=`
- Métricas: total oportunidades, receita ganha, taxa conversão, ticket médio, sales velocity, duração ciclo, lead source

### Integrações

- `POST/GET /api/v1/integrations` - criar/listar integrações
- `GET /api/v1/integrations/oauth/url/:provider` - URL OAuth (Google Analytics, Google Business Profile, Facebook Ads, Google Ads)
- `GET /api/v1/integrations/oauth/callback` - callback OAuth (redirect)
- `POST /api/v1/integrations/:id/disconnect` - desconectar
