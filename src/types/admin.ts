import type { AccountStatus, UserRole } from "./user";

export type AdminSummary = {
  users?: Record<string, unknown>;
  sources?: Record<string, unknown>;
  jobs?: Record<string, unknown>;
  aiUsage?: Record<string, unknown>;
  providers?: Record<string, unknown>;
  routes?: Record<string, unknown>;
};

export type AdminUser = {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  profilesCount?: number;
  aiUsageLabel?: string;
  lastActiveAt?: string;
  createdAt?: string;
  updatedAt?: string;
  locale?: "ru" | "en";
  timezone?: string;
  onboarding?: {
    minimumComplete?: boolean;
    checklist?: Record<string, unknown>;
  };
  telegram?: { linked: boolean };
  notificationSettings?: Record<string, unknown>;
  uiSettings?: Record<string, unknown>;
  aiPreferences?: Record<string, unknown>;
  inviteDefaults?: {
    starterProfile: boolean;
    defaultPrompts: boolean;
    notifications: boolean;
  };
};

export type AdminSource = {
  id: string;
  _id?: string;
  name: string;
  group: string;
  category?: string;
  opportunityTypes?: string[];
  connectorFamily: string;
  enabled: boolean;
  runtimeState?: string;
  healthState?: string;
  status?: "Healthy" | "Degraded" | "Failed" | "Disabled" | string;
  intervalMinutes?: number;
  intervalSeconds?: number;
  timeoutMs?: number;
  endpoint?: Record<string, unknown>;
  config?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  checkpoint?: Record<string, unknown>;
  proxyPoolEnabled?: boolean;
  parserVersion?: string;
  normalizationProfile?: string;
  refreshPolicy?: string;
  checkpointStrategy?: string;
  sourceRole?: string;
  unavailableReason?: string;
  healthMessage?: string;
  lastHealthCheckState?: string;
  lastHealthCheckMessage?: string;
  lastHealthCheckAt?: string;
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
  recentNew?: number;
  recentUpdated?: number;
  recentErrors?: number;
  credentialsConfigured?: boolean;
  credentialsRequired?: boolean;
  credentialsPreview?: string;
  authCredentialRef?: string;
};

export type AdminSourceRun = {
  id?: string;
  _id?: string;
  sourceId: string;
  status: "Queued" | "Running" | "Succeeded" | "Failed" | "Cancelled" | string;
  runType: "manual" | "scheduled" | "backfill" | "health" | string;
  startedAt?: string;
  finishedAt?: string;
  requestedStopAt?: string;
  stats?: Record<string, number>;
  error?: string;
  requestMetadata?: Record<string, unknown>;
  checkpointBefore?: Record<string, unknown>;
  checkpointAfter?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminSourceRunRecovery = {
  recovered: true;
  enqueued: true;
  run: AdminSourceRun;
};

export type AdminQueueName = "ingestion" | "normalization" | "dedup" | "search" | "ai" | "documents" | "notifications" | "analytics" | "maintenance" | string;

export type AdminJobQueueCounts = {
  name: AdminQueueName;
  counts: Record<string, number>;
  error?: string;
  concurrency?: number;
  rateLimit?: { max: number; durationMs: number };
  backpressureLimit?: number;
};

export type AdminJobItem = {
  id?: string | number;
  queue?: string;
  name?: string;
  state?: string;
  attempts?: number;
  maxAttempts?: number;
  createdAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number;
  failedReason?: string;
  progress?: unknown;
  entity?: Record<string, string>;
  data?: unknown;
  stacktrace?: string[];
  logsCorrelationId?: string;
  retryBackoff?: unknown;
  canRetry?: boolean;
  canCancel?: boolean;
};

export type AdminScheduledJobItem = {
  id: string;
  queue: string;
  name: string;
  pattern?: unknown;
  nextRunAt?: string | null;
  raw?: unknown;
};

export type AdminDeadLetterItem = {
  _id?: string;
  id?: string;
  queue: string;
  jobId: string;
  name?: string;
  error?: string;
  attempts?: number;
  status?: "Failed" | "Replayed" | "Dismissed" | string;
  createdAt?: string;
};


export type AdminReportStatus = "Open" | "In review" | "Resolved" | "Dismissed" | string;
export type AdminReportType = "duplicate" | "closed" | "money" | "remote_location" | "broken_link" | "technology_category" | "wrong_data" | "spam" | "other" | string;

export type AdminReportOpportunitySummary = {
  id: string;
  title: string;
  type: string;
  sourceStatus?: string;
  companyOrClient?: string;
  url?: string;
  sourcesCount?: number;
  updatedAt?: string;
};

export type AdminReport = {
  id: string;
  _id?: string;
  userId: string;
  opportunityId: string;
  type: AdminReportType;
  comment?: string;
  status: AdminReportStatus;
  assignedAdminId?: string;
  priority?: "low" | "normal" | "high" | "urgent" | string;
  adminComment?: string;
  resolution?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  duplicateGroupCount?: number;
  opportunity?: AdminReportOpportunitySummary | null;
  reporter?: AdminReportUserSummary | null;
  assignee?: AdminReportUserSummary | null;
};

export type AdminReportSourceDiagnostic = {
  sourceId: string;
  name?: string;
  runtimeState?: string;
  enabled?: boolean;
  lastSuccessAt?: string;
  latestRun?: {
    id: string;
    status: string;
    startedAt?: string;
    finishedAt?: string;
    stats?: Record<string, number>;
  };
};

export type AdminReportDetail = AdminReport & {
  relatedReports?: AdminReport[];
  sourceOccurrences?: Array<Record<string, unknown>>;
  currentFields?: Record<string, unknown>;
  sourceDiagnostics?: AdminReportSourceDiagnostic[];
};

export type AdminReportUserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
};

export type AdminBulkReportResult = {
  id: string;
  success: boolean;
  status?: AdminReportStatus;
  error?: string;
};

export type AdminAuditEvent = {
  _id?: string;
  id?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  fields?: string[];
  createdAt?: string;
};

export type AdminInfrastructureService = {
  id: string;
  label: string;
  state: "healthy" | "degraded" | "unavailable" | "unconfigured" | "configured" | "unknown" | string;
  healthy: boolean | null;
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
};

export type AdminInfrastructureSummary = {
  status: "operational" | "degraded" | "unknown" | "issue" | string;
  checkedAt?: string;
  services?: AdminInfrastructureService[];
  dependencies?: Record<string, { state?: string; healthy?: boolean | null; message?: string }>;
  queues?: AdminJobQueueCounts[];
};

export type AdminSearchIndex = {
  name: string;
  available: boolean;
  raw?: { numberOfDocuments?: number; isIndexing?: boolean; fieldDistribution?: Record<string, number> };
  error?: string;
};

export type AdminSearchMaintenance = {
  checkedAt: string;
  status: "configured" | "unconfigured" | "unavailable";
  active?: AdminJobItem | null;
  latest?: AdminJobItem | null;
  backlog?: number;
  lastError?: string;
};

export type AdminBackupRun = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: "Running" | "Succeeded" | "Failed" | string;
  durationMs?: number;
  repositoryLabel?: string;
  snapshotId?: string;
  snapshotCount?: number;
  error?: string;
};

export type AdminBackupSummary = {
  checkedAt: string;
  status: "configured" | "unconfigured" | "unavailable";
  repositoryLabel?: string;
  schedule?: string;
  retentionDays?: number;
  items: AdminBackupRun[];
  nextCursor: string | null;
};

export type AdminLogEntry = {
  id: string;
  time: string;
  level: string;
  service?: string;
  context?: string;
  requestId?: string;
  jobId?: string;
  sourceId?: string;
  message: string;
  fields: Record<string, unknown>;
};

export type AdminLogFilters = {
  query?: string;
  level?: string;
  service?: string;
  context?: string;
  requestId?: string;
  jobId?: string;
  sourceId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};

export type AdminLogSummary = {
  checkedAt: string;
  status: "available" | "unconfigured" | "unavailable";
  retentionDays: number;
  items: AdminLogEntry[];
  nextCursor: string | null;
};

export type AdminAiProvider = {
  id?: string;
  provider?: "openai" | "gemini" | "deepseek";
  name?: "OpenAI" | "Gemini" | "DeepSeek";
  enabled?: boolean;
  configured?: boolean;
  health?: "unknown" | "healthy" | "degraded" | "failed";
  apiKeyMasked?: string;
  maskedKey?: string;
  baseUrl?: string;
};

export type AdminAiRoute = {
  task?: string;
  taskType?: string;
  primaryProvider?: string;
  primaryModel: string;
  fallbackProvider?: string;
  fallbackModel?: string;
  retryCount: number;
  temperature?: number;
  maxOutputTokens?: number;
};
