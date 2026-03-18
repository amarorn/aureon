import { z } from "zod";
import { SUPPORT_ROUTE_CONTEXTS, resolveSupportRouteContext } from "@/lib/support/route-context";
import type { SupportRuntimeContext } from "@/lib/support/types";
import {
  isAllowedSupportPath,
  isValidPrefillAction,
  sanitizeSupportPrefillValues,
  type SupportFormType,
  type SupportUiAction,
} from "@/lib/support/ui-actions";

const supportActionValuesSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  company: z.string().nullable(),
  source: z.string().nullable(),
  notes: z.string().nullable(),
  contactId: z.string().nullable(),
  pipelineId: z.string().nullable(),
  stageId: z.string().nullable(),
  title: z.string().nullable(),
  value: z.string().nullable(),
  triggerType: z.string().nullable(),
  fromStageId: z.string().nullable(),
  toStageId: z.string().nullable(),
  actionType: z.string().nullable(),
  taskTitle: z.string().nullable(),
  notificationMessage: z.string().nullable(),
  targetStageId: z.string().nullable(),
  validUntil: z.string().nullable(),
});

export const supportActionSchema = z.object({
  type: z.enum(["navigate", "prefill_form"]),
  label: z.string(),
  path: z.string().nullable(),
  formType: z
    .enum(["contact", "opportunity", "workflow", "proposal"])
    .nullable(),
  values: supportActionValuesSchema.nullable(),
});

export const supportActionResponseSchema = z.object({
  actions: z.array(supportActionSchema).max(3),
});

const PREFILL_FORMS: Array<{
  formType: SupportFormType;
  path: string;
  label: string;
  fields: string[];
}> = [
  {
    formType: "contact",
    path: "/app/contacts/new",
    label: "Abrir novo contato já preenchido",
    fields: ["name", "email", "phone", "company", "source", "notes"],
  },
  {
    formType: "opportunity",
    path: "/app/opportunities/new",
    label: "Abrir nova oportunidade já preenchida",
    fields: ["contactId", "pipelineId", "stageId", "title", "value", "notes"],
  },
  {
    formType: "workflow",
    path: "/app/automation/new",
    label: "Abrir workflow já preenchido",
    fields: [
      "name",
      "triggerType",
      "fromStageId",
      "toStageId",
      "actionType",
      "taskTitle",
      "notificationMessage",
      "targetStageId",
    ],
  },
  {
    formType: "proposal",
    path: "/app/proposals/new",
    label: "Abrir proposta já preenchida",
    fields: ["title", "contactId", "validUntil", "notes"],
  },
];

export function buildSupportActionCatalog(params: {
  currentPath?: string;
  runtimeContext?: SupportRuntimeContext;
}) {
  const { currentPath, runtimeContext } = params;
  const currentRoute = resolveSupportRouteContext(currentPath);
  const routeEntries = SUPPORT_ROUTE_CONTEXTS.map((context) => {
    const path = context.pathPrefixes[0];

    return {
      label: context.label,
      path,
    };
  });

  return {
    currentRouteLabel: currentRoute?.label ?? "Área interna",
    currentPath,
    navigationTargets: routeEntries,
    prefillForms: PREFILL_FORMS,
  };
}

export function buildSupportActionInstructions(params: {
  currentPath?: string;
  runtimeContext?: SupportRuntimeContext;
}) {
  const catalog = buildSupportActionCatalog(params);

  const navigationList = catalog.navigationTargets
    .map(
      (target) =>
        `- ${target.label}: path=${target.path}`
    )
    .join("\n");

  const prefillList = catalog.prefillForms
    .map(
      (form) =>
        `- ${form.label}: path=${form.path}; formType=${form.formType}; campos permitidos=${form.fields.join(", ")}`
    )
    .join("\n");

  return `Você gera ações de interface para o suporte do Aureon.

Regras:
- gere no máximo 3 ações;
- só use caminhos permitidos;
- use "navigate" para abrir uma página;
- use "prefill_form" apenas quando o usuário já tiver fornecido dados suficientes;
- prefira "prefill_form" quando o usuário quiser criar, cadastrar, configurar ou deixar algo pronto;
- quando o usuário pedir para "mostrar na tela", interprete como levar para a tela correta ou abrir algo já preparado;
- não use tutorial nem ações visuais guiadas;
- não invente paths, selectors ou campos;
- rótulos devem estar em português;
- se não houver uma ação útil e segura, retorne actions vazia.

Tela atual: ${catalog.currentRouteLabel}

Navegação permitida:
${navigationList}

Formulários com prefill permitido:
${prefillList}`;
}

export function sanitizeSupportActions(params: {
  currentPath?: string;
  actions: z.infer<typeof supportActionSchema>[];
}) {
  const { currentPath, actions } = params;
  const sanitized: SupportUiAction[] = [];

  for (const action of actions) {
    const label = action.label.trim();
    if (!label) {
      continue;
    }

    if (action.type === "navigate") {
      if (!action.path || !isAllowedSupportPath(action.path)) {
        continue;
      }

      sanitized.push({
        type: "navigate",
        label,
        path: action.path,
      });
      continue;
    }

    if (action.type === "prefill_form") {
      if (!action.path || !action.formType) {
        continue;
      }

      if (
        !isValidPrefillAction({
          path: action.path,
          formType: action.formType,
          values: action.values ?? undefined,
        })
      ) {
        continue;
      }

      const values = sanitizeSupportPrefillValues(
        action.formType,
        action.values ?? undefined
      );
      if (!Object.keys(values).length) {
        continue;
      }

      sanitized.push({
        type: "prefill_form",
        label,
        path: action.path,
        formType: action.formType,
        values,
      });
    }
  }

  return sanitized.slice(0, 3);
}
