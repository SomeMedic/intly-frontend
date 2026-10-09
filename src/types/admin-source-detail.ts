import type { AdminSource, AdminSourceRun } from "./admin";
import type { ApiList } from "./api";

export type AdminSourceSummary = Pick<AdminSource, "id" | "name" | "group" | "connectorFamily" | "healthState" | "runtimeState" | "enabled">;

export type AdminSourceLogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | string;

export type AdminSourceLogEntry = {
  id: string;
  time: string;
  level: AdminSourceLogLevel;
  message: string;
  service?: string;
  context?: string;
  runId?: string;
  sourceId?: string;
  requestId?: string;
  jobId?: string;
  fields: Record<string, unknown>;
};

export type AdminSourceLogsParams = {
  runId?: string;
  level?: string;
  from?: string;
  to?: string;
  query?: string;
  cursor?: string;
  limit?: number;
};

export type AdminSourceLogsBlock = ApiList<AdminSourceLogEntry> & {
  checkedAt: string;
  status: "available" | "unconfigured" | "unavailable" | string;
  retentionDays: number;
};

export type AdminSourceLogsResponse = {
  source: AdminSourceSummary;
  logs: AdminSourceLogsBlock;
  filters: {
    sourceId: string;
    runId?: string;
    level?: string;
    from?: string;
    to?: string;
    query?: string;
    limit: number;
  };
};

export type AdminSourceOpportunitySample = {
  opportunity: {
    id?: string;
    _id?: string;
    type?: string;
    title: string;
    companyOrClient?: string;
    summary?: string;
    sourceStatus?: string;
    firstSeenAt?: string;
    lastSeenAt?: string;
    publishedAt?: string;
    deadline?: string;
    skills?: string[];
    technologies?: string[];
    remoteType?: string;
    location?: string;
    money?: Record<string, unknown>;
    canonicalTags?: string[];
  };
  occurrence: {
    sourceId: string;
    externalId?: string;
    url?: string;
    primary?: boolean;
    firstSeenAt?: string;
    lastSeenAt?: string;
    publishedAt?: string;
    checksum?: string;
    status?: string;
    hasRawPayload?: boolean;
    hasSourceMetadata?: boolean;
    rawPayload?: unknown;
    sourceMetadata?: Record<string, unknown>;
    normalizedSnapshot?: Record<string, unknown>;
  };
};

export type AdminSourceSamplesParams = {
  cursor?: string;
  limit?: number;
  includeRaw?: string;
};

export type AdminSourceSamplesResponse = {
  source: AdminSourceSummary;
  items: AdminSourceOpportunitySample[];
  nextCursor: string | null;
};

export type AdminSourceRunsParams = {
  sourceId?: string;
  status?: string;
  cursor?: string | null;
  limit?: number;
};

export type AdminSourceRunsResponse = ApiList<AdminSourceRun> & {
  latestCollectionRun?: AdminSourceRun | null;
};

export type SourceInspectorToolAction = "reindex" | "reprocess" | "normalize" | "deduplicate";

export type AdminSourceToolCapability = {
  supported: boolean;
  reason?: string;
  reasonCode?: string;
  requiresOpportunity: boolean;
};

export type AdminSourceToolCapabilities = {
  sourceId: string;
  supportedActions: SourceInspectorToolAction[];
  unavailableActions: Array<{ action: SourceInspectorToolAction; reason: string; reasonCode?: string }>;
  actions: Record<SourceInspectorToolAction, AdminSourceToolCapability>;
};

export type AdminSourceToolCapabilitiesResponse = {
  source: AdminSourceSummary;
  capabilities: AdminSourceToolCapabilities;
};

export type AdminSourceToolReceipt = {
  status: "queued" | "unsupported" | string;
  action: SourceInspectorToolAction | string;
  sourceId: string;
  opportunityId: string;
  requestId?: string;
  job?: { id: string; queue: string } | unknown;
  reason?: string;
  reasonCode?: string;
  supportedActions?: SourceInspectorToolAction[];
  unavailableActions?: Array<{ action: SourceInspectorToolAction; reason: string; reasonCode?: string }>;
  capabilities?: Record<SourceInspectorToolAction, AdminSourceToolCapability>;
};

export type AdminSourceReindexResponse = AdminSourceToolReceipt;
