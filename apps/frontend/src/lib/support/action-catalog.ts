import { z } from "zod";
import { SUPPORT_ROUTE_CONTEXTS, resolveSupportRouteContext } from "@/lib/support/route-context";
import { TOUR_STEPS } from "@/lib/tour-steps";
import type { SupportRuntimeContext } from "@/lib/support/types";
import {
  hasTourForPath,
  isAllowedSupportPath,
  isAllowedTourSelector,
  isValidPrefillAction,
  sanitizeSupportPrefillValues,
  type SupportFormType,
  type SupportUiAction,
} from "@/lib/support/ui-actions";

export const supportActionSchema = z.object({
  type: z.enum([
    "navigate",
    "start_tour",
    "navigate_and_tour",
    "prefill_form",
  ]),
  label: z.string(),
  path: z.string().optional(),
  selector: z.string().optional(),
  stepIndex: z.number().int().min(0).optional(),
  formType: z.enum(["contact", "opportunity", "workflow", "proposal"]).optional(),
  values: z.record(z.string()).optional(),
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
    const selectors = context.tourId
      ? TOUR_STEPS[context.tourId].map((step) => step.target)
      : [];

    return {
      label: context.label,
      path,
      hasTour: Boolean(context.tourId),
      selectors,
    };
  });

  return {
    currentRouteLabel: currentRoute?.label ?? "Área interna",
    currentPath,
    hasCurrentTour: Boolean(runtimeContext?.hasTutorial),
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
        `- ${target.label}: path=${target.path}; tutorial=${target.hasTour ? "sim" : "não"}${
          target.selectors.length
            ? `; selectors válidos=${target.selectors.join(", ")}`
            : ""
        }`
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
- use "navigate_and_tour" quando valha abrir a página e mostrar visualmente;
- use "start_tour" apenas se a tela atual tiver tutorial disponível;
- use "prefill_form" apenas quando o usuário já tiver fornecido dados suficientes;
- não invente paths, selectors ou campos;
- rótulos devem estar em português;
- se não houver uma ação útil e segura, retorne actions vazia.

Tela atual: ${catalog.currentRouteLabel}
Tutorial disponível na tela atual: ${catalog.hasCurrentTour ? "sim" : "não"}

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

    if (action.type === "start_tour") {
      if (!currentPath || !hasTourForPath(currentPath)) {
        continue;
      }

      sanitized.push({
        type: "start_tour",
        label,
        ...(isAllowedTourSelector(currentPath, action.selector)
          ? { selector: action.selector }
          : {}),
        ...(typeof action.stepIndex === "number"
          ? { stepIndex: action.stepIndex }
          : {}),
      });
      continue;
    }

    if (action.type === "navigate_and_tour") {
      if (!action.path || !isAllowedSupportPath(action.path) || !hasTourForPath(action.path)) {
        continue;
      }

      sanitized.push({
        type: "navigate_and_tour",
        label,
        path: action.path,
        ...(isAllowedTourSelector(action.path, action.selector)
          ? { selector: action.selector }
          : {}),
        ...(typeof action.stepIndex === "number"
          ? { stepIndex: action.stepIndex }
          : {}),
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
          values: action.values,
        })
      ) {
        continue;
      }

      const values = sanitizeSupportPrefillValues(action.formType, action.values);
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
