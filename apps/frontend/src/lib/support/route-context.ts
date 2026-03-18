import type { TourId } from "@/lib/tour-steps";

export interface SupportRouteContext {
  id: string;
  label: string;
  pathPrefixes: string[];
  objective: string;
  bestFor: string[];
  quickPrompts: string[];
  recommendedActions: string[];
  tourId?: TourId;
}

export const SUPPORT_ROUTE_CONTEXTS: SupportRouteContext[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    pathPrefixes: ["/app"],
    objective:
      "acompanhar indicadores, entender o estágio atual da operação comercial e decidir a próxima ação com base em métricas",
    bestFor: [
      "acompanhar KPI de vendas",
      "identificar gargalos no funil",
      "avaliar conversão e receita",
    ],
    quickPrompts: [
      "Como interpretar este dashboard?",
      "Quais métricas devo olhar primeiro?",
      "Como descobrir onde meu funil está travando?",
    ],
    recommendedActions: [
      "filtrar período e pipeline antes de comparar números",
      "usar o dashboard para diagnóstico, não para execução operacional",
    ],
    tourId: "dashboard",
  },
  {
    id: "contacts",
    label: "Contatos",
    pathPrefixes: ["/app/contacts"],
    objective:
      "organizar leads e clientes, registrar dados principais e manter histórico comercial centralizado",
    bestFor: [
      "cadastro e gestão de leads",
      "segmentação de base",
      "consulta de histórico do contato",
    ],
    quickPrompts: [
      "Como organizar meus contatos da forma certa?",
      "Quando devo criar uma oportunidade para um contato?",
      "Qual a diferença entre contato, oportunidade e tarefa?",
    ],
    recommendedActions: [
      "criar contato antes de iniciar uma negociação",
      "usar tags e histórico para manter contexto do lead",
    ],
    tourId: "contacts",
  },
  {
    id: "opportunities",
    label: "Oportunidades",
    pathPrefixes: ["/app/opportunities"],
    objective:
      "gerenciar negociações ativas no pipeline, acompanhar valor previsto e movimentar deals entre etapas",
    bestFor: [
      "controle do funil comercial",
      "previsão de receita",
      "gestão de estágio das negociações",
    ],
    quickPrompts: [
      "Quando devo criar uma oportunidade?",
      "Como definir um pipeline eficiente?",
      "É melhor usar oportunidade ou tarefa neste caso?",
    ],
    recommendedActions: [
      "criar oportunidade quando houver negociação real em andamento",
      "usar tarefas para próximos passos operacionais da oportunidade",
    ],
    tourId: "opportunities",
  },
  {
    id: "inbox",
    label: "Inbox",
    pathPrefixes: ["/app/inbox"],
    objective:
      "centralizar conversas por canal, responder contatos e acompanhar histórico de atendimento em um só lugar",
    bestFor: [
      "atendimento manual consultivo",
      "triagem de mensagens",
      "follow-up multicanal",
    ],
    quickPrompts: [
      "Devo responder no inbox ou automatizar?",
      "Como usar melhor a inbox no dia a dia?",
      "Quando vale transformar uma conversa em oportunidade?",
    ],
    recommendedActions: [
      "usar inbox para interações humanas e casos que exigem contexto",
      "mover para automação quando a mesma resposta se repete em escala",
    ],
    tourId: "inbox",
  },
  {
    id: "telephony",
    label: "Telefonia",
    pathPrefixes: ["/app/telephony"],
    objective:
      "fazer chamadas, aumentar produtividade outbound e registrar histórico de ligação integrado ao CRM",
    bestFor: [
      "cadências de ligação",
      "operações SDR",
      "follow-up por telefone",
    ],
    quickPrompts: [
      "Quando usar telefonia em vez de inbox?",
      "Como estruturar um fluxo com power dialer?",
      "Qual é a melhor forma de usar chamadas no processo comercial?",
    ],
    recommendedActions: [
      "usar telefonia quando o contato por voz acelera qualificação ou fechamento",
      "registrar sempre o contexto da ligação para continuidade do processo",
    ],
    tourId: "telephony",
  },
  {
    id: "automation",
    label: "Automação",
    pathPrefixes: ["/app/automation"],
    objective:
      "executar processos recorrentes sem intervenção manual usando gatilhos, condições e ações",
    bestFor: [
      "follow-up padronizado",
      "tarefas repetitivas",
      "nutrição automática de leads",
    ],
    quickPrompts: [
      "Esse processo é melhor em automação ou manual?",
      "Como montar um workflow eficiente?",
      "Qual o melhor gatilho para este caso?",
    ],
    recommendedActions: [
      "automatizar processos repetitivos e previsíveis",
      "evitar automação quando o fluxo depende de julgamento humano em cada etapa",
    ],
    tourId: "automation",
  },
  {
    id: "integrations",
    label: "Integrações",
    pathPrefixes: ["/app/integrations"],
    objective:
      "conectar canais, provedores OAuth e APIs externas ao Aureon para ampliar operação e sincronização de dados",
    bestFor: [
      "conectar Gmail, Outlook, Google, Meta, WhatsApp e provedores de API",
      "habilitar canais e dados externos",
      "resolver configuração de credenciais",
    ],
    quickPrompts: [
      "Como configurar esta integração?",
      "É melhor usar OAuth ou chave de API aqui?",
      "Qual integração devo ativar primeiro?",
    ],
    recommendedActions: [
      "priorizar integrações que destravam o processo principal do time",
      "testar primeiro em ambiente de menor risco quando houver sandbox",
    ],
    tourId: "integrations",
  },
  {
    id: "calendar",
    label: "Calendário",
    pathPrefixes: ["/app/calendar"],
    objective:
      "organizar compromissos comerciais, demos, follow-ups e sincronização com provedores de agenda",
    bestFor: [
      "agendamentos com leads e clientes",
      "planejamento de follow-up",
      "sincronização com agenda externa",
    ],
    quickPrompts: [
      "Quando usar calendário e quando usar tarefa?",
      "Como organizar meus agendamentos?",
      "Qual o melhor fluxo para demos e follow-ups?",
    ],
    recommendedActions: [
      "usar calendário para compromissos com data e hora marcadas",
      "usar tarefa para pendências sem agenda fechada",
    ],
    tourId: "calendar",
  },
  {
    id: "email-marketing",
    label: "Email Marketing",
    pathPrefixes: ["/app/email-marketing"],
    objective:
      "criar campanhas segmentadas, enviar comunicações em lote e acompanhar performance de entrega e engajamento",
    bestFor: [
      "campanhas em massa",
      "nutrição de base",
      "comunicação segmentada recorrente",
    ],
    quickPrompts: [
      "Quando usar email marketing em vez de automação?",
      "Como montar uma campanha boa?",
      "Qual a melhor estratégia para este envio?",
    ],
    recommendedActions: [
      "usar email marketing para comunicação segmentada em escala",
      "usar automação quando o disparo depende de evento ou comportamento",
    ],
    tourId: "email-marketing",
  },
  {
    id: "proposals",
    label: "Propostas",
    pathPrefixes: ["/app/proposals"],
    objective:
      "montar propostas comerciais, acompanhar aceite e transformar negociação em documento formal",
    bestFor: [
      "envio de proposta",
      "controle de aprovação comercial",
      "registro formal de valores e condições",
    ],
    quickPrompts: [
      "Quando devo gerar uma proposta?",
      "Como usar propostas junto com oportunidades?",
      "Qual o melhor momento do pipeline para enviar uma proposta?",
    ],
    recommendedActions: [
      "gerar proposta quando escopo e valor estiverem razoavelmente claros",
      "manter a proposta vinculada à oportunidade para preservar contexto",
    ],
    tourId: "proposals",
  },
  {
    id: "analytics-google",
    label: "Analytics Google",
    pathPrefixes: ["/app/analytics/google"],
    objective:
      "analisar métricas de origem de tráfego, aquisição e conversão conectadas ao ecossistema Google",
    bestFor: [
      "acompanhamento de tráfego",
      "entendimento de origem de leads",
      "análise de campanhas e conversões",
    ],
    quickPrompts: [
      "Como usar estas métricas na operação comercial?",
      "Quais indicadores valem mais aqui?",
      "Como conectar analytics à geração de leads?",
    ],
    recommendedActions: [
      "usar esta tela para análise e diagnóstico, não para execução de campanha",
    ],
  },
  {
    id: "ads-google",
    label: "Google Ads",
    pathPrefixes: ["/app/ads/google"],
    objective:
      "acompanhar métricas de mídia paga do Google e avaliar impacto das campanhas na operação comercial",
    bestFor: [
      "diagnóstico de campanhas Google Ads",
      "análise de performance e gasto",
      "leitura de dados conectados ao CRM",
    ],
    quickPrompts: [
      "Como analisar esta tela de Google Ads?",
      "Quais métricas importam mais aqui?",
      "Como usar isso para melhorar vendas?",
    ],
    recommendedActions: [
      "usar esta área para análise de performance, não para configuração detalhada de campanha",
    ],
  },
  {
    id: "ads-tiktok",
    label: "TikTok Ads",
    pathPrefixes: ["/app/ads/tiktok"],
    objective:
      "acompanhar dados de mídia paga do TikTok e entender resultado de aquisição gerada pelo canal",
    bestFor: [
      "análise de campanhas TikTok",
      "comparação de custo e resultado",
      "acompanhamento de aquisição",
    ],
    quickPrompts: [
      "Como interpretar estas métricas do TikTok?",
      "Quando vale usar TikTok no meu processo?",
      "Como comparar este canal com outros?",
    ],
    recommendedActions: [
      "usar essa área para diagnóstico e comparação de canal, não para execução operacional do CRM",
    ],
  },
  {
    id: "business-google",
    label: "Google Business Profile",
    pathPrefixes: ["/app/business/google"],
    objective:
      "acompanhar dados do perfil de negócio e sinais de reputação e presença local ligados ao ecossistema Google",
    bestFor: [
      "análise de perfil local",
      "monitoramento de reputação",
      "visibilidade de presença digital",
    ],
    quickPrompts: [
      "Como usar esta tela no processo comercial?",
      "Quais indicadores importam aqui?",
      "Quando faz sentido conectar esse módulo à reputação?",
    ],
    recommendedActions: [
      "combinar esta área com reputação quando o foco for avaliação e presença local",
    ],
  },
  {
    id: "reputation",
    label: "Reputação",
    pathPrefixes: ["/app/reputation"],
    objective:
      "gerenciar pedidos de avaliação e iniciativas relacionadas à reputação digital da operação",
    bestFor: [
      "solicitação de avaliações",
      "gestão de reputação após atendimento ou venda",
    ],
    quickPrompts: [
      "Quando pedir avaliação para o cliente?",
      "Qual o melhor fluxo para reputação?",
      "Como combinar reputação com automação?",
    ],
    recommendedActions: [
      "pedir avaliação depois de uma experiência positiva confirmada",
      "automatizar convite apenas quando o timing for previsível",
    ],
  },
];

const SORTED_PREFIXES = SUPPORT_ROUTE_CONTEXTS.flatMap((context) =>
  context.pathPrefixes.map((prefix) => ({ context, prefix }))
).sort((left, right) => right.prefix.length - left.prefix.length);

export function resolveSupportRouteContext(
  pathname: string | undefined
): SupportRouteContext | undefined {
  if (!pathname) {
    return undefined;
  }

  return SORTED_PREFIXES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )?.context;
}
