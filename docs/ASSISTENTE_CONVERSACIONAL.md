# Assistente Conversacional Aureon

## Objetivo

Implementar um assistente para o site corporativo capaz de:

- responder perguntas sobre serviços e módulos;
- sugerir serviços e planos com base no contexto do visitante;
- capturar dados de lead de forma estruturada;
- encaminhar a conversa para WhatsApp quando configurado.

## Arquitetura

```text
Visitante
  -> Chat widget (Next.js)
  -> /api/chat (streaming SSE)
  -> Recuperação de contexto
      -> Pinecone
      -> Weaviate
      -> fallback lexical local
  -> LLM (OpenAI ou Anthropic)
  -> Extração estruturada de lead
  -> POST /contacts no backend
  -> CTA de WhatsApp no widget
```

## Componentes implementados

- `apps/frontend/src/components/chat-widget.tsx`
  UI do chat, histórico de conversa, leitura de streaming e CTA de WhatsApp.

- `apps/frontend/src/app/api/chat/route.ts`
  Rota server-side com streaming, RAG e persistência de lead.

- `apps/frontend/src/lib/assistant/config.ts`
  Normalização da configuração a partir do `.env` raiz.

- `apps/frontend/src/lib/assistant/rag.ts`
  Pipeline de recuperação, composição do prompt, streaming de resposta e extração estruturada.

- `apps/frontend/src/lib/aureon-knowledge.ts`
  Base de conhecimento e instruções do assistente.

## Variáveis de ambiente usadas

### Já aproveitadas do `.env` atual

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `API_BASE_URL`
- `API_PREFIX`
- `DEFAULT_TENANT_ID`

### Opcionais para produção

- `ASSISTANT_LLM_PROVIDER`
- `ASSISTANT_LLM_MODEL`
- `ASSISTANT_EMBEDDINGS_MODEL`
- `PINECONE_API_KEY`
- `PINECONE_INDEX`
- `PINECONE_NAMESPACE`
- `WEAVIATE_URL`
- `WEAVIATE_HOST`
- `WEAVIATE_SCHEME`
- `WEAVIATE_API_KEY`
- `WEAVIATE_INDEX`
- `WEAVIATE_TEXT_KEY`
- `WHATSAPP_BUSINESS_NUMBER`
- `WHATSAPP_PREFILL_TEXT`

## Regras de funcionamento

- Se houver `PINECONE_API_KEY` e `PINECONE_INDEX`, o retrieval usa Pinecone.
- Se houver configuração de Weaviate, o retrieval usa Weaviate.
- Se não houver base vetorial disponível, o assistente usa fallback lexical local sobre a base de conhecimento embarcada.
- A captura de lead acontece após a resposta do modelo e gera um contato no backend.
- O CTA de WhatsApp só aparece se existir número comercial configurado no `.env`.

## Observação sobre chaves de LLM

O código detecta automaticamente quando a chave em `ANTHROPIC_API_KEY` tem formato de chave OpenAI e passa a usar o provedor OpenAI. Isso evita quebrar o chat quando a chave estiver presente no `.env` com nome incorreto.
