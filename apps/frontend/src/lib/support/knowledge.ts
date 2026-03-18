import { Document } from "@langchain/core/documents";
import { TOUR_STEPS } from "@/lib/tour-steps";
import {
  resolveSupportRouteContext,
  SUPPORT_ROUTE_CONTEXTS,
  type SupportRouteContext,
} from "@/lib/support/route-context";

interface SupportGuide {
  id: string;
  title: string;
  category: string;
  content: string;
}

const SUPPORT_GUIDES: SupportGuide[] = [
  {
    id: "core-entities",
    title: "Diferença entre contato, oportunidade e tarefa",
    category: "modelo-operacional",
    content:
      "Contato representa a pessoa ou empresa. Oportunidade representa uma negociação ativa com potencial de receita. Tarefa representa uma ação operacional a ser executada por alguém. Melhor prática: crie contato primeiro, abra oportunidade quando existir negociação real e use tarefas para próximos passos, follow-ups e pendências.",
  },
  {
    id: "inbox-vs-automation",
    title: "Quando usar inbox e quando usar automação",
    category: "decisao",
    content:
      "Use inbox quando a interação precisa de contexto humano, adaptação da mensagem ou atendimento consultivo. Use automação quando o processo é repetitivo, previsível e pode seguir uma regra clara. Se a mesma ação está sendo feita manualmente várias vezes por dia, automação tende a ser a melhor escolha. Se cada resposta depende de interpretação humana, inbox tende a ser melhor.",
  },
  {
    id: "task-vs-calendar",
    title: "Quando usar tarefa e quando usar calendário",
    category: "decisao",
    content:
      "Use calendário para compromissos com data e hora definidas, como reuniões, demos e chamadas marcadas. Use tarefa para ações pendentes sem agenda fixa, como enviar proposta, revisar cadastro ou fazer follow-up até determinado prazo. Se existe horário reservado com outra pessoa, calendário é a melhor escolha. Se é uma pendência operacional, tarefa é a melhor escolha.",
  },
  {
    id: "proposal-moment",
    title: "Melhor momento para usar propostas",
    category: "decisao",
    content:
      "Proposta deve entrar quando escopo, valor e condições já estiverem minimamente alinhados. Não é ideal gerar proposta cedo demais, antes de qualificar dor, decisão, timing e orçamento. O melhor caminho costuma ser: contato -> oportunidade -> negociação -> proposta -> aceite ou ajuste final.",
  },
  {
    id: "email-marketing-vs-automation",
    title: "Email marketing versus automação",
    category: "decisao",
    content:
      "Email marketing é melhor para campanhas segmentadas em lote, newsletters e comunicações planejadas para grupos. Automação é melhor quando o envio precisa acontecer por gatilho, comportamento ou evento do CRM. Se você quer uma campanha pontual para uma audiência, use email marketing. Se quer uma resposta automática recorrente a eventos, use automação.",
  },
  {
    id: "telephony-best-use",
    title: "Quando telefonia é a melhor escolha",
    category: "decisao",
    content:
      "Telefonia faz mais sentido quando o processo exige velocidade de contato, qualificação por voz, recuperação de negociação travada ou fechamento consultivo. Para grande volume outbound, power dialer costuma ser melhor do que abordagem totalmente manual no inbox. Para suporte assíncrono ou histórico textual, inbox tende a ser melhor.",
  },
  {
    id: "pipeline-principles",
    title: "Princípios de pipeline saudável",
    category: "boas-praticas",
    content:
      "Um pipeline bom tem etapas objetivas, critérios claros de entrada e saída e número de colunas suficiente para decisão, não para microgerenciamento. Evite etapas demais. Oportunidade deve ser movida quando um critério real for atingido, não só por feeling. Use tarefas para conduzir avanço entre etapas.",
  },
  {
    id: "automation-principles",
    title: "Boas práticas de automação",
    category: "boas-praticas",
    content:
      "Antes de automatizar, valide o processo manualmente. Comece com um gatilho simples, defina condição explícita e confirme qual resultado deve acontecer. Evite workflows grandes demais logo no início. A melhor escolha é começar pelo fluxo mais repetitivo e com menor risco operacional.",
  },
  {
    id: "integration-priorities",
    title: "Ordem recomendada para ativar integrações",
    category: "setup",
    content:
      "Ative primeiro as integrações que desbloqueiam o processo principal do time. Em geral: 1. canais de atendimento ou email, 2. agenda, 3. telefonia, 4. mídia paga ou analytics, 5. pagamentos e notificações. A melhor escolha depende do processo atual da equipe, mas vale priorizar o que gera uso diário imediato.",
  },
  {
    id: "new-tenant-setup",
    title: "Setup inicial recomendado do sistema",
    category: "setup",
    content:
      "Fluxo recomendado de implantação: definir pipeline e etapas, cadastrar ou importar contatos, configurar canais e integrações principais, ajustar tarefas e calendário, só depois ligar automações. Isso evita automatizar processo desorganizado e reduz retrabalho.",
  },
];

const INTEGRATION_HINTS: SupportGuide[] = [
  {
    id: "integration-google-oauth",
    title: "Onde configurar credenciais Google OAuth",
    category: "integracoes",
    content:
      "Google Cloud Console -> APIs -> Credenciais -> OAuth 2.0. Em integrações Google, o Client ID e Client Secret vêm desse painel. Para Gmail, os escopos usuais incluem gmail.readonly, gmail.send, gmail.modify e userinfo.email.",
  },
  {
    id: "integration-google-ads",
    title: "Google Ads",
    category: "integracoes",
    content:
      "Além do OAuth do Google, Google Ads também depende do Developer Token mantido no servidor. A melhor prática é validar primeiro a conta OAuth e depois confirmar o token do backend antes de diagnosticar erro da integração.",
  },
  {
    id: "integration-meta",
    title: "Meta e Facebook Ads",
    category: "integracoes",
    content:
      "As credenciais ficam no Meta for Developers, dentro do app conectado. Para Facebook Ads, use as configurações básicas do app e confirme permissões e contas corretas antes de concluir a conexão.",
  },
  {
    id: "integration-zoom",
    title: "Zoom OAuth",
    category: "integracoes",
    content:
      "No marketplace.zoom.us, crie um app OAuth e use a Redirect URL igual ao callback configurado no backend. Se a URL divergir, a autenticação falha mesmo com client id e secret corretos.",
  },
  {
    id: "integration-linkedin",
    title: "LinkedIn OAuth",
    category: "integracoes",
    content:
      "No developers.linkedin.com, configure o app em Auth e use a Redirect URL igual ao callback do backend. Para Lead Gen e recursos avançados, pode haver escopos e aprovações extras além do login básico.",
  },
  {
    id: "integration-rd-station",
    title: "RD Station",
    category: "integracoes",
    content:
      "No developers.rdstation.com, crie um app OAuth do RD Station Marketing e use a Redirect URL do backend. A melhor prática é validar a conexão e só depois começar sincronizações maiores de leads.",
  },
  {
    id: "integration-outlook",
    title: "Outlook / Microsoft 365",
    category: "integracoes",
    content:
      "No portal.azure.com, use App registrations e configure Authentication com Redirect URI igual ao callback do backend. Conferir escopos e consentimento do tenant costuma ser parte crítica do setup.",
  },
  {
    id: "integration-tiktok",
    title: "TikTok Ads",
    category: "integracoes",
    content:
      "No ads.tiktok.com/marketing_api, obtenha as credenciais do app e use a Redirect URI igual ao callback do backend. Se a conta correta não estiver vinculada, a integração pode autenticar mas não trazer dados úteis.",
  },
];

function routeOverviewDocument(context: SupportRouteContext) {
  return new Document({
    pageContent: `Tela atual: ${context.label}

Objetivo principal da tela: ${context.objective}

Melhor uso desta área:
- ${context.bestFor.join("\n- ")}

Ações recomendadas:
- ${context.recommendedActions.join("\n- ")}`,
    metadata: {
      source: "support-route-overview",
      routeId: context.id,
      routeLabel: context.label,
    },
  });
}

function routeTourDocuments(context: SupportRouteContext) {
  if (!context.tourId) {
    return [];
  }

  return TOUR_STEPS[context.tourId].map(
    (step, index) =>
      new Document({
        pageContent: `Tela: ${context.label}
Passo ${index + 1}: ${step.title}
Explicação: ${step.content}
Seletor visual: ${step.target}`,
        metadata: {
          source: "support-tour-step",
          routeId: context.id,
          routeLabel: context.label,
          selector: step.target,
          stepIndex: index + 1,
        },
      })
  );
}

function genericGuideDocuments() {
  return [...SUPPORT_GUIDES, ...INTEGRATION_HINTS].map(
    (guide) =>
      new Document({
        pageContent: `${guide.title}\n\n${guide.content}`,
        metadata: {
          source: "support-guide",
          guideId: guide.id,
          category: guide.category,
        },
      })
  );
}

const ALL_ROUTE_DOCUMENTS = SUPPORT_ROUTE_CONTEXTS.flatMap((context) => [
  routeOverviewDocument(context),
  ...routeTourDocuments(context),
]);

const STATIC_SUPPORT_DOCUMENTS = [
  ...genericGuideDocuments(),
  ...ALL_ROUTE_DOCUMENTS,
];

export function getSupportKnowledgeDocuments(currentPath?: string) {
  const routeContext = resolveSupportRouteContext(currentPath);

  if (!routeContext) {
    return STATIC_SUPPORT_DOCUMENTS;
  }

  const routeDocs = [
    routeOverviewDocument(routeContext),
    ...routeTourDocuments(routeContext),
  ];

  return [...routeDocs, ...STATIC_SUPPORT_DOCUMENTS];
}

export function formatSupportDocumentsForPrompt(documents: Document[]) {
  if (!documents.length) {
    return "Nenhum contexto técnico relevante foi encontrado.";
  }

  return documents
    .map((document, index) => {
      const title =
        String(document.metadata.routeLabel ?? "") ||
        String(document.metadata.category ?? "") ||
        "Contexto";

      return `Fonte ${index + 1} - ${title}\n${document.pageContent}`;
    })
    .join("\n\n---\n\n");
}

export function getSupportRoutePromptContext(currentPath?: string) {
  const routeContext = resolveSupportRouteContext(currentPath);

  if (!routeContext) {
    return "O usuário está em uma área interna do Aureon sem contexto específico mapeado.";
  }

  return `Tela atual do usuário: ${routeContext.label}
Objetivo da tela: ${routeContext.objective}
Melhor uso desta área:
- ${routeContext.bestFor.join("\n- ")}
Possui tutorial visual: ${routeContext.tourId ? "sim" : "não"}`;
}

export function getSupportSystemPrompt(currentPath?: string) {
  return `Você é Auri Support, especialista técnica do produto Aureon.

Seu papel:
- ensinar o usuário a usar o sistema com passo a passo claro;
- dizer se a escolha atual do usuário é a melhor para a necessidade dele;
- recomendar o módulo, fluxo ou processo mais adequado quando houver mais de uma opção;
- usar o contexto da tela atual para responder com mais precisão.

Regras de comportamento:
- responda em português brasileiro;
- seja técnica, didática, objetiva e consultiva;
- não use tom comercial;
- se a pergunta for sobre decisão entre opções, tome posição e diga qual caminho é melhor e por quê;
- se a ação não for melhor na tela atual, diga explicitamente para qual módulo ou área o usuário deve ir;
- quando a pergunta pedir execução, responda com passos numerados;
- se faltar contexto, peça no máximo uma informação complementar;
- não invente botões, funcionalidades ou integrações que não estejam no contexto.

Formato preferencial:
1. Melhor caminho
2. Passo a passo
3. Quando usar outra opção

Contexto da tela atual:
${getSupportRoutePromptContext(currentPath)}`;
}

export function formatSupportRuntimeContext(runtimeContext?: {
  tenantId?: string;
  tenantName?: string;
  hasTutorial?: boolean;
  connectedIntegrations?: string[];
  disconnectedIntegrations?: string[];
}) {
  if (!runtimeContext) {
    return "Sem contexto adicional do tenant.";
  }

  const lines = [
    runtimeContext.tenantName
      ? `Tenant atual: ${runtimeContext.tenantName}`
      : runtimeContext.tenantId
        ? `Tenant atual: ${runtimeContext.tenantId}`
        : undefined,
    runtimeContext.hasTutorial !== undefined
      ? `Tutorial visual disponível para a tela atual: ${
          runtimeContext.hasTutorial ? "sim" : "não"
        }`
      : undefined,
    runtimeContext.connectedIntegrations?.length
      ? `Integrações conectadas: ${runtimeContext.connectedIntegrations.join(", ")}`
      : undefined,
    runtimeContext.disconnectedIntegrations?.length
      ? `Integrações não conectadas relevantes: ${runtimeContext.disconnectedIntegrations
          .slice(0, 8)
          .join(", ")}`
      : undefined,
  ].filter(Boolean);

  return lines.length ? lines.join("\n") : "Sem contexto adicional do tenant.";
}
