# Spec-Driven: Autenticação, Aprovação Manual e Liberação por Pacote

## 1. Objetivo

Implementar autenticação de usuários para o Aureon com as seguintes regras de negócio:

- O produto é SaaS multi-tenant.
- A equipe interna da Aureon tem acesso total ao sistema.
- O cliente cria conta pela tela pública de login/cadastro.
- Após o cadastro, o acesso não é liberado automaticamente.
- Um aviso deve ser enviado para a equipe de suporte/comercial.
- A equipe interna aprova o cadastro em uma área administrativa.
- Após aprovação, o cliente passa a acessar apenas os módulos liberados no pacote contratado.

## 2. Estado Atual

Hoje o projeto possui:

- Frontend Next.js com páginas [login](/Users/joseamaro/Documents/Projeto/aureon/apps/frontend/src/app/login/page.tsx) e [signup](/Users/joseamaro/Documents/Projeto/aureon/apps/frontend/src/app/signup/page.tsx) apenas visuais.
- Backend NestJS sem módulo real de autenticação.
- Multi-tenancy baseado em `X-Tenant-Id`, conforme [tenant.guard.ts](/Users/joseamaro/Documents/Projeto/aureon/apps/backend/src/common/guards/tenant.guard.ts) e [docs/ARQUITETURA.md](/Users/joseamaro/Documents/Projeto/aureon/docs/ARQUITETURA.md).
- Entidade [Tenant](/Users/joseamaro/Documents/Projeto/aureon/apps/backend/src/tenant/tenant.entity.ts) ainda sem vínculo com usuários, plano, papéis ou status de aprovação.

Conclusão: a autenticação deve substituir o acesso baseado em `NEXT_PUBLIC_TENANT_ID` fixo e passar a determinar `tenant`, `role` e `features` a partir da sessão autenticada.

## 3. Princípios da Solução

- `Tenant` representa a empresa cliente.
- `User` representa a pessoa que acessa o sistema.
- A equipe Aureon não deve depender do `tenant` do cliente para existir.
- Aprovação do cliente é separada de autenticação.
- Pacote contratado controla acesso funcional.
- Toda autorização deve acontecer no backend; frontend apenas reflete permissões.

## 4. Requisitos Funcionais

### 4.1 Cadastro público do cliente

Na tela pública, o usuário deve informar:

- nome
- email corporativo
- senha
- nome da empresa
- telefone ou WhatsApp
- pacote de interesse

Ao concluir:

- criar `tenant` em estado pendente
- criar primeiro usuário do tenant
- marcar esse usuário como `owner` do cliente
- deixar o acesso bloqueado até aprovação
- enviar notificação para equipe interna
- mostrar tela de "cadastro recebido / aguardando liberação"

### 4.2 Login

No login:

- usuários internos Aureon entram normalmente
- usuários clientes só entram se a conta estiver ativa e aprovada
- se o cadastro estiver pendente, o login retorna status explicando que aguarda liberação
- se o tenant estiver suspenso ou inativo, o login deve negar acesso

### 4.3 Aprovação manual

A equipe interna deve ter uma área admin para:

- listar cadastros pendentes
- visualizar dados da empresa e do responsável
- definir pacote contratado
- aprovar ou rejeitar cadastro
- ativar ou suspender tenant
- reenviar email de aprovação ou pendência

### 4.4 Liberação por pacote

Cada pacote define quais módulos/features estarão disponíveis.

Exemplo inicial:

- `starter`: CRM, contatos, oportunidades
- `growth`: starter + inbox + automação + calendar
- `scale`: growth + ads + analytics + proposals + reputation

O pacote deve controlar:

- acesso aos endpoints
- exibição de menus/páginas
- mensagens de bloqueio em módulos não contratados

### 4.5 Equipe interna com acesso total

Usuários internos da Aureon:

- não devem ser limitados por pacote do cliente
- podem acessar área administrativa
- podem impersonar tenant do cliente quando necessário

## 5. Requisitos Não Funcionais

- senhas com hash forte
- refresh token rotativo
- sessão revogável
- trilha de auditoria para aprovações
- mensagens de erro explícitas para status pendente, rejeitado e suspenso
- estrutura compatível com futuro RBAC fino

## 6. Modelo de Domínio Proposto

### 6.1 Entidades novas

#### `users`

- `id`
- `tenantId` nullable
- `name`
- `email` unique
- `passwordHash`
- `role`
- `status`
- `isPlatformUser`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

#### `auth_sessions`

- `id`
- `userId`
- `refreshTokenHash`
- `userAgent`
- `ipAddress`
- `expiresAt`
- `revokedAt`
- `createdAt`

#### `tenant_subscriptions`

- `id`
- `tenantId`
- `packageCode`
- `status`
- `startedAt`
- `endsAt` nullable
- `createdByUserId`
- `updatedByUserId`

#### `tenant_feature_flags`

- `id`
- `tenantId`
- `featureCode`
- `enabled`
- `source` (`package` | `manual_override`)

#### `tenant_access_requests`

- `id`
- `tenantId`
- `requestedPackageCode`
- `contactName`
- `contactEmail`
- `contactPhone`
- `companyName`
- `notes` nullable
- `status`
- `reviewedByUserId` nullable
- `reviewedAt` nullable
- `createdAt`

#### `audit_logs`

- `id`
- `actorUserId`
- `tenantId` nullable
- `action`
- `entityType`
- `entityId`
- `metadata` jsonb
- `createdAt`

### 6.2 Alterações em `tenants`

Adicionar em `tenants`:

- `type` (`customer` | `internal`)
- `approvalStatus` (`pending` | `approved` | `rejected`)
- `operationalStatus` (`active` | `suspended` | `disabled`)
- `approvedAt` nullable
- `approvedByUserId` nullable
- `currentPackageCode` nullable

### 6.3 Enum de papéis

- `platform_admin`: equipe Aureon com acesso total
- `platform_support`: equipe Aureon com acesso a admin e suporte
- `tenant_owner`: responsável principal do cliente
- `tenant_admin`: administrador do cliente
- `tenant_member`: usuário comum do cliente

### 6.4 Enum de status do usuário

- `pending_approval`
- `active`
- `invited`
- `blocked`

## 7. Regras de Negócio

1. Todo cadastro público cria `tenant.type = customer`.
2. Todo cadastro público cria `tenant.approvalStatus = pending`.
3. O primeiro usuário do tenant nasce como `tenant_owner`.
4. Usuário `pending_approval` não recebe sessão autenticada válida.
5. Aprovação só pode ser feita por `platform_admin` ou `platform_support`.
6. Tenant `approved` mas `suspended` continua sem acesso.
7. Usuário interno (`isPlatformUser = true`) pode operar sobre qualquer tenant.
8. Pacote contratado gera conjunto efetivo de features.
9. Overrides manuais podem liberar ou bloquear features específicas.
10. Troca de pacote deve atualizar permissões sem alterar histórico.

## 8. Fluxos Principais

### 8.1 Cadastro público

1. Usuário acessa `/login`.
2. Clica em `Criar conta`.
3. Preenche cadastro.
4. Backend valida unicidade de email e slug da empresa.
5. Backend cria tenant pendente.
6. Backend cria usuário `tenant_owner` com senha hasheada.
7. Backend cria `tenant_access_request`.
8. Backend notifica equipe interna por email e, opcionalmente, Slack/Teams.
9. Frontend redireciona para `/signup/success`.

### 8.2 Login cliente pendente

1. Cliente informa email e senha.
2. Backend valida credenciais.
3. Se `approvalStatus = pending`, retorna `403` com código de domínio `ACCOUNT_PENDING_APPROVAL`.
4. Frontend mostra tela informando que o suporte fará a liberação.

### 8.3 Aprovação interna

1. Usuário interno entra em `/admin/access-requests`.
2. Visualiza solicitação.
3. Define pacote.
4. Aprova cadastro.
5. Backend:
   - atualiza `tenants.approvalStatus = approved`
   - atualiza `tenants.currentPackageCode`
   - ativa usuário responsável
   - grava features efetivas
   - grava auditoria
   - envia email de liberação

### 8.4 Rejeição

1. Admin rejeita solicitação.
2. Backend marca request e tenant como rejeitados.
3. Login futuro responde `ACCOUNT_REJECTED`.
4. Opcionalmente envia email orientando contato comercial.

## 9. Contrato de Pacotes e Features

### 9.1 Package catalog

Criar catálogo versionado em código:

- `apps/backend/src/auth/billing/package-catalog.ts`

Estrutura sugerida:

```ts
export const PACKAGE_CATALOG = {
  starter: ["crm.contacts", "crm.opportunities", "crm.tasks"],
  growth: [
    "crm.contacts",
    "crm.opportunities",
    "crm.tasks",
    "inbox.core",
    "automation.core",
    "calendar.core",
  ],
  scale: [
    "crm.contacts",
    "crm.opportunities",
    "crm.tasks",
    "inbox.core",
    "automation.core",
    "calendar.core",
    "ads.google",
    "analytics.google",
    "proposals.core",
    "reputation.core",
  ],
} as const;
```

Observação: o catálogo precisa ficar no backend como fonte de verdade. O frontend pode consumir um endpoint com as features efetivas da sessão.

## 10. API Proposta

### 10.1 Auth pública

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### 10.2 Admin interna

- `GET /api/v1/admin/access-requests`
- `GET /api/v1/admin/access-requests/:id`
- `POST /api/v1/admin/access-requests/:id/approve`
- `POST /api/v1/admin/access-requests/:id/reject`
- `POST /api/v1/admin/tenants/:id/suspend`
- `POST /api/v1/admin/tenants/:id/reactivate`
- `PUT /api/v1/admin/tenants/:id/package`
- `GET /api/v1/admin/tenants/:id/features`
- `PUT /api/v1/admin/tenants/:id/features`

### 10.3 Gestão de usuários do tenant

- `POST /api/v1/users/invite`
- `GET /api/v1/users`
- `PUT /api/v1/users/:id/role`
- `PUT /api/v1/users/:id/status`

## 11. DTOs Essenciais

### `SignupDto`

- `name`
- `email`
- `password`
- `companyName`
- `companySlug` opcional
- `phone`
- `requestedPackageCode`

### `LoginDto`

- `email`
- `password`

### `ApproveAccessRequestDto`

- `packageCode`
- `notes` opcional
- `featureOverrides` opcional

## 12. Respostas de Erro de Domínio

Padronizar `code` no payload:

- `INVALID_CREDENTIALS`
- `ACCOUNT_PENDING_APPROVAL`
- `ACCOUNT_REJECTED`
- `TENANT_SUSPENDED`
- `FEATURE_NOT_INCLUDED`
- `INSUFFICIENT_ROLE`

Exemplo:

```json
{
  "statusCode": 403,
  "code": "ACCOUNT_PENDING_APPROVAL",
  "message": "Sua conta foi criada e está aguardando liberação da equipe Aureon."
}
```

## 13. Frontend Proposto

### 13.1 Público

#### `/login`

- remover botão `Continuar sem login`
- conectar submit no backend
- tratar estados pendente/rejeitado/suspenso

#### `/signup`

- incluir campos de empresa, telefone e pacote
- após submit, redirecionar para tela de confirmação

#### `/signup/success`

- mensagem clara:
  - cadastro recebido
  - equipe analisará a solicitação
  - acesso será liberado após aprovação

### 13.2 Área autenticada

Criar um `AuthProvider` que exponha:

- `user`
- `tenant`
- `roles`
- `features`
- `isPlatformUser`

Criar guardas de frontend:

- `RequireAuth`
- `RequireRole`
- `RequireFeature`

### 13.3 Admin interna

Criar namespace `/admin`:

- `/admin/access-requests`
- `/admin/tenants`
- `/admin/users`

Essa área só aparece para usuários internos.

## 14. Backend Proposto

### 14.1 Módulos

Criar novos módulos:

- `auth`
- `users`
- `admin-access`
- `audit`

### 14.2 Estratégia de autenticação

Recomendação:

- `access token` JWT curto, ex.: 15 min
- `refresh token` opaco ou JWT longo hasheado em banco, ex.: 30 dias
- cookie httpOnly para frontend web

Se o projeto quiser simplicidade inicial:

- access token em header `Authorization`
- refresh token em cookie httpOnly

### 14.3 Guards

Criar:

- `JwtAuthGuard`
- `RolesGuard`
- `FeaturesGuard`
- `PlatformAdminGuard`

O `TenantGuard` atual deve deixar de depender do header público fixo e passar a resolver `tenantId` da sessão autenticada, com exceção de webhooks públicos.

## 15. Notificações

### 15.1 Ao cadastrar

Enviar email para equipe interna usando [email-delivery.service.ts](/Users/joseamaro/Documents/Projeto/aureon/apps/backend/src/integrations/email-delivery.service.ts) ou fallback Slack/Teams com [team-notification.service.ts](/Users/joseamaro/Documents/Projeto/aureon/apps/backend/src/integrations/team-notification.service.ts).

Assunto sugerido:

- `Novo cadastro pendente de aprovação - Aureon`

Corpo deve incluir:

- empresa
- responsável
- email
- telefone
- pacote solicitado
- link da área admin

### 15.2 Ao aprovar

Enviar email ao cliente:

- conta liberada
- pacote ativo
- link de acesso

### 15.3 Ao rejeitar

Enviar email informando que o cadastro não foi liberado e indicando contato do suporte/comercial.

## 16. Segurança

- usar `bcrypt` ou `argon2` para hash de senha
- nunca armazenar refresh token em texto puro
- rate limit em `/auth/login`
- lock temporário após tentativas inválidas
- auditoria para login, logout, aprovação, suspensão e troca de pacote
- validar email único globalmente
- no futuro, suportar MFA para equipe interna

## 17. Migração de Arquitetura Multi-Tenant

Hoje o frontend usa `NEXT_PUBLIC_TENANT_ID` fixo em [api.ts](/Users/joseamaro/Documents/Projeto/aureon/apps/frontend/src/lib/api.ts). Isso deve ser removido para requests autenticadas.

Nova regra:

- requests autenticadas usam token/sessão
- backend deriva `tenantId` do usuário logado
- apenas usuários internos podem informar tenant alvo ao impersonar suporte

## 18. Fases de Implementação

### Fase 1

- modelagem de entidades e migrations
- signup/login básico
- JWT + refresh
- `GET /auth/me`
- bloquear conta pendente

### Fase 2

- admin interna de aprovação
- envio de email para suporte
- aprovação/rejeição
- pacote e features efetivas

### Fase 3

- guards por role e feature
- menu dinâmico no frontend
- bloqueio de módulos contratados

### Fase 4

- convite de novos usuários do tenant
- auditoria
- impersonation para suporte

## 19. Critérios de Aceite

1. Usuário pode criar conta pública sem acesso imediato.
2. Equipe interna recebe aviso do novo cadastro.
3. Cadastro aparece em lista admin de pendências.
4. Sem aprovação, login retorna `ACCOUNT_PENDING_APPROVAL`.
5. Após aprovação, login funciona.
6. Usuário cliente enxerga apenas módulos do pacote.
7. Usuário interno acessa qualquer tenant e a área admin.
8. Suspensão do tenant bloqueia login mesmo com senha correta.
9. Troca de pacote altera permissões sem recriar usuário.
10. Todas as aprovações e suspensões ficam auditadas.

## 20. Testes Obrigatórios

### Backend

- signup cria tenant pendente + owner + access request
- login falha para `pending_approval`
- approve libera acesso
- reject bloqueia acesso
- features do pacote são resolvidas corretamente
- `platform_admin` ignora restrição de pacote

### Frontend

- formulário de signup envia payload correto
- tela de sucesso após cadastro
- login exibe mensagem de conta pendente
- navegação oculta módulos não liberados
- área admin só aparece para equipe interna

## 21. Decisões Recomendadas

- Não usar autoaprovação nesta primeira versão.
- Não misturar pacote com role; pacote define feature, role define ação.
- Não deixar `tenant_owner` virar `platform_admin`.
- Não manter o modo atual `Continuar sem login`; isso quebra o controle de SaaS.

## 22. Próximo Passo Técnico

Sequência recomendada para iniciar a implementação:

1. criar migrations para `users`, `auth_sessions`, `tenant_subscriptions`, `tenant_feature_flags`, `tenant_access_requests`, `audit_logs`
2. expandir `tenants`
3. criar módulo `auth` com signup/login/refresh/me
4. substituir `X-Tenant-Id` fixo por contexto derivado do usuário autenticado
5. implementar `admin/access-requests`
6. conectar frontend público e guardas da app

