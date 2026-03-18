import { Document } from "@langchain/core/documents";
import type { AssistantConfig } from "@/lib/assistant/config";

interface KnowledgeSection {
  id: string;
  title: string;
  category: string;
  content: string;
}

const BASE_KNOWLEDGE: KnowledgeSection[] = [
  {
    id: "overview",
    title: "Visão geral da plataforma",
    category: "empresa",
    content: `Aureon é uma plataforma SaaS all-in-one para times de vendas B2B. Ela centraliza CRM, comunicação multicanal, Power Dialer, automação, email marketing, propostas e analytics em um único ambiente. O principal valor é reduzir a necessidade de várias ferramentas separadas e dar visibilidade do ciclo comercial inteiro em uma operação unificada.`,
  },
  {
    id: "services",
    title: "Serviços e módulos oferecidos",
    category: "servicos",
    content: `CRM & Pipeline: pipeline visual em kanban, gestão de contatos, empresas, oportunidades, histórico de interações, tags e campos customizáveis.

Inbox Multicanal: WhatsApp Business API oficial, e-mail, SMS e chat no site em caixa única, com IA para apoio no atendimento.

Power Dialer: discagem automática, gravação, fila de contatos, notas pós-chamada e análise de sentimento em tempo real.

Automação: workflows visuais com gatilhos, ações, esperas e condições. O plano Pro inclui automações ilimitadas.

Email Marketing: templates, segmentação, variáveis de personalização, testes A/B e métricas de abertura, clique, bounce e descadastro.

Analytics & Dashboard: KPIs em tempo real, funil de vendas, Sales Velocity, análise por canal e previsão de receita.

Propostas: criação de propostas comerciais com assinatura digital e rastreamento de visualizações.

Calendário: integração com Google Calendar, Outlook e lembretes automáticos.

Integrações: Google Ads, Meta Ads, WhatsApp Business API, Twilio, Slack, RD Station, Pipedrive, Calendly, Google Analytics e APIs customizadas.`,
  },
  {
    id: "recommendations",
    title: "Como sugerir módulos e planos",
    category: "qualificacao",
    content: `Se a dor principal for organizar contatos e oportunidades, recomende CRM & Pipeline.

Se o lead quer centralizar atendimento de WhatsApp, e-mail ou chat, recomende Inbox Multicanal.

Se o problema for velocidade de contato outbound, produtividade comercial ou follow-up por telefone, recomende Power Dialer.

Se a equipe perde tempo com tarefas repetitivas e follow-ups manuais, recomende Automação.

Se o cliente quer previsibilidade de receita, visibilidade de funil e indicadores por canal, recomende Analytics.

Starter: ideal para times pequenos começando, até 5 usuários, com necessidade de CRM, inbox e automações básicas.

Pro: ideal para times em crescimento que precisam Power Dialer, automações ilimitadas, analytics avançado e contatos ilimitados.

Enterprise: ideal para operações maiores que precisam SLA, SSO, onboarding dedicado, IP dedicado e maior governança.`,
  },
  {
    id: "pricing",
    title: "Planos e preços",
    category: "pricing",
    content: `Starter: R$ 297/mês ou R$ 237/mês no anual. Inclui até 5 usuários, CRM completo, inbox multicanal, 1.000 contatos, 5 automações ativas e email marketing com 5.000 envios por mês.

Pro: R$ 697/mês ou R$ 557/mês no anual. Inclui tudo do Starter, até 15 usuários, Power Dialer, contatos ilimitados, automações ilimitadas, propostas com assinatura, analytics avançado e suporte prioritário.

Enterprise: sob consulta. Inclui tudo do Pro, usuários ilimitados, SLA dedicado, onboarding personalizado, SSO & SAML, relatórios customizados e gerente de sucesso.`,
  },
  {
    id: "faq",
    title: "Perguntas frequentes",
    category: "faq",
    content: `Trial gratuito: 14 dias de acesso completo ao plano Pro, sem cartão de crédito, sem contrato e com cancelamento a qualquer momento.

Migração: a equipe oferece migração assistida de HubSpot, Salesforce, RD Station ou qualquer base exportável em CSV.

WhatsApp: a integração usa a API oficial do WhatsApp Business, o que evita risco de banimento e permite uso de templates.

Suporte: atendimento em português por chat, e-mail e onboarding com especialistas.

Limite de contatos: Starter tem 1.000 contatos. Pro e Enterprise trabalham com contatos ilimitados.`,
  },
  {
    id: "assistant",
    title: "Arquitetura do assistente conversacional",
    category: "arquitetura",
    content: `O assistente é composto por um widget de chat em Next.js, uma rota de backend para streaming de resposta, um pipeline RAG em LangChain e captura estruturada de lead no final da resposta.

Fluxo: pergunta do visitante -> busca de contexto -> composição do prompt com histórico + conhecimento -> resposta do modelo -> extração estruturada de lead -> persistência no CRM -> CTA opcional para WhatsApp.

A busca usa Pinecone ou Weaviate quando configurados por variáveis de ambiente. Se a base vetorial não estiver configurada, o assistente usa a base local de conhecimento como fallback.`,
  },
];

export const ASSISTANT_SYSTEM_ARCHITECTURE = `# Assistente conversacional do Aureon

## Objetivo

Responder dúvidas sobre serviços, qualificar oportunidades e transformar conversas do site em contatos acionáveis no CRM.

## Componentes

- Frontend: widget de chat, UI conversacional e consumo de respostas em streaming.
- Backend: rota /api/chat em Next.js com LangChain e provedor LLM configurável.
- Retrieval: Pinecone ou Weaviate quando presentes no .env; fallback lexical local quando a base vetorial não estiver configurada.
- Lead capture: extração estruturada após a resposta do modelo e persistência no endpoint de contatos do backend.
- WhatsApp: CTA opcional no widget usando número comercial lido do .env.

## Fluxo

Visitante -> Chat widget -> /api/chat -> recuperação de contexto -> LLM -> captura estruturada -> /contacts -> CTA de WhatsApp
`;

function getDynamicSections(config: AssistantConfig): KnowledgeSection[] {
  return [
    {
      id: "contact",
      title: "Contato e próximos passos",
      category: "contato",
      content: `Site institucional: ${config.websiteUrl}

Trial gratuito: ${config.websiteUrl.replace(/\/$/, "")}/signup

Para falar com vendas, o assistente deve pedir nome, email, telefone, empresa e contexto do time comercial.

WhatsApp comercial: ${
        config.whatsappNumber
          ? "disponível no widget após a captura do lead."
          : "não configurado nas variáveis de ambiente."
      }`,
    },
  ];
}

function chunkSection(section: KnowledgeSection) {
  const blocks = section.content
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = `## ${section.title}\n\n`;

  for (const block of blocks) {
    const candidate = `${buffer}${block}\n\n`;

    if (candidate.length > 900 && buffer.trim() !== `## ${section.title}`) {
      chunks.push(buffer.trim());
      buffer = `## ${section.title}\n\n${block}\n\n`;
      continue;
    }

    buffer = candidate;
  }

  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }

  return chunks.map(
    (pageContent, index) =>
      new Document({
        pageContent,
        metadata: {
          sectionId: section.id,
          sectionTitle: section.title,
          category: section.category,
          chunk: index + 1,
        },
      })
  );
}

export function getKnowledgeDocuments(config: AssistantConfig) {
  return [...BASE_KNOWLEDGE, ...getDynamicSections(config)].flatMap(chunkSection);
}

export function formatDocumentsForPrompt(documents: Document[]) {
  if (!documents.length) {
    return "Nenhum contexto relevante foi recuperado.";
  }

  return documents
    .map((document, index) => {
      const title = String(document.metadata.sectionTitle ?? "Contexto");
      return `Fonte ${index + 1} - ${title}\n${document.pageContent}`;
    })
    .join("\n\n---\n\n");
}

export function getAssistantSystemPrompt(config: AssistantConfig) {
  return `Você é Auri, assistente técnico-comercial do ${config.companyName}.

Objetivos:
- responder perguntas sobre módulos, serviços, preços e integrações;
- sugerir o serviço, módulo ou plano mais adequado conforme o contexto do visitante;
- qualificar a oportunidade com perguntas curtas e relevantes;
- capturar dados de contato sem ser invasivo;
- incentivar o próximo passo comercial adequado.

Regras de comportamento:
- responda em português brasileiro;
- seja consultiva, clara e objetiva;
- use no máximo 3 parágrafos curtos;
- não invente funcionalidades, preços ou integrações fora do contexto;
- se faltar informação, diga isso com transparência e ofereça encaminhamento para o time;
- recomende no máximo 2 módulos ou 1 plano por resposta, sempre com motivo;
- faça uma pergunta de qualificação por vez quando houver intenção comercial;
- não exponha JSON, tags internas, nomes de variáveis ou detalhes técnicos desnecessários para o visitante.

Dados de lead que devem ser capturados quando surgirem naturalmente:
- nome
- email
- telefone
- empresa
- tamanho do time
- desafio principal
- plano ou módulos de interesse`;
}
