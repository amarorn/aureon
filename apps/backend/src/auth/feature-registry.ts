export const FEATURE_REGISTRY: Record<
  string,
  { label: string; group: string }
> = {
  'crm.contacts': { label: 'Contatos', group: 'CRM' },
  'crm.opportunities': { label: 'Oportunidades', group: 'CRM' },
  'crm.tasks': { label: 'Tarefas', group: 'CRM' },
  'inbox.core': { label: 'Inbox multicanal', group: 'Comunicação' },
  'automation.core': { label: 'Automação / workflows', group: 'Automação' },
  'calendar.core': { label: 'Calendário', group: 'Agenda' },
  'ads.google': { label: 'Google Ads', group: 'Marketing' },
  'analytics.google': { label: 'Google Analytics', group: 'Marketing' },
  'proposals.core': { label: 'Propostas', group: 'Vendas' },
  'reputation.core': { label: 'Reputação / reviews', group: 'Marketing' },
  'email.marketing': { label: 'E-mail marketing', group: 'Marketing' },
  'telephony.core': { label: 'Telefonia / voz', group: 'Comunicação' },
  'integrations.core': { label: 'Integrações', group: 'Sistema' },
  'business.google': { label: 'Google Business Profile', group: 'Marketing' },
  'ads.tiktok': { label: 'TikTok Ads', group: 'Marketing' },
  'ai.assistant': {
    label: 'Assistente IA no produto (add-on)',
    group: 'Inteligência artificial',
  },
};

export function isKnownFeatureCode(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(FEATURE_REGISTRY, code);
}

export function listFeatureRegistry(): {
  code: string;
  label: string;
  group: string;
}[] {
  return Object.entries(FEATURE_REGISTRY).map(([code, v]) => ({
    code,
    label: v.label,
    group: v.group,
  }));
}
