# Aureon

Plataforma SaaS para gestão de relacionamento, comunicação, automação e análise de vendas.

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Backend | Node.js, NestJS, TypeScript, WebSockets |
| Banco Transacional | PostgreSQL (multi-tenant via `tenant_id`, RLS) |
| Event Streaming | Kafka / Redpanda |
| Processamento Assíncrono | Redis, BullMQ |
| Banco Analítico | ClickHouse |
| Search | OpenSearch |
| Frontend | Next.js, TypeScript, TailwindCSS, ShadCN, Zustand, TanStack Query, ECharts |

## Estrutura do Projeto

```
aureon/
├── apps/
│   ├── backend/     # NestJS API
│   └── frontend/    # Next.js app
├── docker-compose.yml
└── package.json
```

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose

## Início Rápido

### 1. Subir infraestrutura local

```bash
docker compose up -d postgres redis
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

### 3. Instalar dependências

```bash
npm install
```

### 4. Rodar aplicações

**Backend:**
```bash
npm run dev:backend
```

**Frontend:**
```bash
npm run dev:frontend
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1

### Seed (tenant e pipeline padrão)

```bash
cd apps/backend && npm run seed
```

Copie o `DEFAULT_TENANT_ID` exibido para o `.env`

## Roadmap

| Fase | Módulo |
|------|--------|
| 0 | Fundação (atual) |
| 1 | CRM |
| 2 | Conversations |
| 3 | Telefonia |
| 4 | Automação |
| 5 | Dashboard |
| 6 | Integrações |
| 7 | Escala |
| 8 | IA |

## Status do Projeto

Ver [docs/STATUS_PROJETO.md](docs/STATUS_PROJETO.md) para o que está implementado e o que falta.

## Pontos Pendentes

- Volume esperado de mensagens/dia
- Quantidade estimada de tenants
- SLA desejado
- Retenção de dados
- Compliance (LGPD/GDPR)
