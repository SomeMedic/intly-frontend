export type AiProvider = "openai" | "gemini" | "deepseek";
export type AiTaskType = "opportunity_analysis" | "response_generation" | "resume_adaptation" | "document_extraction" | "tender_document_analysis" | "editor_transform";

export type AdminAiProviderConfig = {
  id?: string;
  _id?: string;
  provider: AiProvider;
  enabled: boolean;
  apiKeyMasked?: string;
  baseUrl?: string;
  health?: Record<string, unknown>;
  pricing?: AiModelPrice[];
};

export type AiModelPrice = {
  modelId: string;
  inputPerMillion: number;
  outputPerMillion: number;
  cachedInputPerMillion?: number;
  sourceUrl?: string;
};

export type AdminAiProviderTestResult = {
  provider: AiProvider;
  modelId: string;
  status: "healthy" | "failed";
  checkedAt: string;
  persisted?: boolean;
  latencyMs?: number;
  errorCode?: string;
  message?: string;
};

export type AdminAiRouteConfig = {
  id?: string;
  _id?: string;
  taskType: AiTaskType;
  primaryProvider: AiProvider;
  primaryModel: string;
  fallbackProvider?: AiProvider | null;
  fallbackModel?: string | null;
  retryCount: number;
  temperature?: number;
  maxOutputTokens?: number;
};

export type AdminAiPromptTemplate = {
  id?: string;
  _id?: string;
  taskType: AiTaskType;
  systemCore: string;
  taskInstructions: string;
  versionLabel: string;
  updatedAt?: string;
};

export type AdminAiSchema = {
  taskType: AiTaskType;
  schemaVersion: string;
  readonly: boolean;
  json: Record<string, unknown>;
};

export type AdminAiUsageRow = {
  id?: {
    userId?: string;
    taskType?: AiTaskType;
    provider?: AiProvider;
    modelId?: string;
    status?: AdminAiTestRun["status"];
  };
  _id?: {
    userId?: string;
    taskType?: AiTaskType;
    provider?: AiProvider;
    modelId?: string;
    status?: AdminAiTestRun["status"];
  };
  user?: {
    name?: string;
    email?: string;
  };
  runs?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number | null;
  costKnownRuns?: number;
  costUnknownRuns?: number;
  avgLatencyMs?: number | null;
  latencySamples?: number;
};

export type AdminAiCallUsageRow = {
  id?: {
    userId?: string;
    taskType?: AiTaskType;
    provider?: AiProvider;
    modelId?: string;
    status?: AdminAiTestRun["status"];
  };
  _id?: {
    userId?: string;
    taskType?: AiTaskType;
    provider?: AiProvider;
    modelId?: string;
    status?: AdminAiTestRun["status"];
  };
  user?: {
    name?: string;
    email?: string;
  };
  calls?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number | null;
  costKnownCalls?: number;
  costUnknownCalls?: number;
  avgLatencyMs?: number | null;
  latencySamples?: number;
  lastRunId?: string;
  lastOccurredAt?: string;
};

export type AdminAiUsageStatus = Extract<AdminAiTestRun["status"], "completed" | "failed" | "cancelled">;

export type AdminAiUsageParams = {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  provider?: AiProvider;
  taskType?: AiTaskType;
  modelId?: string;
  status?: AdminAiUsageStatus;
};

export type AdminAiUsageSummary = {
  runs: number;
  completed: number;
  failed: number;
  cancelled: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost?: number | null;
  costKnownRuns: number;
  costUnknownRuns: number;
  avgLatencyMs: number | null;
  latencySamples: number;
  errorRate: number | null;
};

export type AdminAiCallSummary = {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost?: number | null;
  costKnownCalls: number;
  costUnknownCalls: number;
  avgLatencyMs: number | null;
  latencySamples: number;
};

export type AdminAiUsageUser = {
  userId: string;
  name?: string;
  email?: string;
};

export type AdminAiUsageError = {
  errorCode: string;
  runs: number;
  lastOccurredAt: string;
  lastRunId: string;
  userId?: string;
  taskType: AiTaskType;
  provider?: AiProvider;
  modelId?: string;
};

export type AdminAiUsageResponse = {
  items: AdminAiUsageRow[];
  callItems?: AdminAiCallUsageRow[];
  nextCursor: null;
  summary: AdminAiUsageSummary;
  callSummary?: AdminAiCallSummary;
  users: AdminAiUsageUser[];
  errors: AdminAiUsageError[];
};

export type AdminAiTestRequest = {
  taskType: AiTaskType;
  context?: Record<string, unknown>;
};

export type AdminAiTestRun = {
  id?: string;
  _id?: string;
  taskType: AiTaskType;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  provider?: AiProvider;
  modelId?: string;
  errorCode?: string;
  errorSummary?: string;
  structuredOutput?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  attempts?: AdminAiCallAttempt[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
};

export type AdminAiCallUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  estimatedCost?: number | null;
  pricing?: AiModelPrice;
  costBasis?: "reported-cache" | "uncached-assumed";
};

export type AdminAiCallAttempt = {
  number: number;
  provider: AiProvider;
  modelId: string;
  fallbackUsed: boolean;
  status: AdminAiTestRun["status"];
  startedAt: string;
  completedAt?: string;
  errorCode?: string;
  usage?: AdminAiCallUsage;
  pricing?: AiModelPrice;
};
