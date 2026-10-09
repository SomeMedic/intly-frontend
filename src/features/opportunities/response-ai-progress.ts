import type { OpportunityLocale } from "./opportunity-workspace-labels";

export type AiRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type AiRunStage = "preparing_context" | "retrieving_knowledge" | "calling_model" | "validating_output" | "completed";

export type AiRunLike = {
  id?: string;
  _id?: string;
  status: AiRunStatus;
  taskType: string;
  stage?: AiRunStage;
  updatedAt?: string;
};

export type AiRunProgressPayload = {
  runId: string;
  taskType: string;
  responseDraftId: string;
  stage: AiRunStage;
  status: AiRunStatus;
};

export type AiRunProgress = AiRunProgressPayload & { observedAt: number };

export function isAiRunProgressPayload(value: unknown): value is AiRunProgressPayload {
  if (!isRecord(value)) return false;
  return typeof value.runId === "string"
    && typeof value.taskType === "string"
    && typeof value.responseDraftId === "string"
    && isAiRunStage(value.stage)
    && isAiRunStatus(value.status);
}

export function progressFromRun(run: AiRunLike | undefined, responseDraftId: string, fallbackObservedAt = 0): AiRunProgress | undefined {
  if (!run?.stage) return undefined;
  const runId = getRunId(run);
  if (!runId) return undefined;
  return { runId, taskType: run.taskType, responseDraftId, stage: run.stage, status: run.status, observedAt: parseTimestamp(run.updatedAt) ?? fallbackObservedAt };
}

export function progressFromEvent(payload: AiRunProgressPayload, timestamp: string | undefined, fallbackObservedAt = 0): AiRunProgress {
  return { ...payload, observedAt: parseTimestamp(timestamp) ?? fallbackObservedAt };
}

export function chooseAiRunProgress(eventProgress: AiRunProgress | undefined, runProgress: AiRunProgress | undefined): AiRunProgress | undefined {
  if (!runProgress) return eventProgress;
  if (!eventProgress) return runProgress;
  if (isTerminalRunStatus(eventProgress.status) && !isTerminalRunStatus(runProgress.status)) return eventProgress;
  if (isTerminalRunStatus(runProgress.status) && !isTerminalRunStatus(eventProgress.status)) return runProgress;
  return eventProgress.observedAt >= runProgress.observedAt ? eventProgress : runProgress;
}

export function isTerminalRunStatus(status: AiRunStatus): boolean {
  return ["completed", "failed", "cancelled"].includes(status);
}

export function aiProgressLabel(progress: Pick<AiRunProgress, "stage" | "status">, locale: OpportunityLocale): string {
  if (progress.status === "completed") return statusLabel(progress.status, locale);
  if (progress.status === "failed") return locale === "ru" ? `Ошибка · этап: ${stageLabel(progress.stage, locale)}` : `Failed · stage: ${stageLabel(progress.stage, locale)}`;
  if (progress.status === "cancelled") return locale === "ru" ? `Отменено · этап: ${stageLabel(progress.stage, locale)}` : `Cancelled · stage: ${stageLabel(progress.stage, locale)}`;
  return `${stageLabel(progress.stage, locale)} · ${statusLabel(progress.status, locale)}`;
}

export function statusLabel(status: AiRunStatus | "queued", locale: OpportunityLocale) {
  return { queued: locale === "ru" ? "В очереди" : "Queued", running: locale === "ru" ? "Выполняется" : "Running", completed: locale === "ru" ? "Готов" : "Ready", failed: locale === "ru" ? "Ошибка" : "Failed", cancelled: locale === "ru" ? "Отменён" : "Cancelled" }[status];
}

function stageLabel(stage: AiRunStage, locale: OpportunityLocale): string {
  return {
    preparing_context: locale === "ru" ? "Готовим контекст" : "Preparing context",
    retrieving_knowledge: locale === "ru" ? "Ищем знания" : "Retrieving knowledge",
    calling_model: locale === "ru" ? "Обращаемся к AI" : "Calling model",
    validating_output: locale === "ru" ? "Проверяем результат" : "Validating output",
    completed: locale === "ru" ? "Готово" : "Completed",
  }[stage];
}

function getRunId(run: { id?: string; _id?: string }): string | null {
  return run.id ?? run._id ?? null;
}

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isAiRunStage(value: unknown): value is AiRunStage {
  return typeof value === "string" && ["preparing_context", "retrieving_knowledge", "calling_model", "validating_output", "completed"].includes(value);
}

function isAiRunStatus(value: unknown): value is AiRunStatus {
  return typeof value === "string" && ["queued", "running", "completed", "failed", "cancelled"].includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
