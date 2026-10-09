import { api } from "@/services/api";

export const adminUserInspectorSections = [
  "profiles",
  "resumes",
  "adaptations",
  "knowledge",
  "watchlists",
  "opportunities",
  "responses",
  "tasks",
  "boards",
  "aiRuns",
] as const;

export type AdminUserInspectorSection = (typeof adminUserInspectorSections)[number];

export type AdminUserInspectorOverview = {
  userId: string;
  counts: {
    profiles: number;
    resumes: number;
    adaptations: number;
    knowledge: number;
    watchlists: number;
    watchlistHits: number;
    opportunityStates: number;
    responses: number;
    tasks: number;
    tasksAssigned: number;
    tasksReported: number;
    boards: number;
    aiRuns: number;
  };
  breakdowns: {
    knowledgeByStatus: Record<string, number>;
    opportunitiesByPipelineStatus: Record<string, number>;
  };
  currentMonthAiUsage: unknown;
  period: { dateFrom: string; dateTo: string };
};

export type AdminUserInspectorItem = Record<string, unknown> & { id?: string; _id?: string };

export type AdminUserInspectorPage = {
  section: AdminUserInspectorSection;
  items: AdminUserInspectorItem[];
  nextCursor: string | null;
};

export type AdminUserInspectorBatchOverview = {
  items: AdminUserInspectorOverview[];
  nextCursor: string | null;
};

export type AdminUserInspectorUsageSummary = {
  runs: number;
  completed: number;
  failed: number;
  cancelled: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number | null;
  costKnownRuns: number;
  costUnknownRuns: number;
};

export type AdminUserInspectorContent = {
  section: AdminUserInspectorSection;
  item: AdminUserInspectorItem;
};

export type AdminUserInspectorListParams = {
  limit?: number;
  cursor?: string | null;
};

const sensitiveKeyPattern = /(password|passphrase|secret|credential|session|cookie|authorization|apikey|api_key|privatekey|private_key|hash|salt|telegram)/i;
const sensitiveTokenKeyPattern = /(^|_|-)(access|refresh|reset|invite|activation|bearer|api)(_|-)?token$|token(value|secret|hash|salt)?$/i;
const usageTokenCounterPattern = /^(input|output|total|cached|prompt|completion)tokens$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSensitiveInspectorKey(key: string) {
  const normalized = key.replace(/[^a-zA-Z0-9]/g, "");
  if (usageTokenCounterPattern.test(normalized)) return false;
  return sensitiveKeyPattern.test(key) || sensitiveTokenKeyPattern.test(key);
}

function numberField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nullableNumberField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function adminUserInspectorOverviewPath(userId: string) {
  return `/admin/users/${encodeURIComponent(userId)}/inspector/overview`;
}

export function adminUserInspectorSectionPath(userId: string, section: AdminUserInspectorSection, params: AdminUserInspectorListParams = {}) {
  const search = new URLSearchParams();
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.cursor) search.set("cursor", params.cursor);
  const query = search.toString();
  return `/admin/users/${encodeURIComponent(userId)}/inspector/${section}${query ? `?${query}` : ""}`;
}

export function adminUserInspectorContentPath(userId: string, section: AdminUserInspectorSection, entityId: string) {
  return `/admin/users/${encodeURIComponent(userId)}/inspector/${section}/${encodeURIComponent(entityId)}/content`;
}

export function adminUserInspectorBatchOverviewPath() {
  return "/admin/users/inspector/overview-batch";
}

export function inspectorItemId(item: AdminUserInspectorItem): string | null {
  const value = item.id ?? item._id;
  return typeof value === "string" && value ? value : null;
}

export function redactInspectorValue(value: unknown, parentKey = ""): unknown {
  if (parentKey && isSensitiveInspectorKey(parentKey)) return "[redacted]";
  if (Array.isArray(value)) return value.map((item) => redactInspectorValue(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, redactInspectorValue(item, key)]));
}

export function compactInspectorLabel(value: unknown, maxLength = 140): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? new Intl.NumberFormat("ru-RU").format(value) : "—";
  if (typeof value === "string") return maxLength > 0 && value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
  return JSON.stringify(redactInspectorValue(value));
}

export function pickInspectorTitle(item: AdminUserInspectorItem, section: AdminUserInspectorSection): string {
  const candidates = [
    item.title,
    item.name,
    item.summary,
    item.taskType,
    item.status,
    item.kind,
    item.type,
    section,
  ];
  return compactInspectorLabel(candidates.find((candidate) => typeof candidate === "string" && candidate.trim()));
}

export function extractAiUsageSummary(usage: unknown): AdminUserInspectorUsageSummary {
  const source = isRecord(usage) && isRecord(usage.summary) ? usage.summary : isRecord(usage) ? usage : {};
  return {
    runs: numberField(source, "runs"),
    completed: numberField(source, "completed"),
    failed: numberField(source, "failed"),
    cancelled: numberField(source, "cancelled"),
    inputTokens: numberField(source, "inputTokens"),
    outputTokens: numberField(source, "outputTokens"),
    totalTokens: numberField(source, "totalTokens"),
    estimatedCost: nullableNumberField(source, "estimatedCost") ?? nullableNumberField(source, "cost") ?? nullableNumberField(source, "totalCost") ?? nullableNumberField(source, "costUsd") ?? nullableNumberField(source, "totalCostUsd"),
    costKnownRuns: numberField(source, "costKnownRuns"),
    costUnknownRuns: numberField(source, "costUnknownRuns"),
  };
}

export function aiUsageCostState(usage: unknown): { label: string; known: boolean; costKnownRuns: number; costUnknownRuns: number } {
  const summary = extractAiUsageSummary(usage);
  if (typeof summary.estimatedCost === "number" && Number.isFinite(summary.estimatedCost)) return { label: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(summary.estimatedCost), known: true, costKnownRuns: summary.costKnownRuns, costUnknownRuns: summary.costUnknownRuns };
  return { label: "unknown", known: false, costKnownRuns: summary.costKnownRuns, costUnknownRuns: summary.costUnknownRuns };
}

export const adminUserInspectorApi = {
  overview: (userId: string) => api.get<AdminUserInspectorOverview>(adminUserInspectorOverviewPath(userId)),
  batchOverview: (userIds: string[]) => api.post<AdminUserInspectorBatchOverview>(adminUserInspectorBatchOverviewPath(), { userIds }),
  list: (userId: string, section: AdminUserInspectorSection, params?: AdminUserInspectorListParams) => api.get<AdminUserInspectorPage>(adminUserInspectorSectionPath(userId, section, params)),
  content: (userId: string, section: AdminUserInspectorSection, entityId: string) => api.get<AdminUserInspectorContent>(adminUserInspectorContentPath(userId, section, entityId)),
};
