# Status do Projeto Aureon

Comparativo entre o plano técnico/escopo e o que está implementado.

---

## Resumo Executivo

| Área | Status | Observação |
|------|--------|------------|
| Fase 0 – Fundação | Concluída | Monorepo, backend, frontend, Docker |
| Fase 1 – CRM | Concluída | Task, pipeline drag-and-drop, edição contatos |
| Fase 2 – Conversations | Concluída | Inbox, canais, mensagens, templates, anexos |
| Fase 3 – Telefonia | Concluída | Power dialer, histórico, fila |
| Fase 4 – Automação | Concluída | Workflows, triggers, ações |
| Fase 5 – Dashboard | Concluída | Métricas, funil, filtros |
| Fase 6 – Integrações | Concluída | OAuth Google/Facebook, UI |
| Segurança (JWT, RBAC) | Não implementada | |
| Observabilidade | Parcial | Health check apenas |

---

## O que falta (por categoria)

### Stack Tecnológica

| Item | Status | Ação |
|------|--------|------|
| WebSockets (backend) | Não | Integrar Socket.io no NestJS |
| WebSockets (frontend) | Não | Cliente para real-time |
| Kafka/Redpanda | Docker apenas | Integrar produtores/consumidores |
| Redis + BullMQ | Docker apenas | Filas assíncronas |
| ClickHouse | Docker apenas | ETL e materialized views |
| OpenSearch | Docker apenas | Índices de busca |
| OpenTelemetry | Não | Instrumentação |
| Prometheus + Grafana | Não | Métricas e dashboards |
| Sentry | Não | Error tracking |
| RLS PostgreSQL | Migrations criadas | Aplicar e testar |

### Entidades de Domínio

| Entidade | Status |
|----------|--------|
| Tenant | Implementada |
| User | Falta |
| Contact | Implementada |
| Opportunity | Implementada |
| Pipeline | Implementada |
| Stage | Implementada |
| Task | Falta |
| Conversation | Implementada |
| Message | Implementada |
| Call | Falta |
| Workflow | Falta |
| Event | Falta |

### Módulo 1 – CRM (concluído)

- [x] **Gestão de tarefas** – entidade Task, CRUD, associação a contato/oportunidade
- [x] UI completa para pipeline (drag-and-drop de oportunidades)
- [x] Edição de contatos no frontend

### Módulo 2 – Conversations

- [x] Inbox unificada
- [x] Canais (WhatsApp, e-mail, etc.)
- [x] Envio de mensagens
- [x] Templates com variáveis
- [x] Anexos
- [x] Atribuição de conversas
- [x] Status aberta/fechada
- [x] Criação de tarefa/oportunidade via conversa

### Módulo 3 – Telefonia (concluído)

- [x] Power dialer
- [x] Registro de chamadas
- [x] Associação com contatos
- [x] Histórico de chamadas
- [x] Fila de chamadas

### Módulo 4 – Automação (concluído)

- [x] Modelo de Workflow
- [x] Triggers por evento (contact_created, opportunity_created, opportunity_moved, task_created)
- [x] Ações: criar tarefa, atualizar estágio, notificação (send_message placeholder)

### Módulo 5 – Dashboard (concluído)

- [x] Total de oportunidades
- [x] Receita ganha
- [x] Taxa de conversão
- [x] Distribuição por estágio
- [x] Funil de vendas
- [x] Sales Velocity
- [x] Ticket médio
- [x] Duração média do ciclo
- [x] Lead Source
- [x] Filtros: período, pipeline, usuário

### Módulo 6 – Integrações (concluído)

- [x] Google Analytics
- [x] Google Business Profile
- [x] Facebook Ads
- [x] Google Ads
- [x] **LinkedIn OAuth** — OpenID + opcional `r_marketing_leadgen_automation` (`INTEGRATION_LINKEDIN_LEADGEN_SCOPES=true` + reconectar).
- [x] **LinkedIn Lead Gen batch** — `PUT .../linkedin/leadgen-config` (ownerUrn, leadType, formUrn), `GET .../lead-form-responses`, `POST .../sync-leadgen-batch` mapeia `formResponse.answers` → Contact (dedupe e-mail). UI de ownerUrn/disparo ainda roadmap.
- [ ] **Zoom / Google Meet** — roadmap na UI: reunião automática ao agendar; link na proposta. Calendar OAuth existe; falta `conferenceData` (Meet) e/ou Zoom API + campo em proposta/agendamento.

### Segurança

- [ ] JWT + Refresh Token
- [ ] RBAC (roles e permissões)
- [ ] Criptografia de dados sensíveis
- [ ] Auditoria de eventos

### Deploy e Infra

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

## Ordem sugerida de implementação

1. **Task (CRM)** – completar Fase 1
2. **Autenticação (User + JWT)** – base para RBAC e multi-usuário
3. **Eventos de domínio** – preparar para Kafka e analytics
4. **Conversations** – Fase 2
5. **Dashboard** – métricas com dados existentes
6. **Telefonia** – Fase 3
7. **Automação** – Fase 4
8. **Integrações** – Fase 6

---

## Pontos pendentes (documento original)

- Volume esperado de mensagens/dia
- Quantidade estimada de tenants
- SLA desejado
- Retenção de dados
- Compliance (LGPD/GDPR)
