import type { TourId } from "@/lib/tour-steps";
import { resolveSupportRouteContext } from "@/lib/support/route-context";
import { TOUR_STEPS } from "@/lib/tour-steps";

export type SupportFormType =
  | "contact"
  | "opportunity"
  | "workflow"
  | "proposal";

export type SupportUiAction =
  | {
      type: "navigate";
      label: string;
      path: string;
    }
  | {
      type: "start_tour";
      label: string;
      selector?: string;
      stepIndex?: number;
    }
  | {
      type: "navigate_and_tour";
      label: string;
      path: string;
      selector?: string;
      stepIndex?: number;
    }
  | {
      type: "prefill_form";
      label: string;
      path: string;
      formType: SupportFormType;
      values: Record<string, string>;
    };

export interface SupportPendingTourRequest {
  tourId: TourId;
  selector?: string;
  stepIndex?: number;
}

export interface SupportPrefillDraft {
  formType: SupportFormType;
  values: Record<string, string>;
}

const SUPPORT_TOUR_STORAGE_KEY = "aureon-support-tour-request";
const SUPPORT_PREFILL_STORAGE_KEY = "aureon-support-prefill-draft";

const ALLOWED_PATHS = new Set([
  "/app",
  "/app/contacts",
  "/app/contacts/new",
  "/app/opportunities",
  "/app/opportunities/new",
  "/app/inbox",
  "/app/telephony",
  "/app/automation",
  "/app/automation/new",
  "/app/integrations",
  "/app/calendar",
  "/app/email-marketing",
  "/app/proposals",
  "/app/proposals/new",
  "/app/reputation",
  "/app/analytics/google",
  "/app/ads/google",
  "/app/ads/tiktok",
  "/app/business/google",
]);

const FORM_PATH_BY_TYPE: Record<SupportFormType, string> = {
  contact: "/app/contacts/new",
  opportunity: "/app/opportunities/new",
  workflow: "/app/automation/new",
  proposal: "/app/proposals/new",
};

const ALLOWED_PREFILL_FIELDS: Record<SupportFormType, Set<string>> = {
  contact: new Set(["name", "email", "phone", "company", "source", "notes"]),
  opportunity: new Set([
    "contactId",
    "pipelineId",
    "stageId",
    "title",
    "value",
    "notes",
  ]),
  workflow: new Set([
    "name",
    "triggerType",
    "fromStageId",
    "toStageId",
    "actionType",
    "taskTitle",
    "notificationMessage",
    "targetStageId",
  ]),
  proposal: new Set(["title", "contactId", "validUntil", "notes"]),
};

function isBrowser() {
  return typeof window !== "undefined";
}

function readSessionJson<T>(key: string): T | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeSessionJson(key: string, value: unknown) {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(key, JSON.stringify(value));
}

function removeSessionValue(key: string) {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(key);
}

export function isAllowedSupportPath(path: string) {
  return ALLOWED_PATHS.has(path);
}

export function hasTourForPath(path: string) {
  return Boolean(resolveSupportRouteContext(path)?.tourId);
}

export function queueSupportTourRequest(path: string, request: Omit<SupportPendingTourRequest, "tourId">) {
  const routeContext = resolveSupportRouteContext(path);
  if (!routeContext?.tourId) {
    return;
  }

  writeSessionJson(SUPPORT_TOUR_STORAGE_KEY, {
    tourId: routeContext.tourId,
    selector: request.selector,
    stepIndex: request.stepIndex,
  } satisfies SupportPendingTourRequest);
}

export function consumeSupportTourRequest(tourId: TourId) {
  const request = readSessionJson<SupportPendingTourRequest>(SUPPORT_TOUR_STORAGE_KEY);
  if (!request || request.tourId !== tourId) {
    return null;
  }

  removeSessionValue(SUPPORT_TOUR_STORAGE_KEY);
  return request;
}

export function isAllowedTourSelector(path: string | undefined, selector?: string) {
  if (!path || !selector) {
    return false;
  }

  const routeContext = resolveSupportRouteContext(path);
  if (!routeContext?.tourId) {
    return false;
  }

  return TOUR_STEPS[routeContext.tourId].some((step) => step.target === selector);
}

export function queueSupportPrefillDraft(draft: SupportPrefillDraft) {
  writeSessionJson(SUPPORT_PREFILL_STORAGE_KEY, draft);
}

export function consumeSupportPrefillDraft(formType: SupportFormType) {
  const draft = readSessionJson<SupportPrefillDraft>(SUPPORT_PREFILL_STORAGE_KEY);
  if (!draft || draft.formType !== formType) {
    return null;
  }

  removeSessionValue(SUPPORT_PREFILL_STORAGE_KEY);
  return draft;
}

export function sanitizeSupportPrefillValues(
  formType: SupportFormType,
  values: Record<string, unknown> | undefined
) {
  const allowedFields = ALLOWED_PREFILL_FIELDS[formType];
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(values ?? {})) {
    if (!allowedFields.has(key)) {
      continue;
    }

    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    sanitized[key] = trimmed;
  }

  return sanitized;
}

export function isValidPrefillAction(action: {
  path: string;
  formType: SupportFormType;
  values?: Record<string, unknown>;
}) {
  return FORM_PATH_BY_TYPE[action.formType] === action.path;
}
