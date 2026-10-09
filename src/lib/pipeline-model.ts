import type { PipelineAttentionCode, PipelineAttentionFilter, PipelineBoard, PipelineBoardItem, PipelineCard, PipelineFilters, PipelineSort, PipelineStage, PipelineSuggestedAction, PipelineSuggestedActionKey, PipelineType, TaskChecklistItem, TaskType } from "@/types";

export const pipelineTypes: PipelineType[] = ["vacancy", "freelance", "tender"];

export const pipelineStageDefinitions = {
  vacancy: ["New", "Reviewed", "Interested", "Applied", "HRReply", "Interview", "TechnicalInterview", "Offer", "Rejected", "Archived"],
  freelance: ["New", "Reviewed", "Interested", "ResponseSent", "ClientReplied", "Negotiation", "Won", "InProgress", "Completed", "Lost", "Archived"],
  tender: ["New", "Reviewed", "Interested", "PreparingApplication", "ApplicationSubmitted", "Admitted", "BiddingEvaluation", "Won", "Contracting", "InProgress", "Completed", "Lost", "Archived"]
} as const satisfies Record<PipelineType, readonly PipelineStage[]>;

const legacyPipelineStatusMap: Record<PipelineType, Partial<Record<string, PipelineStage>>> = {
  vacancy: { Shortlisted: "Interested", Won: "Offer" },
  freelance: { Shortlisted: "Interested", Applied: "ResponseSent", Interview: "Negotiation", Offer: "Negotiation", Rejected: "Lost" },
  tender: { Shortlisted: "Interested", Applied: "ApplicationSubmitted", Rejected: "Lost" }
};

export const pipelineAttentionFilters: PipelineAttentionFilter[] = ["all", "needs_attention", "overdue", "follow_up_due", "deadline_urgent"];
export const pipelineAttentionCodes: PipelineAttentionCode[] = ["needs_attention", "overdue", "follow_up_due", "deadline_urgent"];
export const pipelineSorts: PipelineSort[] = ["recommended", "freshness", "score", "deadline"];
export const pipelineSuggestedActionKeys: PipelineSuggestedActionKey[] = ["follow_up", "interview_prep", "negotiation", "project", "application", "submission_reminder", "contracting"];

export type PipelineUrlState = PipelineFilters & { type: PipelineType; profileId?: string };
export type PipelineDragPayload = { opportunityId: string; from: PipelineStage; to: PipelineStage; profileId: string; type: PipelineType };
export type PipelineKeyboardMoveInput = { activeId: string; key: string; board: PipelineBoard; type: PipelineType; currentStage?: string | null };

export function stagesForPipeline(type: PipelineType): PipelineStage[] {
  return [...pipelineStageDefinitions[type]];
}

export function isStageForPipeline(type: PipelineType, stage: string | null | undefined): stage is PipelineStage {
  return !!stage && stagesForPipeline(type).includes(stage as PipelineStage);
}

export function normalizePipelineStatus(type: PipelineType, status: string | null | undefined): PipelineStage {
  if (isStageForPipeline(type, status)) return status;
  return legacyPipelineStatusMap[type][status ?? ""] ?? "New";
}

export function pipelineUrlState(params: URLSearchParams, fallbackProfileId?: string | null): PipelineUrlState {
  const rawType = params.get("type");
  const type = pipelineTypes.includes(rawType as PipelineType) ? rawType as PipelineType : "vacancy";
  const attention = pipelineAttentionFilters.includes(params.get("attention") as PipelineAttentionFilter) ? params.get("attention") as PipelineAttentionFilter : "all";
  const sort = pipelineSorts.includes(params.get("sort") as PipelineSort) ? params.get("sort") as PipelineSort : "recommended";
  return {
    type,
    profileId: params.get("profileId") || fallbackProfileId || undefined,
    sourceIds: splitParam(params.get("sourceIds")),
    minMatch: numberParam(params.get("minMatch")),
    minAiScore: numberParam(params.get("minAiScore")),
    tags: splitParam(params.get("tags")),
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    attention,
    counterpart: params.get("counterpart") || undefined,
    sort
  };
}

export function pipelineStateToParams(state: PipelineUrlState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("type", state.type);
  setParam(params, "profileId", state.profileId);
  setParam(params, "sourceIds", state.sourceIds?.join(","));
  setParam(params, "minMatch", state.minMatch?.toString());
  setParam(params, "minAiScore", state.minAiScore?.toString());
  setParam(params, "tags", state.tags?.join(","));
  setParam(params, "dateFrom", state.dateFrom);
  setParam(params, "dateTo", state.dateTo);
  if (state.attention && state.attention !== "all") params.set("attention", state.attention);
  setParam(params, "counterpart", state.counterpart);
  if (state.sort && state.sort !== "recommended") params.set("sort", state.sort);
  return params;
}

export function pipelineFiltersForApi(state: PipelineUrlState): PipelineFilters {
  return {
    sourceIds: state.sourceIds?.length ? state.sourceIds : undefined,
    minMatch: state.minMatch,
    minAiScore: state.minAiScore,
    tags: state.tags?.length ? state.tags : undefined,
    dateFrom: state.dateFrom,
    dateTo: state.dateTo,
    attention: state.attention ?? "all",
    counterpart: state.counterpart,
    sort: state.sort ?? "recommended"
  };
}

export function dragPayload(input: { activeId: string; overId: string | null | undefined; board: PipelineBoard; type: PipelineType; profileId?: string | null }): PipelineDragPayload | null {
  if (!input.profileId || !isStageForPipeline(input.type, input.overId)) return null;
  const item = findPipelineItem(input.board, input.activeId);
  if (!item || item.column.status === input.overId) return null;
  return { opportunityId: item.candidate.state.opportunityId, from: item.column.status, to: input.overId, profileId: input.profileId, type: input.type };
}

export function keyboardStageForPipelineMove(input: PipelineKeyboardMoveInput): PipelineStage | null {
  const direction = input.key === "ArrowRight" || input.key === "ArrowDown" ? 1 : input.key === "ArrowLeft" || input.key === "ArrowUp" ? -1 : 0;
  if (!direction) return null;
  const item = findPipelineItem(input.board, input.activeId);
  if (!item) return null;
  const stages = stagesForPipeline(input.type);
  const currentStage = input.currentStage ? normalizePipelineStatus(input.type, input.currentStage) : normalizePipelineStatus(input.type, item.column.status);
  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex < 0) return null;
  const targetIndex = currentIndex + direction;
  return stages[targetIndex] ?? null;
}

export function isClosedPipelineStage(stage: PipelineStage): boolean {
  return stage === "Rejected" || stage === "Archived" || stage === "Lost" || stage === "Completed";
}

export function normalizePipelineBoard(board: PipelineBoard | undefined, type: PipelineType): PipelineBoard {
  const byStatus = new Map<PipelineStage, PipelineBoard["columns"][number]>();
  for (const column of board?.columns ?? []) {
    const status = normalizePipelineStatus(type, column.status);
    const existing = byStatus.get(status);
    byStatus.set(status, existing ? { ...existing, attentionCount: undefined, items: [...existing.items, ...column.items] } : { ...column, status });
  }
  return { type, profileId: board?.profileId, columns: stagesForPipeline(type).map(status => ({ status, attentionCount: byStatus.get(status)?.attentionCount ?? attentionCount(byStatus.get(status)?.items), items: byStatus.get(status)?.items ?? [] })) };
}

export function pipelineItemToCard(item: PipelineBoardItem, sourceNames: Record<string, string> = {}): PipelineCard {
  const opportunity = item.opportunity ?? {};
  const state = item.state;
  const attention = typedAttention(item.attention ?? state.attention ?? readArray(opportunity.attention));
  const suggestedActions = typedSuggestedActions(item.suggestedActions ?? state.suggestedActions ?? readArray(opportunity.suggestedActions));
  const source = sourceIdentity(opportunity, sourceNames);
  const opportunityState = readRecord(opportunity.personalState);
  const favorite = readBoolean(state.favorite) ?? readBoolean(state.isFavorite) ?? readBoolean(opportunityState?.favorite) ?? readBoolean(opportunity.favorite) ?? false;
  const archived = readBoolean(state.archived) ?? readBoolean(opportunityState?.archived) ?? readBoolean(opportunity.archived) ?? false;
  const hidden = readBoolean(state.hidden) ?? readBoolean(opportunityState?.hidden) ?? readBoolean(opportunity.hidden) ?? false;
  return {
    id: state.id,
    opportunityId: state.opportunityId,
    profileId: state.profileId,
    title: readString(opportunity.title) || "—",
    counterpart: readString(opportunity.companyOrClient) || readString(opportunity.counterpart) || "—",
    money: moneyText(opportunity.money) || readString(opportunity.money),
    matchScore: typeof state.matchScore === "number" ? state.matchScore : readNumber(opportunity.matchScore),
    aiScore: typeof item.aiScore === "number" ? item.aiScore : typeof state.aiScore === "number" ? state.aiScore : readNumber(opportunity.aiScore),
    pipelineStatus: state.pipelineStatus,
    attention,
    attentionCount: typeof state.attentionCount === "number" ? state.attentionCount : attention.length,
    dueAt: item.dueAt ?? state.dueAt ?? readString(opportunity.deadline) ?? readString(opportunity.dueAt),
    sourceId: source.id,
    sourceName: source.name,
    tags: splitArray(state.tags) ?? splitArray(opportunity.canonicalTags) ?? splitArray(opportunity.tags),
    firstSeenAt: readString(opportunity.firstSeenAt),
    publishedAt: readString(opportunity.publishedAt),
    suggestedActions,
    favorite,
    archived,
    hidden,
    closed: archived || hidden || isClosedPipelineStage(state.pipelineStatus),
    rawOpportunity: item.opportunity
  };
}

export function suggestionToTaskDraft(action: PipelineSuggestedAction, context: { opportunityId: string; opportunityTitle: string; profileId?: string; boardId?: string; statusColumnId?: string; locale?: "ru" | "en" }) {
  return {
    boardId: action.boardId ?? context.boardId ?? "",
    statusColumnId: context.statusColumnId ?? "todo",
    title: action.title || defaultSuggestionTitle(action.key, context.opportunityTitle, context.locale ?? "en"),
    description: action.description ?? "",
    type: action.taskType ?? taskTypeForSuggestion(action.key),
    priority: action.priority ?? priorityForSuggestion(action.key),
    dueAt: action.dueAt,
    opportunityId: context.opportunityId,
    profileId: context.profileId,
    checklist: action.checklist?.length ? action.checklist : defaultChecklist(action.key, context.locale ?? "en"),
    labels: ["pipeline", action.key]
  };
}

export function taskTypeForSuggestion(key: PipelineSuggestedActionKey): TaskType {
  if (key === "interview_prep") return "Interview Prep";
  if (key === "application") return "Application";
  if (["submission_reminder", "contracting"].includes(key)) return "Tender Step";
  if (key === "project") return "Task";
  return "Follow-up";
}

export function priorityForSuggestion(key: PipelineSuggestedActionKey): string {
  return ["submission_reminder", "contracting"].includes(key) ? "high" : "normal";
}

function defaultSuggestionTitle(key: PipelineSuggestedActionKey, title: string, locale: "ru" | "en") {
  const prefix: Record<"ru" | "en", Record<PipelineSuggestedActionKey, string>> = {
    ru: { follow_up: "Связаться", interview_prep: "Подготовить интервью", negotiation: "Подготовить переговоры", project: "Собрать план проекта", application: "Подготовить заявку", submission_reminder: "Проверить результат заявки", contracting: "Подготовить договор" },
    en: { follow_up: "Follow up", interview_prep: "Prepare interview", negotiation: "Prepare negotiation", project: "Create project plan", application: "Prepare application", submission_reminder: "Check application result", contracting: "Prepare contracting" }
  };
  return `${prefix[locale][key]}: ${title}`.slice(0, 240);
}

function defaultChecklist(key: PipelineSuggestedActionKey, locale: "ru" | "en"): TaskChecklistItem[] {
  const checklists: Record<"ru" | "en", Record<PipelineSuggestedActionKey, string[]>> = {
    ru: {
      follow_up: ["Проверить контекст", "Написать короткое сообщение", "Зафиксировать следующий шаг"],
      interview_prep: ["Проверить требования", "Подготовить вопросы", "Подтвердить время и формат"],
      negotiation: ["Сверить условия", "Определить минимально приемлемые параметры", "Подготовить аргументы"],
      project: ["Описать этапы", "Оценить сроки", "Проверить риски"],
      application: ["Проверить требования", "Подготовить черновик заявки", "Проверить комплект перед подачей"],
      submission_reminder: ["Проверить статус рассмотрения", "Зафиксировать ответ площадки", "Запланировать следующий шаг по результату"],
      contracting: ["Проверить условия договора", "Сверить реквизиты заказчика", "Подготовить шаги подписания"]
    },
    en: {
      follow_up: ["Review context", "Write a short message", "Record the next step"],
      interview_prep: ["Review requirements", "Prepare questions", "Confirm time and format"],
      negotiation: ["Review terms", "Set acceptable boundaries", "Prepare arguments"],
      project: ["Outline phases", "Estimate timeline", "Check risks"],
      application: ["Check requirements", "Prepare application draft", "Review submission package"],
      submission_reminder: ["Check review status", "Record the platform response", "Plan the next step from the result"],
      contracting: ["Check contract terms", "Verify customer details", "Prepare signing steps"]
    }
  };
  return checklists[locale][key].map(text => ({ text }));
}

function findPipelineItem(board: PipelineBoard, activeId: string) {
  return board.columns.flatMap(column => column.items.map(candidate => ({ column, candidate }))).find(({ candidate }) => itemId(candidate) === activeId || candidate.state.opportunityId === activeId);
}

function sourceIdentity(opportunity: Record<string, unknown>, sourceNames: Record<string, string>) {
  const directId = readString(opportunity.sourceId) || readString(readRecord(opportunity.source)?.id);
  const directName = readString(opportunity.sourceName) || readString(readRecord(opportunity.source)?.name);
  const occurrences = readArray(opportunity.sourceOccurrences).map(readRecord).filter((item): item is Record<string, unknown> => Boolean(item));
  const primary = occurrences.find(item => item.primary === true) ?? occurrences[0];
  const id = directId || readString(primary?.sourceId);
  const name = directName || (id ? sourceNames[id] : undefined) || readString(primary?.sourceName);
  return { id, name };
}

function itemId(item: PipelineBoardItem) { return item.state.id || item.state.opportunityId; }
function splitParam(value: string | null) { return value?.split(",").map(item => item.trim()).filter(Boolean) ?? undefined; }
function numberParam(value: string | null) { const number = value ? Number(value) : NaN; return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : undefined; }
function setParam(params: URLSearchParams, key: string, value?: string) { if (value) params.set(key, value); }
function readString(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function readNumber(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function readBoolean(value: unknown) { return typeof value === "boolean" ? value : undefined; }
function readArray(value: unknown) { return Array.isArray(value) ? value : []; }
function readRecord(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function splitArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && !!item.trim()) : undefined; }
function moneyText(value: unknown) { const money = readRecord(value); if (!money) return undefined; if (readString(money.originalText)) return readString(money.originalText); const numbers = [money.min, money.max].filter((item): item is number => typeof item === "number" && Number.isFinite(item)); return numbers.length ? `${numbers.join(" – ")} ${readString(money.currency) ?? ""}`.trim() : undefined; }
function typedAttention(value: unknown[]): PipelineAttentionCode[] { return value.map(item => typeof item === "string" ? item : readString(readRecord(item)?.code)).filter((item): item is PipelineAttentionCode => pipelineAttentionCodes.includes(item as PipelineAttentionCode)); }
function typedSuggestedActions(value: unknown[]): PipelineSuggestedAction[] { return value.map(item => typeof item === "string" ? { key: item } : readRecord(item)).filter((item): item is PipelineSuggestedAction => !!item && pipelineSuggestedActionKeys.includes(item.key as PipelineSuggestedActionKey)); }
function attentionCount(items?: PipelineBoardItem[]) { return items?.reduce((sum, item) => sum + (item.state.attentionCount ?? typedAttention(item.attention ?? item.state.attention ?? []).length), 0) ?? 0; }
