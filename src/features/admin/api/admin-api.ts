import { api } from "@/services/api";
import type { AccountStatus, AdminAuditEvent, AdminBulkReportResult, AdminDeadLetterItem, AdminInfrastructureSummary, AdminJobItem, AdminJobQueueCounts, AdminReport, AdminReportDetail, AdminScheduledJobItem, AdminSource, AdminSourceRun, AdminSourceRunRecovery, AdminSummary, AdminUser, ApiList, UserRole } from "@/types";
import type { AdminAiPromptTemplate, AdminAiProviderConfig, AdminAiProviderTestResult, AdminAiRouteConfig, AdminAiSchema, AdminAiTestRequest, AdminAiTestRun, AdminAiUsageParams, AdminAiUsageResponse, AiProvider } from "../adminAI/types";
import type { AdminBackupSummary, AdminLogFilters, AdminLogSummary, AdminSearchIndex, AdminSearchMaintenance } from "@/types";
import type { AdminSourceLogsParams, AdminSourceLogsResponse, AdminSourceReindexResponse, AdminSourceRunsParams, AdminSourceRunsResponse, AdminSourceSamplesParams, AdminSourceSamplesResponse, AdminSourceToolCapabilitiesResponse, SourceInspectorToolAction, AdminSourceToolReceipt } from "@/types/admin-source-detail";

function buildAdminQuery(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  const query = search.toString();
  return query ? `?${query}` : "";
}

export type InviteUserRequest = {
  email: string;
  name: string;
  role: UserRole;
  locale: "ru" | "en";
  timezone: string;
  inviteDefaults: {
    starterProfile: boolean;
    defaultPrompts: boolean;
    notifications: boolean;
  };
};

async function listAllAdminSources(): Promise<ApiList<AdminSource>> {
  const items: AdminSource[] = [];
  const cursors = new Set<string>();
  let cursor: string | undefined;
  let total: number | undefined;
  do {
    const search = new URLSearchParams();
    if (cursor) search.set("cursor", cursor);
    const page = await api.get<ApiList<AdminSource>>(`/admin/sources${search.size ? `?${search}` : ""}`);
    items.push(...page.items);
    total ??= page.total;
    cursor = page.nextCursor ?? undefined;
    if (cursor && cursors.has(cursor)) throw new Error("Source catalog pagination did not advance");
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return { items, total: total ?? items.length, nextCursor: null };
}

export const adminApi = {
  dashboard: async (): Promise<AdminSummary> => {
    const [users, sources, jobs, aiUsage, providers, routes] = await Promise.allSettled([
      api.get<ApiList<AdminUser>>("/admin/users"),
      listAllAdminSources(),
      api.get<AdminJobQueueCounts[]>("/admin/jobs"),
      api.get<Record<string, unknown>>("/admin/ai/usage"),
      api.get<ApiList<AdminAiProviderConfig>>("/admin/ai/providers"),
      api.get<ApiList<AdminAiRouteConfig>>("/admin/ai/routes")
    ]);
    return {
      users: users.status === "fulfilled" ? users.value : { error: users.reason instanceof Error ? users.reason.message : "failed" },
      sources: sources.status === "fulfilled" ? sources.value : { error: sources.reason instanceof Error ? sources.reason.message : "failed" },
      jobs: jobs.status === "fulfilled" ? { items: jobs.value } : { error: jobs.reason instanceof Error ? jobs.reason.message : "failed" },
      aiUsage: aiUsage.status === "fulfilled" ? aiUsage.value : { error: aiUsage.reason instanceof Error ? aiUsage.reason.message : "failed" },
      providers: providers.status === "fulfilled" ? providers.value : { error: providers.reason instanceof Error ? providers.reason.message : "failed" },
      routes: routes.status === "fulfilled" ? routes.value : { error: routes.reason instanceof Error ? routes.reason.message : "failed" }
    };
  },
  health: () => api.get<AdminJobQueueCounts[]>("/admin/jobs"),
  users: {
    list: (params?: { query?: string; role?: UserRole; status?: AccountStatus }) => {
      const search = new URLSearchParams();
      if (params?.query) search.set("query", params.query);
      if (params?.role) search.set("role", params.role);
      if (params?.status) search.set("status", params.status);
      const query = search.toString();
      return api.get<ApiList<AdminUser>>(`/admin/users${query ? `?${query}` : ""}`);
    },
    create: (body: InviteUserRequest) => api.post<{ user: AdminUser; activationToken?: string }>("/admin/users", body),
    detail: (id: string) => api.get<AdminUser>(`/admin/users/${id}`),
    update: (id: string, body: Partial<AdminUser>) => api.patch<AdminUser>(`/admin/users/${id}`, body),
    status: (id: string, status: AccountStatus) => api.post<AdminUser>(`/admin/users/${id}/status`, { status }),
    role: (id: string, role: UserRole) => api.post<AdminUser>(`/admin/users/${id}/role`, { role }),
    resendInvite: (id: string) => api.post<{ success?: true; activationToken?: string }>(`/admin/users/${id}/resend-invite`),
    resetPassword: (id: string) => api.post<{ accepted: boolean; emailSent: boolean; deliveryError?: string }>(`/admin/users/${id}/reset-password`),
    revokeSessions: (id: string) => api.post<{ success: true }>(`/admin/users/${id}/revoke-sessions`),
    remove: (id: string) => api.delete<{ success: true }>(`/admin/users/${id}`)
  },
  sources: {
    list: listAllAdminSources,
    detail: (id: string) => api.get<AdminSource>(`/admin/sources/${id}`),
    update: (id: string, body: Partial<AdminSource> & Record<string, unknown>) => api.patch<AdminSource>(`/admin/sources/${id}`, body),
    run: (id: string) => api.post<AdminSourceRun>(`/admin/sources/${id}/run`, { runType: "manual", backfillDays: 30 }),
    stop: (runId: string) => api.post<AdminSourceRun>(`/admin/sources/runs/${runId}/stop`),
    recover: (runId: string) => api.post<AdminSourceRunRecovery>(`/admin/sources/runs/${encodeURIComponent(runId)}/recover`),
    retry: (id: string) => api.post<AdminSourceRun>(`/admin/sources/${id}/run`, { runType: "manual", backfillDays: 30 }),
    discover: (id: string) => api.post<{ source: AdminSource; result: Record<string, unknown> }>(`/admin/sources/${id}/discover`),
    test: (id: string) => api.post<Record<string, unknown>>(`/admin/sources/${id}/check`),
    runs: (params?: string | AdminSourceRunsParams) => {
      const query = typeof params === "string" ? buildAdminQuery({ sourceId: params }) : buildAdminQuery(params ?? {});
      return api.get<AdminSourceRunsResponse>(`/admin/sources/runs${query}`);
    },
    logs: (id: string, params: AdminSourceLogsParams = {}) => api.get<AdminSourceLogsResponse>(`/admin/sources/${encodeURIComponent(id)}/logs${buildAdminQuery(params)}`),
    samples: (id: string, params: AdminSourceSamplesParams = {}) => api.get<AdminSourceSamplesResponse>(`/admin/sources/${encodeURIComponent(id)}/samples${buildAdminQuery(params)}`),
    toolCapabilities: (id: string, params: { opportunityId?: string } = {}) => api.get<AdminSourceToolCapabilitiesResponse>(`/admin/sources/${encodeURIComponent(id)}/tools/capabilities${buildAdminQuery(params)}`),
    sourceTool: (id: string, action: SourceInspectorToolAction, opportunityId: string) => api.post<AdminSourceToolReceipt>(`/admin/sources/${encodeURIComponent(id)}/tools/${encodeURIComponent(action)}`, { opportunityId }),
    reindexSample: (id: string, opportunityId: string) => api.post<AdminSourceReindexResponse>(`/admin/sources/${encodeURIComponent(id)}/tools/reindex`, { opportunityId })
  },
  ai: {
    providers: () => api.get<ApiList<AdminAiProviderConfig>>("/admin/ai/providers"),
    updateProvider: (item: Partial<AdminAiProviderConfig> & { provider: AdminAiProviderConfig["provider"]; apiKey?: string }) => api.patch<AdminAiProviderConfig>("/admin/ai/providers", item),
    testProvider: (provider: AiProvider, body: { modelId: string }) => api.post<AdminAiProviderTestResult>(`/admin/ai/providers/${encodeURIComponent(provider)}/test`, body),
    routes: () => api.get<ApiList<AdminAiRouteConfig>>("/admin/ai/routes"),
    updateRoute: (item: AdminAiRouteConfig) => api.patch<AdminAiRouteConfig>("/admin/ai/routes", item),
    prompts: () => api.get<ApiList<AdminAiPromptTemplate>>("/admin/ai/prompts"),
    updatePrompts: (body: AdminAiPromptTemplate) => api.patch<AdminAiPromptTemplate>("/admin/ai/prompts", body),
    schemas: () => api.get<ApiList<AdminAiSchema>>("/admin/ai/schemas"),
    usage: (params: AdminAiUsageParams = {}) => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") search.set(key, String(value));
      return api.get<AdminAiUsageResponse>(`/admin/ai/usage${search.size ? `?${search}` : ""}`);
    },
    test: (body: AdminAiTestRequest) => api.post<AdminAiTestRun>("/admin/ai/test", body),
    run: (id: string) => api.get<AdminAiTestRun>(`/ai/runs/${encodeURIComponent(id)}`)
  },
  jobs: {
    counts: () => api.get<AdminJobQueueCounts[]>("/admin/jobs"),
    list: (queue: string, state = "failed") => api.get<ApiList<AdminJobItem>>(`/admin/jobs/${encodeURIComponent(queue)}?state=${encodeURIComponent(state)}`),
    detail: (queue: string, id: string) => api.get<AdminJobItem>(`/admin/jobs/${encodeURIComponent(queue)}/${encodeURIComponent(id)}`),
    scheduled: () => api.get<ApiList<AdminScheduledJobItem>>("/admin/jobs/scheduled"),
    dlq: () => api.get<ApiList<AdminDeadLetterItem>>("/admin/jobs/dlq"),
    retry: (queue: string, id: string) => api.post<{ success: true }>(`/admin/jobs/${encodeURIComponent(queue)}/${encodeURIComponent(id)}/retry`),
    cancel: (queue: string, id: string) => api.post<{ success: true }>(`/admin/jobs/${encodeURIComponent(queue)}/${encodeURIComponent(id)}/cancel`),
    dismiss: (queue: string, id: string) => api.post<{ success: true }>(`/admin/jobs/${encodeURIComponent(queue)}/${encodeURIComponent(id)}/dismiss`),
    pause: (queue: string) => api.post<{ success: true }>(`/admin/jobs/${encodeURIComponent(queue)}/pause`),
    resume: (queue: string) => api.post<{ success: true }>(`/admin/jobs/${encodeURIComponent(queue)}/resume`)
  },
  queues: () => api.get<AdminJobQueueCounts[]>("/admin/jobs"),
  audit: () => api.get<ApiList<AdminAuditEvent>>("/admin/audit"),
  reports: {
    list: (params?: { status?: string; type?: string; opportunityId?: string; assignedAdminId?: string; query?: string; cursor?: string; limit?: number }) => {
      const search = new URLSearchParams();
      if (params?.status) search.set("status", params.status);
      if (params?.type) search.set("type", params.type);
      if (params?.opportunityId) search.set("opportunityId", params.opportunityId);
      if (params?.assignedAdminId) search.set("assignedAdminId", params.assignedAdminId);
      if (params?.query) search.set("query", params.query);
      if (params?.cursor) search.set("cursor", params.cursor);
      if (params?.limit) search.set("limit", String(params.limit));
      const query = search.toString();
      return api.get<ApiList<AdminReport>>(`/admin/reports${query ? `?${query}` : ""}`);
    },
    detail: (id: string) => api.get<AdminReportDetail>(`/admin/reports/${id}`),
    update: (id: string, body: Omit<Partial<AdminReport>, "assignedAdminId"> & { assignedAdminId?: string | null }) => api.patch<AdminReportDetail>(`/admin/reports/${id}`, body),
    resolve: (id: string, body: { reason?: string; action?: string }) => api.post<AdminReportDetail>(`/admin/reports/${id}/resolve`, body),
    dismiss: (id: string, body: { reason?: string; action?: string }) => api.post<AdminReportDetail>(`/admin/reports/${id}/dismiss`, body),
    bulk: (body: { ids: string[]; action: "resolve" | "dismiss"; reason?: string; confirmed: true }) => api.post<{ items: AdminBulkReportResult[] }>("/admin/reports/bulk", body)
  },
  issues: () => adminApi.reports.list(),
  infrastructure: () => api.get<AdminInfrastructureSummary>("/admin/infrastructure/health"),
  searchMaintenance: () => api.get<AdminSearchMaintenance>("/admin/search/maintenance"),
  searchIndexes: () => api.get<ApiList<AdminSearchIndex>>("/admin/search/indexes"),
  rebuildSearch: () => api.post<{ id: string; queue: string }>("/admin/search/rebuild", { confirmed: true }),
  backups: () => api.get<AdminBackupSummary>("/admin/backups"),
  logs: (params: AdminLogFilters = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") search.set(key, String(value));
    return api.get<AdminLogSummary>(`/admin/logs${search.size ? `?${search}` : ""}`);
  }
};
