export interface TourStep {
  target: string; // CSS selector, e.g. "[data-tour='contacts-header']"
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right" | "center" | "auto";
}

export type TourId =
  | "dashboard"
  | "contacts"
  | "opportunities"
  | "inbox"
  | "telephony"
  | "automation"
  | "integrations"
  | "calendar"
  | "email-marketing"
  | "proposals";

const TOUR_STORAGE_KEY = "aureon-tour-v2";

export function wasTourSeen(id: TourId): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`${TOUR_STORAGE_KEY}-${id}`) === "true";
}

export function markTourSeen(id: TourId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${TOUR_STORAGE_KEY}-${id}`, "true");
}

export const TOUR_STEPS: Record<TourId, TourStep[]> = {
  dashboard: [
    {
      target: "[data-tour='dashboard-header']",
      title: "Bem-vindo ao Dashboard",
      content: "Aqui você tem uma visão completa das suas métricas de vendas: oportunidades, receita, taxa de conversão e muito mais em tempo real.",
    },
    {
      target: "[data-tour='dashboard-filters']",
      title: "Filtros inteligentes",
      content: "Filtre as métricas por período e pipeline. Os gráficos e cards se atualizam automaticamente conforme você ajusta os filtros.",
    },
    {
      target: "[data-tour='dashboard-cards']",
      title: "KPIs de vendas",
      content: "Cards com as métricas mais importantes: total de oportunidades, receita ganha, taxa de conversão e ticket médio — todos com variação em relação ao período anterior.",
    },
  ],
  contacts: [
    {
      target: "[data-tour='contacts-header']",
      title: "Gestão de contatos",
      content: "Central da sua base de leads e clientes. Pesquise, filtre e organize todos os contatos do seu CRM com facilidade.",
    },
    {
      target: "[data-tour='contacts-new-btn']",
      title: "Cadastrar novo contato",
      content: "Clique aqui para adicionar um lead ou cliente manualmente. Você pode vincular contatos a oportunidades, tarefas e agendamentos.",
      placement: "left",
    },
    {
      target: "[data-tour='contacts-list']",
      title: "Lista de contatos",
      content: "Veja todos os contatos com suas informações principais. Clique em um contato para acessar o perfil completo, histórico de interações, tarefas e ligações.",
    },
  ],
  opportunities: [
    {
      target: "[data-tour='opportunities-header']",
      title: "Pipeline de vendas",
      content: "Visualize e gerencie todas as oportunidades em formato Kanban. Cada coluna representa um estágio do seu processo de vendas.",
    },
    {
      target: "[data-tour='opportunities-new-btn']",
      title: "Nova oportunidade",
      content: "Crie uma oportunidade vinculando-a a um contato, defina o valor estimado e o estágio inicial do pipeline.",
      placement: "left",
    },
    {
      target: "[data-tour='opportunities-board']",
      title: "Kanban interativo",
      content: "Arraste os cards entre as colunas para avançar a oportunidade no pipeline. O sistema atualiza o status automaticamente ao soltar.",
    },
  ],
  inbox: [
    {
      target: "[data-tour='inbox-header']",
      title: "Inbox unificada",
      content: "Todas as suas conversas em um só lugar: e-mails do Gmail e Outlook, mensagens do Instagram e outros canais integrados ao CRM.",
    },
    {
      target: "[data-tour='inbox-sync-email']",
      title: "Sincronizar e-mails",
      content: "Clique para buscar novos e-mails do Gmail e Outlook. Quando chegar um novo e-mail, ele também aparece no sino de notificações.",
      placement: "bottom",
    },
    {
      target: "[data-tour='inbox-sync-instagram']",
      title: "Sincronizar Instagram",
      content: "Busca mensagens diretas da sua conta do Instagram Business. Configure a integração em Integrações para ativar.",
      placement: "bottom",
    },
    {
      target: "[data-tour='inbox-list']",
      title: "Conversas",
      content: "Lista de todas as conversas organizadas por data. Clique em qualquer conversa para abrir, ler e responder diretamente pelo CRM.",
    },
  ],
  telephony: [
    {
      target: "[data-tour='telephony-header']",
      title: "Central de telefonia",
      content: "Faça e receba chamadas diretamente pelo CRM usando o Twilio. Configure a integração em Integrações para começar.",
    },
    {
      target: "[data-tour='telephony-dialer']",
      title: "Power Dialer",
      content: "Selecione uma lista de contatos e dispare ligações em sequência. Cada chamada é registrada automaticamente no histórico do contato.",
    },
    {
      target: "[data-tour='telephony-history']",
      title: "Histórico de chamadas",
      content: "Veja todas as ligações e SMS enviados ou recebidos via Twilio, com duração, status e gravações quando disponíveis.",
    },
  ],
  automation: [
    {
      target: "[data-tour='automation-header']",
      title: "Automação de workflows",
      content: "Crie fluxos automatizados que disparam ações quando eventos específicos acontecem no CRM, sem precisar de código.",
    },
    {
      target: "[data-tour='automation-new-btn']",
      title: "Criar workflow",
      content: "Configure um gatilho (ex: novo lead criado) e defina as ações que serão executadas (ex: enviar e-mail, criar tarefa, mover no pipeline).",
      placement: "left",
    },
    {
      target: "[data-tour='automation-list']",
      title: "Seus workflows",
      content: "Veja todos os workflows ativos e pausados. Clique em um para editar, pausar ou ver o histórico de execuções.",
    },
  ],
  integrations: [
    {
      target: "[data-tour='integrations-header']",
      title: "Central de integrações",
      content: "Conecte o CRM às ferramentas que você já usa: Gmail, WhatsApp, Twilio, SendGrid, Stripe e muito mais.",
    },
    {
      target: "[data-tour='integrations-cards']",
      title: "Provedores disponíveis",
      content: "Cada card mostra o status da integração. Clique em Configurar para inserir as credenciais ou em Conectar para autorizar via OAuth.",
    },
  ],
  calendar: [
    {
      target: "[data-tour='calendar-header']",
      title: "Calendário de agendamentos",
      content: "Gerencie reuniões, ligações, demos e follow-ups. Sincronize com Google Agenda ou Outlook para manter tudo em dia.",
    },
    {
      target: "[data-tour='calendar-new-btn']",
      title: "Novo agendamento",
      content: "Crie um agendamento vinculado a um contato. Você pode adicionar Google Meet ou gerar um link Zoom diretamente pelo formulário.",
      placement: "left",
    },
    {
      target: "[data-tour='calendar-view']",
      title: "Visualização mensal",
      content: "Clique em qualquer dia para ver os agendamentos. Dias com pontos roxos indicam compromissos marcados. Navegue entre os meses pelas setas.",
    },
  ],
  "email-marketing": [
    {
      target: "[data-tour='email-marketing-header']",
      title: "Email Marketing",
      content: "Crie e envie campanhas de e-mail para os seus contatos. Acompanhe taxas de abertura, cliques e performance em tempo real.",
    },
    {
      target: "[data-tour='email-marketing-new-btn']",
      title: "Nova campanha",
      content: "Monte sua campanha definindo assunto, remetente, conteúdo HTML e a lista de destinatários. Envie imediatamente ou agende para depois.",
      placement: "left",
    },
    {
      target: "[data-tour='email-marketing-templates-btn']",
      title: "Templates",
      content: "Salve modelos de e-mail reutilizáveis para agilizar a criação de campanhas recorrentes.",
      placement: "bottom",
    },
    {
      target: "[data-tour='email-marketing-stats']",
      title: "Métricas de envio",
      content: "Cards com o resumo de todas as campanhas: quantas foram enviadas, total de destinatários, taxa média de abertura e total de cliques.",
    },
    {
      target: "[data-tour='email-marketing-list']",
      title: "Suas campanhas",
      content: "Lista com todas as campanhas. Use o botão Enviar nos rascunhos, Duplicar para reaproveitar ou veja as métricas individuais de cada uma.",
    },
  ],
  proposals: [
    {
      target: "[data-tour='proposals-header']",
      title: "Propostas comerciais",
      content: "Crie, envie e acompanhe orçamentos profissionais para os seus clientes. Monitore o status em tempo real — desde o envio até a assinatura.",
    },
    {
      target: "[data-tour='proposals-new-btn']",
      title: "Nova proposta",
      content: "Monte a proposta adicionando itens, valores, condições e data de validade. Vincule a um contato para manter o histórico organizado.",
      placement: "left",
    },
    {
      target: "[data-tour='proposals-stats']",
      title: "Painel financeiro",
      content: "Acompanhe o valor total das propostas, o valor aceito e a taxa de conversão. Métricas essenciais para o acompanhamento das vendas.",
    },
    {
      target: "[data-tour='proposals-status-summary']",
      title: "Por status",
      content: "Veja rapidamente quantas propostas estão em rascunho, enviadas, visualizadas, aceitas ou recusadas.",
    },
    {
      target: "[data-tour='proposals-list']",
      title: "Lista de propostas",
      content: "Clique no título para ver detalhes completos. Use os botões de ação para enviar rascunhos, registrar aceite/recusa ou duplicar uma proposta.",
    },
  ],
};
