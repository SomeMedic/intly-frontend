"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/react";
import { ArrowRight, Check, Copy, Download, ExternalLink, PanelLeft, PanelRight, Plus, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/services/api";
import { SseClient, type SseConnectionState } from "@/services/sse";
import type { SseEvent } from "@/types";
import { downloadStoredFile } from "@/services/files/download-file";
import { EmptyState } from "@/components/intly/empty-state";
import { ErrorState } from "@/components/intly/error-state";
import { RichTextEditor, documentToMarkdown, type RichTextEditorHandle, type RichTextSelection } from "@/components/intly/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { selectClass, sourceUrl, type OpportunityRecord, type Page } from "./contracts";
import { responseFormatLabels, responseStatusLabels, saveStateLabels, type OpportunityLocale } from "./opportunity-workspace-labels";
import { clearPendingResponseTransform, clearResponseRecovery, readPendingResponseTransform, readResponseRecovery, responseLocalStorage, writePendingResponseTransform, writeResponseRecovery, type ResponsePendingTransform } from "./response-local-state";
import { tenderRequirements } from "./tender-workspace-state";
import { ensureTenderApplicationSection, tenderApplicationSectionLabels, tenderApplicationSections, type TenderApplicationSection, type TenderApplicationSectionType } from "./response-tender-sections";
import { applyEditorOperations, humanRewriteDiff, listResponseEditorBlocks, normalizeResponseChecklist, editorToolLabel, parseEditorTransformOperations, previewEditorOperation, responseReadinessIssues, serializeResponseChecklist, shouldAutosaveDraft, shouldHydrateFromServer, shouldInterceptResponseNavigationClick, targetFromSelection, transformSelectionPayload, withChecklistItem, type EditorOperation, type EditorTarget, type EditorTool, type ReadinessIssue, type ResponseChecklist, type ResponseEditorBlock } from "./response-panel-state";

import { useAuthStore } from "@/features/auth";
import { guardDraftHistory } from "@/lib/draft-history";
import { ResponseContextRail, ResponseAiPresets, ResponseCommercialFields, commercialFieldsFromAnalysis, type ResponseCommercialFieldsValue } from "./response-context";
import { aiProgressLabel, chooseAiRunProgress, isAiRunProgressPayload, isTerminalRunStatus, progressFromEvent, progressFromRun, statusLabel, type AiRunProgress, type AiRunStage, type AiRunStatus } from "./response-ai-progress";
import { readPinnedContextFacts, writePinnedContextFacts, pinContextFact, unpinContextFact, type PinnedContextFact } from "./response-context-state";
import { canConfirmFinalSubmission, canOpenFinalSubmission, finalSubmissionStatusPayload } from "./response-final-action-state";
import { responsePipelineActions } from "./response-pipeline-state";
import { PipelineSuggestionTaskDialog, type PipelineSuggestionTaskState } from "@/features/workflows";

type Draft = { id: string; revision: number; format: string; status: "draft" | "ready" | "sent" | "submitted"; documentJson: JSONContent; proposedCommercialFields?: Record<string, unknown>; markdownCache?: string; checklist?: Record<string, unknown>; unresolvedPlaceholders?: string[]; generation?: { status?: string; runId?: string; errorSummary?: string }; pipelineHandoff?: { id: string; status: "pending" | "synced" | "error" } };
type AiRun = { id?: string; _id?: string; status: AiRunStatus; taskType: string; stage?: AiRunStage; errorCode?: string; errorSummary?: string; structuredOutput?: Record<string, unknown>; metadata?: Record<string, unknown> };
type TransformJob = ResponsePendingTransform;
type TransformRequest = { instruction?: string; scope?: EditorTarget["kind"]; tool?: EditorTool; blockId?: string; selection?: RichTextSelection };
type TransformProposal = { operation: EditorOperation | null; operations: EditorOperation[]; summary?: string };
type ConflictState = { localDocument: JSONContent; localText: string; serverDraft: Draft; serverText: string };

const formatsByType = { vacancy: ["short_response", "full_response", "cover_letter", "telegram_chat", "why_good_fit"], freelance: ["short_proposal", "full_proposal", "chat_message", "commercial_proposal"], tender: ["commercial_proposal", "application_draft", "checklist_text"] };

const responseCopy = {
  ru: {
    noProfileTitle: "Выберите профиль для отклика",
    noProfileDescription: "Отклики и AI-контекст доступны только владельцу профиля и администратору.",
    title: "Личный отклик",
    description: "Подготовьте текст, проверьте факты и отправьте его на площадке вручную.",
    formatAria: "Формат отклика",
    loading: "Загружаем отклики…",
    emptyTitle: "Черновик ещё не создан",
    emptyDescription: "Можно написать текст самому или использовать AI после создания черновика.",
    creating: "Создаём…",
    createDraft: "Создать черновик",
    waitDraftLoad: "Дождитесь загрузки черновика перед сохранением",
    resolveConflict: "Разрешите конфликт сохранения перед продолжением",
    saveFailed: "Не удалось сохранить текст",
    lastChangeFailed: "Не удалось сохранить последнее изменение отклика",
    waitSave: "Дождитесь сохранения последнего изменения",
    readinessFallback: "Проверьте готовность отклика",
    transformInstructionRequired: "Опишите, как изменить текст",
    aiRunNoId: "AI-запуск не вернул идентификатор",
    aiTransformStarted: "AI-правка запущена",
    draftChangedAfterAi: "Черновик изменился после запуска AI. Запустите правку заново для текущей версии.",
    selectionMismatch: "AI-правка не совпадает с исходным выделением и не применена.",
    selectedTextChanged: "Выделенный фрагмент изменился. AI-правка не применена.",
    applySelectionFailed: "Не удалось применить AI-правку к выбранному фрагменту",
    invalidOperation: "AI-правка ссылается на несуществующий блок или невалидный документ",
    transformApplied: "AI-правка применена. Проверьте текст перед сохранением.",
    checklistSaved: "Проверка сохранена",
    checklistSaveFailed: "Не удалось сохранить чеклист",
    copied: "Текст скопирован",
    copyFailed: "Не удалось скопировать текст",
    copy: "Копировать",
    save: "Сохранить",
    retrySave: "Повторить сохранение",
    editorKeepsText: "Ваш текст остаётся в редакторе. Попробуйте сохранить ещё раз.",
    loadingDraft: "Загружаем текущий черновик…",
    staleGeneration: "AI подготовил текст, но черновик уже изменился. Ваши правки сохранены; новый результат доступен в истории AI.",
    aiAssistant: "AI-помощник",
    aiAssistantHint: "Генерация использует подтверждённый опыт. Проверьте текст перед отправкой.",
    generate: "Сгенерировать текст",
    generating: "Генерируем…",
    generationInstructionAria: "Инструкция для генерации отклика",
    generationPlaceholder: "Что подчеркнуть в этом отклике…",
    aiEdit: "AI-правка текста",
    aiEditHint: "Выберите область и инструмент. Сначала сравните предложенные изменения, затем примените.",
    startEdit: "Запустить правку",
    editing: "Правим…",
    scope: "Область",
    tool: "Инструмент",
    block: "Блок",
    selection: "Выделение",
    wholeDraft: "Весь черновик",
    transformInstructionAria: "Инструкция для AI-правки текста",
    transformPlaceholder: "Например: сделай короче и увереннее, сохрани факты…",
    markReady: "Отметить готовым",
    sentExternally: "Отправлен на площадке",
    submitTitle: "Отклик отправлен?",
    submitDescription: "INTLY готовит документы. Отправку на внешней площадке вы выполняете самостоятельно.",
    submitConfirm: "Я отправил этот отклик на внешней площадке и хочу зафиксировать это в INTLY.",
    submitTenderTitle: "Заявка подана?",
    submitTenderDescription: "INTLY фиксирует только факт внешней подачи. Незакрытые проверки и предупреждения сохранятся.",
    submitTenderConfirm: "Я уже фактически подал заявку на внешней площадке и хочу зафиксировать этот факт в INTLY. Это не означает, что чек-лист готовности пройден.",
    submitReadinessWarningTitle: "Проверки готовности ещё не закрыты",
    confirmSent: "Подтвердить отправку",
    submitTenderWarningTitle: "Проверьте тендер перед фиксацией отправки",
    submitTenderRequirementsMissing: "В тендере нет выделенного списка требований. Проверьте документы вручную перед отправкой.",
    submitTenderUnknown: (count: number) => `Требования без подтверждённого статуса: ${count}.`,
    submitTenderNotMet: (count: number) => `Невыполненные требования: ${count}.`,
    submitTenderConflicts: (count: number) => `Критические расхождения источников: ${count}.`,
    selectTextForEdit: "Выделите фрагмент текста для AI-правки",
    noBlockForEdit: "В черновике нет блока для AI-правки",
    emptyBlock: "Пустой блок",
    blockPrefix: "Блок",
    conflictTitle: "Конфликт сохранения",
    conflictHint: "Редактор не перезаписывает сервер автоматически. Выберите, какую версию оставить.",
    myUnsavedText: "Ваш несохранённый текст",
    serverVersion: "Версия сервера",
    serverVersionLoadFailed: "Не удалось загрузить текущую версию сервера. Ваш текст остаётся в редакторе.",
    keepMine: "Сохранить мой текст поверх серверной версии",
    takeServer: "Взять версию сервера",
    readinessTitle: "Проверка готовности",
    readinessDescription: "Эти подтверждения сохраняются в черновике и требуются перед готовностью, отправкой и экспортом.",
    ready: "Готово",
    needsReview: "Нужно проверить",
    saving: "Сохраняем…",
    blockersTitle: "Перед готовностью, отправкой и экспортом осталось:",
    previewTitle: "Предпросмотр AI-правки",
    close: "Закрыть",
    before: "Было",
    after: "Станет",
    waiting: "Ожидаем результат…",
    invalidAiResult: "AI не вернул валидное предложение",
    proposedChanges: "Предложенные изменения",
    unchanged: "Текст предложения совпадает с исходным фрагментом.",
    showOperations: "Показать технические детали",
    transformFailed: "AI-правка завершилась ошибкой",
    providerMissing: "AI-провайдер ещё не настроен. Администратор может подключить его в настройках AI. Ваш текст остаётся в редакторе.",
    applyAfterReview: "Применить после просмотра",
    dismiss: "Не применять",
    sseFallback: "Проверяем статус без live-обновлений…",
  },
  en: {
    noProfileTitle: "Choose a profile for the response",
    noProfileDescription: "Responses and AI context are available only to the profile owner and administrator.",
    title: "Private response",
    description: "Prepare the text, check the facts, and send it manually on the external platform.",
    formatAria: "Response format",
    loading: "Loading responses…",
    emptyTitle: "Draft has not been created yet",
    emptyDescription: "You can write the text yourself or use AI after creating a draft.",
    creating: "Creating…",
    createDraft: "Create draft",
    waitDraftLoad: "Wait for the draft to load before saving",
    resolveConflict: "Resolve the save conflict before continuing",
    saveFailed: "Could not save text",
    lastChangeFailed: "Could not save the latest response change",
    waitSave: "Wait for the latest change to save",
    readinessFallback: "Check response readiness",
    transformInstructionRequired: "Describe how to change the text",
    aiRunNoId: "AI run did not return an id",
    aiTransformStarted: "AI edit started",
    draftChangedAfterAi: "The draft changed after the AI edit started. Run the edit again for the current version.",
    selectionMismatch: "The AI edit no longer matches the original selection and was not applied.",
    selectedTextChanged: "The selected fragment changed. The AI edit was not applied.",
    applySelectionFailed: "Could not apply the AI edit to the selected fragment",
    invalidOperation: "The AI edit points to a missing block or invalid document",
    transformApplied: "AI edit applied. Review the text before saving.",
    checklistSaved: "Check saved",
    checklistSaveFailed: "Could not save checklist",
    copied: "Text copied",
    copyFailed: "Could not copy text",
    copy: "Copy",
    save: "Save",
    retrySave: "Retry save",
    editorKeepsText: "Your text remains in the editor. Try saving again.",
    loadingDraft: "Loading current draft…",
    staleGeneration: "AI prepared text, but the draft has already changed. Your edits are saved; the new result is available in AI history.",
    aiAssistant: "AI assistant",
    aiAssistantHint: "Generation uses confirmed experience. Review the text before sending.",
    generate: "Generate text",
    generating: "Generating…",
    generationInstructionAria: "Response generation instruction",
    generationPlaceholder: "What should this response emphasize…",
    aiEdit: "AI text edit",
    aiEditHint: "Choose the scope and tool. Compare the proposed changes first, then apply them.",
    startEdit: "Start edit",
    editing: "Editing…",
    scope: "Scope",
    tool: "Tool",
    block: "Block",
    selection: "Selection",
    wholeDraft: "Whole draft",
    transformInstructionAria: "AI text edit instruction",
    transformPlaceholder: "For example: make it shorter and more confident, keep the facts…",
    markReady: "Mark ready",
    sentExternally: "Sent on platform",
    submitTitle: "Response sent?",
    submitDescription: "INTLY prepares documents. You send the response on the external platform yourself.",
    submitConfirm: "I sent this response on the external platform and want to record it in INTLY.",
    submitTenderTitle: "Application submitted?",
    submitTenderDescription: "INTLY records only the external submission fact. Open checks and warnings will remain.",
    submitTenderConfirm: "I have actually submitted this application on the external platform and want to record that fact in INTLY. This does not mean the readiness checklist is complete.",
    submitReadinessWarningTitle: "Readiness checks are still open",
    confirmSent: "Confirm sending",
    submitTenderWarningTitle: "Check the tender before recording the submission",
    submitTenderRequirementsMissing: "The tender has no extracted requirements list. Check the documents manually before submission.",
    submitTenderUnknown: (count: number) => `Requirements without a confirmed status: ${count}.`,
    submitTenderNotMet: (count: number) => `Requirements not met: ${count}.`,
    submitTenderConflicts: (count: number) => `Critical source conflicts: ${count}.`,
    selectTextForEdit: "Select a text fragment for AI editing",
    noBlockForEdit: "There is no block in the draft for AI editing",
    emptyBlock: "Empty block",
    blockPrefix: "Block",
    conflictTitle: "Save conflict",
    conflictHint: "The editor does not overwrite the server automatically. Choose which version to keep.",
    myUnsavedText: "Your unsaved text",
    serverVersion: "Server version",
    serverVersionLoadFailed: "Could not load the current server version. Your text remains in the editor.",
    keepMine: "Save my text over the server version",
    takeServer: "Use server version",
    readinessTitle: "Readiness check",
    readinessDescription: "These confirmations are saved in the draft and are required before marking ready, sending, and export.",
    ready: "Ready",
    needsReview: "Needs review",
    saving: "Saving…",
    blockersTitle: "Before readiness, sending, and export:",
    previewTitle: "AI edit preview",
    close: "Close",
    before: "Before",
    after: "After",
    waiting: "Waiting for result…",
    invalidAiResult: "AI did not return a valid suggestion",
    proposedChanges: "Proposed changes",
    unchanged: "The proposed text matches the original fragment.",
    showOperations: "Show technical details",
    transformFailed: "AI edit failed",
    providerMissing: "The AI provider is not configured yet. An administrator can connect it in AI settings. Your text remains in the editor.",
    applyAfterReview: "Apply after review",
    dismiss: "Do not apply",
    sseFallback: "Checking status without live updates…",
  }
};

type ResponseCopy = (typeof responseCopy)[OpportunityLocale];

const tenderResponseCopy: Record<OpportunityLocale, ResponseCopy> = {
  ru: {
    ...responseCopy.ru,
    readinessDescription: "Эти подтверждения нужны для статуса «Готов» и экспорта. Факт уже выполненной подачи можно записать отдельно; незакрытые проверки сохранятся.",
    blockersTitle: "Для статуса «Готов» и экспорта осталось:",
    confirmSent: "Подтвердить подачу",
    submitTenderWarningTitle: "Незакрытые вопросы по тендеру",
    submitTenderRequirementsMissing: "В тендере нет выделенного списка требований. Проверка документов остаётся незавершённой.",
  },
  en: {
    ...responseCopy.en,
    readinessDescription: "These checks are required for Ready and export. An actual external submission can be recorded separately; open checks will remain.",
    blockersTitle: "Before marking Ready and exporting:",
    confirmSent: "Confirm submission",
    submitTenderWarningTitle: "Open tender questions",
    submitTenderRequirementsMissing: "The tender has no extracted requirements list. Document review remains incomplete.",
  },
};

export function ResponsePanel({ opportunity, profileId, locale = "ru", onOpenPipeline }: { opportunity: OpportunityRecord; profileId?: string; locale?: OpportunityLocale; onOpenPipeline?: () => void }) {
  const copy = opportunity.type === "tender" ? tenderResponseCopy[locale] : responseCopy[locale];
  const ownerId = useAuthStore(state => state.user?.id);
  const [format, setFormat] = useState(formatsByType[opportunity.type][0]);
  const client = useQueryClient();
  const navigationRef = useRef<((resume: () => void) => void) | null>(null);
  const changeFormat = (next: string) => navigationRef.current ? navigationRef.current(() => setFormat(next)) : setFormat(next);
  const query = useQuery({ queryKey: ["responses", opportunity.id, profileId, ownerId], queryFn: () => api.get<Page<Draft>>(`/responses?opportunityId=${opportunity.id}&profileId=${profileId}`), enabled: !!profileId });
  const availableFormats = [...formatsByType[opportunity.type], ...(query.data?.items.some(item => item.format === "why_good_fit") && opportunity.type === "freelance" ? ["why_good_fit"] : [])];
  const draft = query.data?.items.find(item => item.format === format);
  const create = useMutation({ mutationFn: () => api.post<Draft>("/responses", { opportunityId: opportunity.id, profileId, format }), onSuccess: () => client.invalidateQueries({ queryKey: ["responses", opportunity.id] }), onError: error => toast.error(error.message) });
  if (!profileId) return <EmptyState title={copy.noProfileTitle} description={copy.noProfileDescription} />;
  return <section className="space-y-4"><div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h2 className="font-semibold">{copy.title}</h2><p className="mt-1 text-sm text-muted-foreground">{copy.description}</p></div><select className={selectClass + " max-w-full md:hidden"} aria-label={copy.formatAria} value={format} onChange={event => changeFormat(event.target.value)}>{availableFormats.map(value => <option key={value} value={value}>{responseFormatLabels[locale][value]}</option>)}</select></div>
    <div role="tablist" aria-label={copy.formatAria} className="hidden min-w-0 gap-2 overflow-x-auto pb-2 md:flex">{availableFormats.map(value => {
      const item = query.data?.items.find(draft => draft.format === value);
      const label = item ? responseStatusLabels[locale][item.status] : locale === "ru" ? "Пусто" : "Empty";
      return <button key={value} role="tab" type="button" aria-selected={format === value} className={["flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors motion-reduce:transition-none", format === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"].join(" ")} onClick={() => changeFormat(value)}>{responseFormatLabels[locale][value]}<span className="text-[10px] opacity-80">{label}</span></button>;
    })}</div>
    {query.isPending ? <p>{copy.loading}</p> : query.isError ? <ErrorState message={query.error.message} onRetry={() => query.refetch()} /> : draft ? <DraftEditor key={ownerId + ":" + draft.id} navigationRef={navigationRef} onOpenPipeline={onOpenPipeline} ownerId={ownerId ?? ""} profileId={profileId} id={draft.id} initial={draft} opportunity={opportunity} locale={locale} copy={copy} /> : <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} actionLabel={create.isPending ? copy.creating : copy.createDraft} onAction={() => !create.isPending && create.mutate()} />}
  </section>;
}

function DraftEditor({ id, initial, opportunity, locale, copy, ownerId, profileId, navigationRef, onOpenPipeline }: { onOpenPipeline?: () => void; ownerId: string; profileId: string; navigationRef: { current: ((resume: () => void) => void) | null }; id: string; initial: Draft; opportunity: OpportunityRecord; locale: OpportunityLocale; copy: ResponseCopy }) {
  const client = useQueryClient();
  const router = useRouter();
  const [pipelineSuggestion, setPipelineSuggestion] = useState<PipelineSuggestionTaskState>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const checklistInputRefs = useRef(new Map<string, HTMLInputElement>());
  const transformPreviewRef = useRef<HTMLDivElement>(null);
  const staleGenerationRef = useRef<HTMLParagraphElement>(null);
  const [sseState, setSseState] = useState<SseConnectionState>("idle");
  const ssePollingFallback = sseState !== "connected";
  const query = useQuery({ queryKey: ["response", id], queryFn: () => api.get<Draft>(`/responses/${id}`), placeholderData: initial,
    refetchInterval: query => ssePollingFallback && isBusyGeneration(query.state.data) ? 1500 : false,
  });
  const commercialAnalysis = useQuery({ queryKey: ["response-commercial-analysis", opportunity.id, profileId, ownerId],
    queryFn: () => api.get<Page<AiRun>>("/ai/runs?opportunityId=" + encodeURIComponent(opportunity.id) + "&profileId=" + encodeURIComponent(profileId) + "&taskType=opportunity_analysis"),
    enabled: opportunity.type === "freelance",
  });
  const commercialInitial = draftFields(initial.proposedCommercialFields) ?? commercialFieldsFromAnalysis(commercialAnalysis.data?.items.find(run => run.status === "completed")?.structuredOutput);
  const hydrated = query.isSuccess && !query.isPlaceholderData;
  const draft = query.data ?? initial;
  const pipelineActions = responsePipelineActions({ type: opportunity.type, status: draft.status, profileId, pipelineStatus: opportunity.personalState?.pipelineStatus, handoffStatus: draft.pipelineHandoff?.status });
  const handoffIncomplete = draft.pipelineHandoff?.status === "pending" || draft.pipelineHandoff?.status === "error";
  useEffect(() => {
    if (draft.pipelineHandoff?.status !== "synced") return;
    void client.invalidateQueries({ queryKey: ["opportunity", opportunity.id] });
    void client.invalidateQueries({ queryKey: ["pipelines"] });
    void client.invalidateQueries({ queryKey: ["dashboard"] });
    void client.invalidateQueries({ queryKey: ["analytics"] });
  }, [client, opportunity.id, draft.pipelineHandoff?.id, draft.pipelineHandoff?.status]);
  const [document, setDocument] = useState<JSONContent>(initial.documentJson);
  const [text, setText] = useState(documentText(initial.documentJson));
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "error" | "conflict">("saved");
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [instruction, setInstruction] = useState("");
  const [transformInstruction, setTransformInstruction] = useState("");
  const [transformScope, setTransformScope] = useState<EditorTarget["kind"] | "auto">("auto");
  const [selectionState, setSelectionState] = useState<{selection: RichTextSelection | null; blockId: string | null}>({selection: null, blockId: null});
  const [regenerationRequest, setRegenerationRequest] = useState<TransformRequest | null>(null);
  const [online, setOnline] = useState(true);
  const onlineRef = useRef(true);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const navigationGuard = useRef<(() => void) | null>(null);
  const allowNavigation = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [wideWorkspace, setWideWorkspace] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [contextCollapsed, setContextCollapsed] = useState(false);
  const [assistantCollapsed, setAssistantCollapsed] = useState(false);
  const [transformTool, setTransformTool] = useState<EditorTool>("rewriteSelection");
  const [transformBlockId, setTransformBlockId] = useState("");
  const [transformJob, setTransformJob] = useState<TransformJob | null>(null);
  const [aiRunProgress, setAiRunProgress] = useState<Record<string, AiRunProgress>>({});
  const [checklistSaving, setChecklistSaving] = useState<string | null>(null);
  const [commercialInserting, setCommercialInserting] = useState(false);
  const commercialInsertionRef = useRef(false);
  const pendingCommercialFocusBlock = useRef<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const server = useRef(initial);
  const latest = useRef({ document: initial.documentJson, text: documentText(initial.documentJson), version: 0, savedVersion: 0 });
  const savePromise = useRef<Promise<Draft> | null>(null);
  const saveRef = useRef<(() => Promise<Draft>) | null>(null);
  const mounted = useRef(true);
  const blocked = useRef(false);
  const hydratedRef = useRef(false);
  const userEdited = useRef(false);
  const recovered = useRef(false);
  const recoveryTimestamp = useRef(0);
  const [recoveryNotice, setRecoveryNotice] = useState(false);
  const [durableRecovery, setDurableRecovery] = useState(true);
  const pendingJobRef = useRef<TransformJob | null>(null);
  const [pinnedFacts, setPinnedFacts] = useState<PinnedContextFact[]>([]);
  const pinScope = useMemo(() => ({ ownerId, opportunityId: opportunity.id, profileId, draftId: id }), [ownerId, opportunity.id, profileId, id]);

  function retainLocal(documentJson: JSONContent, plainText: string) {
    const timestamp = nextRecoveryTimestamp(recoveryTimestamp.current);
    recoveryTimestamp.current = timestamp;
    const retained = writeResponseRecovery(responseLocalStorage(), ownerId, id, { document: documentJson, text: plainText, baseRevision: server.current.revision, updatedAt: timestamp });
    setDurableRecovery(retained);
  }

  function acknowledgeDraft(updated: Draft) {
    server.current = updated;
    client.setQueryData(["response", id], updated);
    const dirty = latest.current.version !== latest.current.savedVersion || userEdited.current;
    if (dirty) retainLocal(latest.current.document, latest.current.text);
    if (mounted.current) { setSaveState(dirty ? "dirty" : "saved"); setSaveError(""); }
  }

  async function updateServerDraft(change: (saved: Draft) => Promise<Draft>) {
    let saved = await save();
    while (savePromise.current) saved = await save();
    if (latest.current.version !== latest.current.savedVersion) throw new Error(copy.waitSave);
    if (useAuthStore.getState().user?.id !== ownerId) throw new Error(copy.saveFailed);
    const pending = change(saved);
    savePromise.current = pending;
    try {
      const updated = await pending;
      acknowledgeDraft(updated);
      return updated;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        blocked.current = true; setSaveState("conflict"); setSaveError(error.message);
        await loadConflict(latest.current.document, latest.current.text);
      }
      throw error;
    } finally { if (savePromise.current === pending) savePromise.current = null; }
  }

  function dismissTransform() {
    pendingJobRef.current = null;
    setTransformJob(null);
    clearPendingResponseTransform(responseLocalStorage(), ownerId, id);
  }

  function requestTransform(input: TransformRequest = {}) {
    const scope = input.scope ?? effectiveScope;
    if (scope === "document" && latest.current.text.trim()) {
      setRegenerationRequest({ ...input, scope: "document", tool: "replaceDocument" });
    } else transformMutation.mutate(input);
  }

  function regenerateSuggestion() {
    const job = transformJob;
    if (!job) return;
    dismissTransform();
    const input = { instruction: job.instruction, scope: job.target.kind, tool: job.tool,
      ...(job.target.kind === "block" ? { blockId: job.target.blockId } : {}),
      ...(job.selection ? { selection: job.selection } : {}) };
    // React state may still hold the dismissed job, so use the live ref as the overlap guard.
    requestTransform(input);
  }

  function navigateSafely(resume: () => void) {
    if (allowNavigation.current) { resume(); return; }
    if (pendingJobRef.current || !onlineRef.current || blocked.current) {
      setPendingNavigation(() => resume); return;
    }
    if (latest.current.version !== latest.current.savedVersion) {
      void saveRef.current!().then(resume).catch(() => setPendingNavigation(() => resume));
    } else resume();
  }

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const syncMedia = () => setWideWorkspace(media.matches);
    media.addEventListener("change", syncMedia);
    const sync = () => { onlineRef.current = navigator.onLine; setOnline(navigator.onLine); if (navigator.onLine && userEdited.current && !blocked.current) setSaveState("dirty"); };
    const timer = window.setTimeout(() => { syncMedia(); sync(); setPinnedFacts(readPinnedContextFacts(responseLocalStorage(), pinScope)); }, 0);
    window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { window.clearTimeout(timer); media.removeEventListener("change", syncMedia); window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, [pinScope]);

  useLayoutEffect(() => {
    navigationRef.current = navigateSafely;
    const intercept = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a,nav button") : null;
      const anchor = target instanceof HTMLAnchorElement ? target : null;
      if (!shouldInterceptResponseNavigationClick({
        allowNavigation: allowNavigation.current,
        defaultPrevented: event.defaultPrevented,
        button: event.button,
        modifierKey: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
        target: {
          actionable: target instanceof HTMLElement,
          insideWrapper: target instanceof HTMLElement && wrapperRef.current?.contains(target) === true,
          targetBlank: anchor?.target === "_blank",
          sameHref: anchor?.href === window.location.href,
          download: anchor?.hasAttribute("download") === true,
        },
        hasPendingJob: !!pendingJobRef.current,
        hasUnsavedChanges: latest.current.version !== latest.current.savedVersion,
      })) return;
      if (!(target instanceof HTMLElement)) return;
      event.preventDefault(); event.stopPropagation();
      navigateSafely(() => { allowNavigation.current = true; target.click(); allowNavigation.current = false; });
    };
    window.document.addEventListener("click", intercept, true);
    const interceptSection = (event: Event) => {
      if (allowNavigation.current || !pendingJobRef.current && latest.current.version === latest.current.savedVersion) return;
      const resume = (event as CustomEvent<{ resume: () => void }>).detail?.resume;
      if (typeof resume !== "function") return;
      event.preventDefault(); navigateSafely(resume);
    };
    window.document.addEventListener("intly:response-navigation", interceptSection);
    return () => { navigationRef.current = null; window.document.removeEventListener("click", intercept, true); window.document.removeEventListener("intly:response-navigation", interceptSection); };
  });

  useEffect(() => {
    if (!transformJob && latest.current.version === latest.current.savedVersion) return;
    navigationGuard.current = guardDraftHistory(window, resume => navigateSafely(resume));
    return () => { navigationGuard.current?.(); navigationGuard.current = null; };
  }, [transformJob, saveState]);


  async function save(): Promise<Draft> {
    if (useAuthStore.getState().user?.id !== ownerId) throw new Error(copy.saveFailed);
    if (!onlineRef.current) throw new Error(locale === "ru" ? "Нет сети. Изменения сохранятся при подключении." : "Offline. Changes will sync when connected.");
    if (savePromise.current) { await savePromise.current; return save(); }
    if (!hydratedRef.current) throw new Error(copy.waitDraftLoad);
    if (blocked.current) throw new Error(copy.resolveConflict);
    const editorDocument = editorRef.current?.getDocument();
    if (editorDocument && JSON.stringify(editorDocument) !== JSON.stringify(latest.current.document)) {
      latest.current = { ...latest.current, document: editorDocument, text: documentText(editorDocument), version: latest.current.version + 1 };
      userEdited.current = true; retainLocal(editorDocument, latest.current.text);
      setDocument(editorDocument); setText(latest.current.text);
    }
    if (latest.current.version === latest.current.savedVersion || !userEdited.current) return server.current;
    const snapshot = { ...latest.current, recoveryTimestamp: recoveryTimestamp.current };
    const baseRevision = server.current.revision;
    if (mounted.current) setSaveState("saving");
    const pending = api.patch<Draft>(`/responses/${id}`, { revision: baseRevision, documentJson: snapshot.document, markdownCache: documentToMarkdown(snapshot.document) });
    savePromise.current = pending;
    try {
      const saved = await pending;
      server.current = saved;
      latest.current.savedVersion = snapshot.version;
      if (latest.current.version === snapshot.version) clearResponseRecovery(responseLocalStorage(), ownerId, id, snapshot.recoveryTimestamp);
      else retainLocal(latest.current.document, latest.current.text);
      if (latest.current.version === snapshot.version) userEdited.current = false;
      client.setQueryData(["response", id], saved);
      if (mounted.current) { setSaveState(latest.current.version === snapshot.version ? "saved" : "dirty"); setSaveError(""); setConflict(null); }
      return saved;
    } catch (error) {
      const isConflict = error instanceof ApiError && error.status === 409;
      blocked.current = isConflict;
      if (mounted.current) {
        setSaveState(isConflict ? "conflict" : "error");
        setSaveError(isConflict ? copy.conflictTitle : copy.saveFailed);
        if (isConflict) await loadConflict(latest.current.document, latest.current.text);
      }
      throw error;
    } finally { savePromise.current = null; }
  }
  useEffect(() => { saveRef.current = save; });
  useEffect(() => { pendingJobRef.current = transformJob; }, [transformJob]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (hydratedRef.current && userEdited.current && !blocked.current) void saveRef.current!().catch(() => toast.error(copy.lastChangeFailed)); };
  }, [copy.lastChangeFailed]);
  useEffect(() => {
    if (!online || !shouldAutosaveDraft({ hydrated: hydratedRef.current, saveState, userEdited: userEdited.current })) return;
    const timer = setTimeout(() => void saveRef.current!().catch(() => {}), 800);
    return () => clearTimeout(timer);
  }, [document, saveState, online]);
  useEffect(() => {
    const beforeLeave = (event: BeforeUnloadEvent) => { if (latest.current.version !== latest.current.savedVersion || pendingJobRef.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeLeave); return () => window.removeEventListener("beforeunload", beforeLeave);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
    hydratedRef.current = hydrated;
    const current = query.data;
    if (current && hydrated && !recovered.current) {
      recovered.current = true;
      const local = readResponseRecovery(responseLocalStorage(), ownerId, id);
      const job = readPendingResponseTransform(responseLocalStorage(), ownerId, id);
      if (job) {
        const restoredJob = { ...job, localVersion: local && JSON.stringify(local.document) !== JSON.stringify(current.documentJson) ? 1 : 0 };
        pendingJobRef.current = restoredJob; setTransformJob(restoredJob);
      }
      if (local && JSON.stringify(local.document) !== JSON.stringify(current.documentJson)) {
        server.current = current;
        latest.current = { document: local.document, text: local.text, version: 1, savedVersion: 0 };
        recoveryTimestamp.current = local.updatedAt;
        userEdited.current = true;
        setDocument(local.document); setText(local.text); setRecoveryNotice(true);
        if (current.revision !== local.baseRevision) {
          blocked.current = true; setSaveState("conflict");
          setConflict({ localDocument: local.document, localText: local.text, serverDraft: current, serverText: documentText(current.documentJson) });
        } else setSaveState("dirty");
        return;
      }
      if (local) clearResponseRecovery(responseLocalStorage(), ownerId, id, local.updatedAt);
    }
    if (!current || !shouldHydrateFromServer({ hydrated, localVersion: latest.current.version, savedVersion: latest.current.savedVersion, userEdited: userEdited.current })) return;
    const currentText = documentText(current.documentJson);
    server.current = current;
    latest.current = { document: current.documentJson, text: currentText, version: latest.current.version, savedVersion: latest.current.version };
    setDocument(current.documentJson); setText(currentText); setSaveState("saved"); setSaveError(""); setConflict(null);

    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated, query.data, ownerId, id]);

  async function loadConflict(localDocument: JSONContent, localText: string) {
    try {
      const serverDraft = await api.get<Draft>(`/responses/${id}`);
      setConflict({ localDocument, localText, serverDraft, serverText: documentText(serverDraft.documentJson) });
      client.setQueryData(["response", id], serverDraft);
    } catch {
      setConflict(null);
    }
  }

  async function saveMineAfterConflict() {
    if (!conflict) return;
    server.current = conflict.serverDraft;
    latest.current = { ...latest.current, document: conflict.localDocument, text: conflict.localText, version: latest.current.version + 1 };
    setDocument(conflict.localDocument);
    setText(conflict.localText);
    setConflict(null);
    blocked.current = false;
    userEdited.current = true;
    retainLocal(conflict.localDocument, conflict.localText);
    setSaveState("dirty");
    await saveRef.current!().catch(() => {});
  }

  function takeServerVersion() {
    if (!conflict) return;
    const version = latest.current.version + 1;
    server.current = conflict.serverDraft;
    latest.current = { document: conflict.serverDraft.documentJson, text: conflict.serverText, version, savedVersion: version };
    clearResponseRecovery(responseLocalStorage(), ownerId, id);
    dismissTransform();
    setDocument(conflict.serverDraft.documentJson);
    setText(conflict.serverText);
    setConflict(null);
    blocked.current = false;
    userEdited.current = false;
    setRecoveryNotice(false);
    setSaveState("saved");
    setSaveError("");
    client.setQueryData(["response", id], conflict.serverDraft);
  }

  const action = useMutation({ mutationFn: async ({ name, body }: { name: string; body?: Record<string, unknown> }) => {
    if (name === "status") return updateServerDraft(async saved => api.post<Draft>(`/responses/${id}/status`, { ...body, revision: saved.revision }));
    const saved = await save();
    if (latest.current.version !== latest.current.savedVersion) throw new Error(copy.waitSave);
    if (useAuthStore.getState().user?.id !== ownerId) throw new Error(copy.saveFailed);
    return api.post<Draft | AiRun>(`/responses/${id}/${name}`, { ...body, revision: saved.revision, ...(name === "generate" ? { pinnedFacts } : {}) });
  }, onSuccess: (_result, variables) => { client.invalidateQueries({ queryKey: ["response", id] }); client.invalidateQueries({ queryKey: ["responses", opportunity.id] }); if (variables.name === "status") { client.invalidateQueries({ queryKey: ["opportunity", opportunity.id] }); client.invalidateQueries({ queryKey: ["opportunities"] }); client.invalidateQueries({ queryKey: ["pipelines"] }); client.invalidateQueries({ queryKey: ["dashboard"] }); client.invalidateQueries({ queryKey: ["analytics"] }); } setSubmitOpen(false); setConfirmed(false); }, onError: error => toast.error(error.message) });
  const exportMutation = useMutation({ mutationFn: async (format: string) => {
    if (readinessBlocked) throw new Error(readinessIssues[0]?.message ?? copy.readinessFallback);
    const saved = await save();
    if (latest.current.version !== latest.current.savedVersion) throw new Error(copy.waitSave);
    const file = await api.post<{ fileId: string; filename: string }>(`/responses/${id}/export`, { format, revision: saved.revision });
    await downloadStoredFile(file.fileId, file.filename);
  }, onError: error => toast.error(error.message) });
  const editorBlocks = useMemo(() => listResponseEditorBlocks(document), [document]);
  const selectedBlockId = transformBlockId || selectionState.blockId || editorBlocks[0]?.id || "";
  const effectiveScope = transformScope === "auto" ? (selectionState.selection ? "selection" : "block") : transformScope;
  const selectedBlock = editorBlocks.find(block => block.id === selectedBlockId);
  const toolOptions = toolsForScope(effectiveScope, selectedBlock);
  const selectedTool = toolOptions.includes(transformTool) ? transformTool : toolOptions[0];

  const transformMutation = useMutation({ mutationFn: async (input: TransformRequest | void) => {
    if (!onlineRef.current) throw new Error(locale === "ru" ? "AI доступен после подключения к сети" : "AI requires a network connection");
    if (pendingJobRef.current && !["failed", "cancelled"].includes(transformRun.data?.status ?? "queued")) throw new Error(copy.draftChangedAfterAi);
    const prompt = input?.instruction ?? transformInstruction.trim();
    if (!prompt) throw new Error(copy.transformInstructionRequired);
    const scope = input?.scope ?? effectiveScope;
    const tool = input?.tool ?? selectedTool;
    const blockId = input?.blockId ?? (transformScope === "auto" ? editorRef.current?.getCurrentBlockId() ?? selectedBlockId : selectedBlockId);
    const sourceIndex = listResponseEditorBlocks(latest.current.document).findIndex(block => block.id === blockId);
    const selection = input?.selection ?? editorRef.current?.captureSelection() ?? selectionState.selection;
    const saved = await save();
    if (latest.current.version !== latest.current.savedVersion) throw new Error(copy.waitSave);
    const stableBlockId = sourceIndex >= 0 ? listResponseEditorBlocks(saved.documentJson)[sourceIndex]?.id ?? blockId : blockId;
    const resolved = resolveTransformTarget(scope, stableBlockId, selection, copy);
    const request = {
      revision: saved.revision,
      tool,
      target: resolved.target,
      selection: resolved.target.kind === "selection" && resolved.selection ? transformSelectionPayload(resolved.selection) : { target: resolved.target },
      instruction: prompt,
      pinnedFacts,
    };
    const run = await api.post<AiRun>(`/responses/${id}/transform`, request);
    const runId = getRunId(run);
    if (!runId) throw new Error(copy.aiRunNoId);
    return { runId, baseRevision: saved.revision, localVersion: latest.current.version, target: resolved.target, tool, selection: resolved.selection, instruction: prompt };
  }, onSuccess: job => { pendingJobRef.current = job; setTransformJob(job); writePendingResponseTransform(responseLocalStorage(), ownerId, id, job); toast.success(copy.aiTransformStarted); }, onError: error => toast.error(error.message) });
  const transformRun = useQuery({ queryKey: ["ai-run", transformJob?.runId], queryFn: () => api.get<AiRun>(`/ai/runs/${transformJob?.runId}`), enabled: !!transformJob,
    refetchInterval: query => ssePollingFallback && ["queued", "running"].includes(query.state.data?.status ?? "") ? 1500 : false,
  });
  const generationRunId = isBusyGeneration(draft) ? generationOf(draft).runId : undefined;
  const generationRun = useQuery({ queryKey: ["ai-run", generationRunId], queryFn: () => api.get<AiRun>(`/ai/runs/${generationRunId}`), enabled: !!generationRunId,
    refetchInterval: query => ssePollingFallback && ["queued", "running"].includes(query.state.data?.status ?? "") ? 1500 : false,
  });
  const refetchDraft = query.refetch;
  const refetchTransformRun = transformRun.refetch;
  const refetchGenerationRun = generationRun.refetch;
  useEffect(() => {
    const activeRunIds = new Set([generationRunId, transformJob?.runId].filter((value): value is string => !!value));
    if (!activeRunIds.size) return;
    void refetchDraft();
    if (transformJob) void refetchTransformRun();
    if (generationRunId) void refetchGenerationRun();
    const sse = new SseClient({
      onStateChange: state => {
        setSseState(state);
        if (state === "connected" || state === "reconnecting") {
          void refetchDraft();
          if (transformJob) void refetchTransformRun();
          if (generationRunId) void refetchGenerationRun();
        }
      },
      onEvent: (event: SseEvent) => {
        if (event.type !== "ai.run.progress" || !isAiRunProgressPayload(event.payload)) return;
        const progress = event.payload;
        if (progress.responseDraftId !== id || !activeRunIds.has(progress.runId)) return;
        setAiRunProgress(current => ({ ...current, [progress.runId]: progressFromEvent(progress, event.timestamp, Date.now()) }));
        if (progress.runId === transformJob?.runId) {
          client.setQueryData<AiRun | undefined>(["ai-run", progress.runId], current => current ? { ...current, status: progress.status, taskType: progress.taskType, stage: progress.stage } : { id: progress.runId, status: progress.status, taskType: progress.taskType, stage: progress.stage });
          if (isTerminalRunStatus(progress.status)) void refetchTransformRun();
        }
        if (progress.runId === generationRunId && isTerminalRunStatus(progress.status)) {
          void refetchGenerationRun();
          void refetchDraft();
          client.invalidateQueries({ queryKey: ["responses", opportunity.id] });
        }
      }
    });
    sse.connect();
    return () => sse.disconnect();
  }, [client, generationRunId, id, opportunity.id, refetchDraft, refetchGenerationRun, refetchTransformRun, transformJob]);
  const transformProposal = transformRun.data?.status === "completed" && transformJob ? proposalFromRun(transformRun.data, id, transformJob.baseRevision) : null;

  function applyTransform(proposal: TransformProposal) {
    if (!transformJob || !proposal.operations.length) return;
    const operation = proposal.operations[0];
    if (server.current.revision !== transformJob.baseRevision || operation.baseRevision !== transformJob.baseRevision || latest.current.version !== transformJob.localVersion || latest.current.savedVersion !== transformJob.localVersion) {
      toast.error(copy.draftChangedAfterAi);
      return;
    }
    if (operation.target.kind === "selection" && "content" in operation && "text" in operation.content) {
      if (proposal.operations.length !== 1 || !transformJob.selection || operation.target.selectionText.trim() !== transformJob.selection.text.trim()) {
        toast.error(copy.selectionMismatch);
        return;
      }
      const currentText = editorRef.current?.getTextAtRange(transformJob.selection);
      if (currentText?.trim() !== operation.target.selectionText.trim()) {
        toast.error(copy.selectedTextChanged);
        return;
      }
      if (!editorRef.current?.replaceRangeWithText(transformJob.selection, operation.content.text)) {
        toast.error(copy.applySelectionFailed);
        return;
      }
      dismissTransform();
      toast.success(copy.transformApplied);
      return;
    }
    const nextDocument = applyEditorOperations(latest.current.document, proposal.operations, transformJob.target);
    if (!nextDocument) {
      toast.error(copy.invalidOperation);
      return;
    }
    if (editorRef.current?.applyDocument(nextDocument)) { dismissTransform(); toast.success(copy.transformApplied); return; }
    const nextText = documentText(nextDocument);
    userEdited.current = true;
    latest.current = { ...latest.current, document: nextDocument, text: nextText, version: latest.current.version + 1 };
    retainLocal(nextDocument, nextText);
    setDocument(nextDocument);
    setText(nextText);
    if (!blocked.current) setSaveState("dirty");
    dismissTransform();
    toast.success(copy.transformApplied);
  }

  const generationStatus = generationOf(draft).status;
  const generationBusy = isBusyGeneration(draft);
  const generationProgress = generationRunId ? chooseAiRunProgress(aiRunProgress[generationRunId], progressFromRun(generationRun.data, id, generationRun.dataUpdatedAt)) : undefined;
  const transformProgress = transformJob ? chooseAiRunProgress(aiRunProgress[transformJob.runId], progressFromRun(transformRun.data, id, transformRun.dataUpdatedAt)) : undefined;
  const transformStatus = transformJob ? transformProgress?.status ?? transformRun.data?.status ?? "queued" : undefined;
  const transformBusy = transformMutation.isPending || ["queued", "running"].includes(transformStatus ?? "");
  const hasUnresolvedSuggestion = !!transformJob && !["failed", "cancelled"].includes(transformStatus ?? "");
  const checklist = normalizeResponseChecklist(draft.checklist, locale);
  const tenderSections = tenderApplicationSections(opportunity, document, locale);
  const readinessIssues = responseReadinessIssues({ hydrated, text, checklist, unresolvedPlaceholders: draft.unresolvedPlaceholders ?? [], hasUnresolvedSuggestion, generationStatus, tenderSections: tenderSections.sections, tenderSectionsValid: tenderSections.valid }, locale);
  const readinessBlocked = readinessIssues.length > 0;
  const submitWarnings = tenderSubmitWarnings(opportunity, copy);
  const submitReadinessWarnings = opportunity.type === "tender" ? readinessIssues.map(issue => issue.message) : [];
  const isBlocked = saveState === "conflict";
  const finalSubmissionInput = { opportunityType: opportunity.type, online, hydrated, blocked: isBlocked, actionPending: action.isPending, readinessBlocked };

  async function updateChecklist(itemId: string, checked: boolean) {
    const nextChecklist = withChecklistItem(checklist, itemId, checked);
    setChecklistSaving(itemId);
    try {
      await updateServerDraft(saved => api.patch<Draft>(`/responses/${id}`, { revision: saved.revision, checklist: serializeResponseChecklist(nextChecklist) }));
      client.invalidateQueries({ queryKey: ["responses", opportunity.id] });
      toast.success(copy.checklistSaved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.checklistSaveFailed);
    } finally {
      setChecklistSaving(null);
    }
  }
  async function copyResponse() {
    try {
      const html = editorRef.current?.getHtml();
      if (html && typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        try { await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" }) })]); }
        catch { await navigator.clipboard.writeText(text); }
      } else await navigator.clipboard.writeText(text);
      toast.success(copy.copied);
    } catch { toast.error(copy.copyFailed); }
  }

  function registerChecklistInput(itemId: string, node: HTMLInputElement | null) {
    if (node) checklistInputRefs.current.set(itemId, node);
    else checklistInputRefs.current.delete(itemId);
  }

  function activateReadinessIssue(issue: ReadinessIssue) {
    const target = issue.target;
    if (!target) return;
    if (target.kind === "editor") {
      editorRef.current?.focus();
      return;
    }
    if (target.kind === "placeholder") {
      if (!editorRef.current?.focusText(target.value)) editorRef.current?.focus();
      return;
    }
    if (target.kind === "tender-section") {
      openTenderSection(target.sectionType);
      return;
    }
    if (target.kind === "checklist") {
      const checkbox = checklistInputRefs.current.get(target.itemId);
      checkbox?.scrollIntoView({ block: "center" });
      checkbox?.focus();
      return;
    }
    if (target.kind === "suggestion") {
      setAssistantOpen(true);
      setAssistantCollapsed(false);
      requestAnimationFrame(() => {
        transformPreviewRef.current?.scrollIntoView({ block: "center" });
        transformPreviewRef.current?.querySelector<HTMLElement>("button")?.focus();
      });
      return;
    }
    if (target.kind === "generation") {
      staleGenerationRef.current?.scrollIntoView({ block: "center" });
      staleGenerationRef.current?.focus();
    }
  }

  function openTenderSection(type: TenderApplicationSectionType) {
    const current = editorRef.current?.getDocument();
    if (!current || !hydrated || isBlocked) return;
    const result = ensureTenderApplicationSection(current, type);
    if (result.document !== current && !editorRef.current?.applyDocument(result.document)) return;
    requestAnimationFrame(() => editorRef.current?.focusBlock(result.blockId));
  }

  function updatePins(next: PinnedContextFact[]) {
    setPinnedFacts(next); writePinnedContextFacts(responseLocalStorage(), pinScope, next);
  }

  async function insertCommercial(value: ResponseCommercialFieldsValue & { text: string }) {
    if (!onlineRef.current || blocked.current || commercialInsertionRef.current || !value.text.trim()) return;
    commercialInsertionRef.current = true;
    setCommercialInserting(true);
    try {
      const fields = { mode: value.mode, price: value.price, rate: value.rate, hours: value.hours, duration: value.duration };
      const blockId = crypto.randomUUID();
      const appendTerms = (source: JSONContent): JSONContent => ({ ...source, content: [...(source.content ?? []),
        { type: "semanticBlock", attrs: { blockId, semanticType: "price-timeline" }, content: [{ type: "text", text: value.text }] }] });
      await updateServerDraft(async saved => {
        const version = latest.current.version;
        const next = appendTerms(latest.current.document);
        const updated = await api.patch<Draft>(`/responses/${id}`, {
          revision: saved.revision,
          proposedCommercialFields: fields,
          documentJson: next,
          markdownCache: documentToMarkdown(next),
        });
        if (mounted.current && useAuthStore.getState().user?.id === ownerId) {
          // Preserve text edited while the request was in flight; the normal autosave
          // reconciles those newer edits with the already persisted commercial block.
          const local = latest.current.version === version ? updated.documentJson : appendTerms(latest.current.document);
          if (!editorRef.current?.applyDocument(local)) {
            latest.current = { ...latest.current, document: local, text: documentText(local), version: latest.current.version + 1 };
            userEdited.current = true;
            retainLocal(local, latest.current.text);
            setDocument(local);
            setText(latest.current.text);
          }
        }
        return updated;
      });
      client.invalidateQueries({ queryKey: ["responses", opportunity.id] });
      if (assistantOpen) {
        pendingCommercialFocusBlock.current = blockId;
        setAssistantOpen(false);
      } else {
        editorRef.current?.focusBlock(blockId);
      }
    } catch (error) { toast.error(error instanceof ApiError && error.status === 409 ? copy.conflictTitle : copy.saveFailed); }
    finally { commercialInsertionRef.current = false; if (mounted.current) setCommercialInserting(false); }
  }

  const contextRail = <ResponseContextRail ownerId={ownerId} draftId={id} opportunity={opportunity} profileId={profileId} locale={locale} pinnedFacts={pinnedFacts} onPin={fact => updatePins(pinContextFact(pinnedFacts, fact))} onUnpin={fact => updatePins(unpinContextFact(pinnedFacts, fact))} onReference={fact => { setTransformInstruction((locale === "ru" ? "Учти этот факт: " : "Use this fact: ") + fact.text); setAssistantOpen(true); }} />;
  const assistant = <div className="min-w-0 space-y-4">
    <section className="rounded-lg border border-ai/30 bg-ai/5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">{copy.aiAssistant}</h3><p className="mt-1 text-xs text-muted-foreground">{copy.aiAssistantHint}</p></div><Button variant="outline" loading={action.isPending || generationBusy} disabled={!online || !hydrated || generationBusy || isBlocked || hasUnresolvedSuggestion} onClick={() => text.trim() ? requestTransform({ scope: "document", tool: "replaceDocument", instruction: instruction.trim() || (locale === "ru" ? "Подготовь новый полный отклик на основе подтверждённого опыта, требований и закреплённых фактов. Не выдумывай факты." : "Prepare a new complete response using verified experience, requirements and pinned facts. Do not invent facts.") }) : action.mutate({ name: "generate", body: { ...(instruction.trim() ? { customPrompt: instruction.trim() } : {}) } })}><Sparkles className="size-4 text-ai" />{generationBusy ? copy.generating : text.trim() ? (locale === "ru" ? "Перегенерировать целиком" : "Regenerate whole draft") : copy.generate}</Button></div>{generationBusy && <p role="status" className="mt-2 text-xs text-muted-foreground">{generationProgress ? aiProgressLabel(generationProgress, locale) : ssePollingFallback ? copy.sseFallback : copy.generating}</p>}<Textarea className="mt-3" aria-label={copy.generationInstructionAria} value={instruction} onChange={event => setInstruction(event.target.value)} maxLength={4000} placeholder={copy.generationPlaceholder} /></section>
    <section className="rounded-lg border border-ai/30 bg-ai/5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">{copy.aiEdit}</h3><p className="mt-1 text-xs text-muted-foreground">{copy.aiEditHint}</p></div><Button variant="outline" loading={transformBusy} disabled={!online || !hydrated || generationBusy || transformBusy || hasUnresolvedSuggestion || isBlocked || (effectiveScope === "block" && !selectedBlockId)} onClick={() => requestTransform()}><Sparkles className="size-4 text-ai" />{transformBusy ? copy.editing : copy.startEdit}</Button></div><div className="mt-3 grid min-w-0 grid-cols-1 gap-3"><label className="block min-w-0 text-xs font-medium text-muted-foreground">{copy.scope}<select className={selectClass + " mt-1 block w-full min-w-0 max-w-full truncate"} value={transformScope} onChange={event => { const nextScope = event.target.value as EditorTarget["kind"] | "auto"; setTransformScope(nextScope); setTransformTool(toolsForScope(nextScope === "auto" ? effectiveScope : nextScope, selectedBlock)[0]); }}><option value="auto">{locale === "ru" ? "Выделение / текущий блок" : "Selection / current block"}</option><option value="selection">{copy.selection}</option><option value="block">{copy.block}</option><option value="document">{copy.wholeDraft}</option></select></label><label className="block min-w-0 text-xs font-medium text-muted-foreground">{copy.tool}<select className={selectClass + " mt-1 block w-full min-w-0 max-w-full truncate"} value={selectedTool} onChange={event => setTransformTool(event.target.value as EditorTool)}>{toolOptions.map(tool => <option key={tool} value={tool}>{toolLabel(tool, locale)}</option>)}</select></label>{effectiveScope === "block" && <label className="block min-w-0 text-xs font-medium text-muted-foreground">{copy.block}<select className={selectClass + " mt-1 block w-full min-w-0 max-w-full truncate"} value={selectedBlockId} onChange={event => setTransformBlockId(event.target.value)}>{editorBlocks.map(block => <option key={block.id} value={block.id}>{blockLabel(block, copy)}</option>)}</select></label>}</div><ResponseAiPresets locale={locale} disabled={!online || !hydrated || transformBusy || generationBusy || hasUnresolvedSuggestion || isBlocked} onChoose={preset => { setTransformInstruction(preset.instruction); const scope = ["opening", "closing"].includes(preset.id) ? "block" : selectionState.selection ? "selection" : "block"; const blockId = preset.id === "opening" ? editorBlocks[0]?.id : preset.id === "closing" ? editorBlocks.at(-1)?.id : undefined; const hint = preset.toolHint as EditorTool; requestTransform({ instruction: preset.instruction, scope, ...(blockId ? { blockId } : {}), tool: toolsForScope(scope, blockId ? editorBlocks.find(block => block.id === blockId) : selectedBlock).includes(hint) ? hint : scope === "selection" ? "rewriteSelection" : "replaceBlock" }); }} /><Textarea className="mt-3" aria-label={copy.transformInstructionAria} value={transformInstruction} onChange={event => setTransformInstruction(event.target.value)} maxLength={4000} placeholder={copy.transformPlaceholder} />{transformJob && <div ref={transformPreviewRef}><TransformPreview documentJson={document} job={transformJob} progress={transformProgress} run={transformRun.isError ? { status: "failed", taskType: "editor_transform", errorSummary: transformRun.error.message } : transformRun.data} proposal={transformProposal} onApply={applyTransform} onDismiss={dismissTransform} onRegenerate={regenerateSuggestion} locale={locale} copy={copy} /></div>}</section>
    {opportunity.type === "freelance" && <ResponseCommercialFields locale={locale} initial={draftFields(draft.proposedCommercialFields) ?? commercialInitial} loading={commercialInserting} disabled={!online || !hydrated || isBlocked || hasUnresolvedSuggestion || generationBusy || transformBusy || commercialInserting} onInsert={value => void insertCommercial(value)} />}
  </div>;
  return <div ref={wrapperRef} className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" aria-expanded={wideWorkspace ? !contextCollapsed : contextOpen} onClick={() => wideWorkspace ? setContextCollapsed(value => !value) : setContextOpen(true)}><PanelLeft className="size-4" />{locale === "ru" ? "Контекст" : "Context"}</Button>
      <Button size="sm" variant="outline" aria-expanded={wideWorkspace ? !assistantCollapsed : assistantOpen} onClick={() => wideWorkspace ? setAssistantCollapsed(value => !value) : setAssistantOpen(true)}><PanelRight className="size-4" />{copy.aiAssistant}</Button>
      <span className="min-w-0 text-xs text-muted-foreground">{locale === "ru" ? "Факты слева · текст в центре · AI справа" : "Facts on the left · text in the center · AI on the right"}</span>
    </div>
    <div data-response-workspace>
      <div className={["grid min-w-0 items-start gap-4", contextCollapsed ? assistantCollapsed ? "grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_16rem]" : assistantCollapsed ? "xl:grid-cols-[12rem_minmax(0,1fr)]" : "xl:grid-cols-[12rem_minmax(0,1fr)_16rem]"].join(" ")}>
        {!contextCollapsed && <aside aria-label={locale === "ru" ? "Контекст отклика" : "Response context"} className="hidden min-w-0 xl:block">{contextRail}</aside>}
        <div className="min-w-0 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs"><Badge intent={draft.status === "ready" ? "success" : "neutral"}>{responseStatusLabels[locale][draft.status]}</Badge><span role="status" className={["error", "conflict"].includes(saveState) ? "text-destructive" : "text-muted-foreground"}>{!online && saveState !== "saved" ? (locale === "ru" ? "Изменения без сети" : "Offline changes") : saveStateLabels[locale][saveState]}</span></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!text.trim()} onClick={() => void copyResponse()}><Copy className="size-3.5" />{copy.copy}</Button><Button size="sm" variant="outline" loading={saveState === "saving"} disabled={!hydrated || saveState === "saved" || isBlocked} onClick={() => void save().catch(() => {})}><Save className="size-3.5" />{copy.save}</Button></div></div>
          {recoveryNotice && <p role="status" className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">{locale === "ru" ? "Восстановлен несохранённый текст с этого устройства." : "Unsaved text was recovered from this device."}</p>}
          {!online && <p role="status" className="rounded-lg border bg-muted/30 p-3 text-sm">{locale === "ru" ? "Нет сети. Можно редактировать и копировать. Сохранение продолжится при подключении." : "Offline. You can edit and copy. Saving resumes when connected."}</p>}
          {!durableRecovery && <p role="alert" className="rounded-lg border border-warning/40 p-3 text-sm">{locale === "ru" ? "Браузер не сохранил резервную копию. Держите редактор открытым или скопируйте текст до восстановления сети." : "The browser could not store a recovery copy. Keep the editor open or copy the text until the connection returns."}</p>}
          
    {tenderSections.sections.length > 0 && <TenderApplicationSections sections={tenderSections.sections} locale={locale} disabled={!hydrated || isBlocked} onOpen={openTenderSection} />}
    <RichTextEditor ref={editorRef} value={document} locale={locale} sectionPlaceholders={opportunity.type === "tender" ? tenderApplicationSectionLabels(locale) : undefined} disabled={!hydrated} onSelectionChange={setSelectionState} onBlur={() => { if (onlineRef.current && userEdited.current && !blocked.current) void saveRef.current!().catch(() => {}); }} onChange={(value, plainText) => { if (!hydratedRef.current) return; userEdited.current = true; latest.current = { ...latest.current, document: value, text: plainText, version: latest.current.version + 1 }; retainLocal(value, plainText); setDocument(value); setText(plainText); if (!blocked.current) setSaveState("dirty"); }} />
    {saveState === "error" && <div role="alert" className="rounded-lg border border-destructive/40 p-4"><p className="text-sm text-destructive">{saveError}</p><p className="mt-1 text-xs text-muted-foreground">{copy.editorKeepsText}</p><Button className="mt-3" variant="outline" size="sm" onClick={() => { blocked.current = false; setSaveState("dirty"); }}>{copy.retrySave}</Button></div>}
    {saveState === "conflict" && <ConflictPanel conflict={conflict} onSaveMine={() => void saveMineAfterConflict()} onTakeServer={takeServerVersion} copy={copy} />}
    {!hydrated && <p className="rounded-lg border border-muted p-3 text-sm text-muted-foreground">{copy.loadingDraft}</p>}
    {generationStatus === "stale" && <p ref={staleGenerationRef} tabIndex={-1} className="rounded-lg border border-warning/40 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">{copy.staleGeneration}</p>}
    <ReadinessChecklist checklist={checklist} savingItemId={checklistSaving} disabled={!online || !hydrated || isBlocked || !!checklistSaving} onToggle={(itemId, checked) => void updateChecklist(itemId, checked)} onInputRef={registerChecklistInput} copy={copy} />
    {readinessIssues.length > 0 && <ReadinessBlockers issues={readinessIssues} copy={copy} onActivate={activateReadinessIssue} />}
    <div className="flex flex-wrap items-center gap-2 border-t pt-4"><Button loading={action.isPending} disabled={!online || isBlocked || readinessBlocked} onClick={() => action.mutate({ name: "status", body: { status: "ready" } })}><Check className="size-4" />{copy.markReady}</Button><Button variant="outline" disabled={!canOpenFinalSubmission(finalSubmissionInput)} onClick={() => setSubmitOpen(true)}>{opportunity.type === "tender" ? (locale === "ru" ? "Заявка подана" : "Mark as submitted") : copy.sentExternally}</Button>{sourceUrl(opportunity) && <Button size="sm" variant="ghost" asChild><a href={sourceUrl(opportunity)} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3.5" />{locale === "ru" ? "Открыть источник" : "Open source"}</a></Button>}<div className="ml-auto flex flex-wrap gap-1">{["txt", "docx", "pdf"].map(format => <Button key={format} size="sm" variant="ghost" disabled={!online || exportMutation.isPending || isBlocked || readinessBlocked} onClick={() => exportMutation.mutate(format)}><Download className="size-3.5" />{format.toUpperCase()}</Button>)}</div></div>
        </div>
        {!assistantCollapsed && <aside aria-label={copy.aiAssistant} className="hidden min-w-0 xl:block">{assistant}</aside>}
      </div>
    </div>
    {pipelineActions && <section className="rounded-lg border bg-card p-4" aria-label={locale === "ru" ? "Дальнейшие действия" : "Next actions"}>
      <p className="text-sm font-medium">{opportunity.type === "tender" ? locale === "ru" ? "Факт подачи заявки сохранён" : "Application submission recorded" : locale === "ru" ? "Факт отправки отклика сохранён" : "Response sending recorded"}</p>
      {handoffIncomplete && <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-sm text-warning"><p className="min-w-0 flex-1">{locale === "ru" ? "Обновление воронки пока не завершено. Повторите синхронизацию — статус отклика уже сохранён." : "Pipeline update is not complete yet. Retry synchronization; the response status is already saved."}</p><Button size="sm" variant="outline" loading={query.isFetching} disabled={!online} onClick={() => void query.refetch()}>{locale === "ru" ? "Повторить синхронизацию" : "Retry synchronization"}</Button></div>}
      <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" asChild><Link href={pipelineActions.href} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigateSafely(() => { onOpenPipeline?.(); router.push(pipelineActions.href); }); }}><ArrowRight className="size-4" />{locale === "ru" ? "Открыть воронку" : "Open pipeline"}</Link></Button>
        {pipelineActions.suggestion && <Button size="sm" disabled={!online || isBlocked || !hydrated} onClick={() => { if (pipelineActions.suggestion) setPipelineSuggestion({ card: { id, opportunityId: opportunity.id, profileId, title: opportunity.title, counterpart: opportunity.companyOrClient, pipelineStatus: opportunity.personalState?.pipelineStatus ?? "New" }, action: pipelineActions.suggestion }); }}><Plus className="size-4" />{pipelineActions.suggestion.key === "negotiation" ? locale === "ru" ? "Создать задачу переговоров" : "Create negotiation task" : pipelineActions.suggestion.key === "submission_reminder" ? locale === "ru" ? "Напомнить о результате заявки" : "Check application outcome" : locale === "ru" ? "Напомнить об ответе" : "Follow up on response"}</Button>}
      </div>
    </section>}
    <PipelineSuggestionTaskDialog state={pipelineSuggestion} locale={locale} profileId={profileId} onClose={() => setPipelineSuggestion(null)} onCreated={() => { setPipelineSuggestion(null); void client.invalidateQueries({ queryKey: ["pipelines"] }); void client.invalidateQueries({ queryKey: ["tasks"] }); toast.success(locale === "ru" ? "Задача создана" : "Task created"); }} />
    <Modal open={contextOpen} onOpenChange={setContextOpen} placement="drawer" title={locale === "ru" ? "Контекст отклика" : "Response context"}>{contextRail}</Modal>
    <Modal open={assistantOpen} onOpenChange={setAssistantOpen} placement="drawer" title={copy.aiAssistant} onCloseAutoFocus={event => {
      const blockId = pendingCommercialFocusBlock.current;
      if (!blockId) return;
      pendingCommercialFocusBlock.current = null;
      event.preventDefault();
      editorRef.current?.focusBlock(blockId);
    }}>{assistant}</Modal>
    <Modal open={!!regenerationRequest} onOpenChange={open => !open && setRegenerationRequest(null)} title={locale === "ru" ? "Перегенерировать весь черновик?" : "Regenerate the whole draft?"} description={locale === "ru" ? "Текущий текст сохранится. AI предложит новую версию для сравнения; она заменит текст только после вашего принятия." : "Your current text will be kept. AI will propose a version for comparison; it replaces the text only after you accept it."}>
      <div className="flex flex-wrap gap-2"><Button disabled={!online || transformBusy} onClick={() => { const input = regenerationRequest; setRegenerationRequest(null); if (input) transformMutation.mutate(input); }}>{locale === "ru" ? "Подготовить предложение" : "Prepare suggestion"}</Button><Button variant="outline" onClick={() => setRegenerationRequest(null)}>{locale === "ru" ? "Оставить текст" : "Keep current text"}</Button></div>
    </Modal>
    <Modal open={!!pendingNavigation} onOpenChange={open => !open && setPendingNavigation(null)} title={locale === "ru" ? "Продолжить переход?" : "Continue navigation?"} description={durableRecovery ? locale === "ru" ? "Есть несохранённые изменения или AI-предложение. Они останутся на этом устройстве для возвращения к черновику." : "There are unsaved changes or an AI suggestion. They will remain on this device for your return to the draft." : locale === "ru" ? "Браузер не смог сохранить локальную копию. Скопируйте текст перед уходом или продолжите редактирование." : "The browser could not keep a local copy. Copy the text before leaving or keep editing."}>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setPendingNavigation(null)}>{locale === "ru" ? "Продолжить редактирование" : "Keep editing"}</Button><Button onClick={() => { const resume = pendingNavigation; navigationGuard.current?.(); navigationGuard.current = null; allowNavigation.current = true; setPendingNavigation(null); window.setTimeout(() => { resume?.(); allowNavigation.current = false; }, 0); }}>{durableRecovery ? locale === "ru" ? "Перейти с сохранением копии" : "Leave with recovery copy" : locale === "ru" ? "Уйти без локальной копии" : "Leave without a local copy"}</Button></div>
    </Modal>
    <Modal open={submitOpen} onOpenChange={setSubmitOpen} title={opportunity.type === "tender" ? copy.submitTenderTitle : copy.submitTitle} description={opportunity.type === "tender" ? copy.submitTenderDescription : copy.submitDescription}>{submitReadinessWarnings.length ? <div role="alert" className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm"><p className="font-medium">{copy.submitReadinessWarningTitle}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{submitReadinessWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}{submitWarnings.length ? <div role="alert" className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm"><p className="font-medium">{copy.submitTenderWarningTitle}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{submitWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}<label className="mb-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1" />{opportunity.type === "tender" ? copy.submitTenderConfirm : copy.submitConfirm}</label><Button disabled={!canConfirmFinalSubmission({ ...finalSubmissionInput, confirmed })} loading={action.isPending} onClick={() => action.mutate({ name: "status", body: finalSubmissionStatusPayload(opportunity.type) })}>{copy.confirmSent}</Button></Modal>
  </div>;
}

function TenderApplicationSections({ sections, locale, disabled, onOpen }: { sections: TenderApplicationSection[]; locale: OpportunityLocale; disabled: boolean; onOpen: (type: TenderApplicationSectionType) => void }) {
  const filled = sections.filter(section => section.complete).length;
  return <section className="rounded-lg border bg-card p-4" aria-label={locale === "ru" ? "Обязательные разделы заявки" : "Required application sections"}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-medium">{locale === "ru" ? "Разделы заявки" : "Application sections"}</h3><p className="mt-1 text-xs text-muted-foreground">{locale === "ru" ? "Для этого тендера нужны следующие разделы. Добавьте недостающие и заполните их в тексте." : "This tender requires the following sections. Add missing sections and complete them in the text."}</p></div><Badge intent={filled === sections.length ? "success" : "warning"}>{filled} / {sections.length}</Badge></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{sections.map(section => <button key={section.type} type="button" disabled={disabled} onClick={() => onOpen(section.type)} aria-label={`${section.blockId ? locale === "ru" ? "Открыть" : "Open" : locale === "ru" ? "Добавить" : "Add"}: ${section.label}`} className="flex min-w-0 items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 motion-reduce:transition-none">
      {section.complete ? <Check className="size-4 shrink-0 text-success" /> : section.blockId ? <ArrowRight className="size-4 shrink-0 text-warning" /> : <Plus className="size-4 shrink-0 text-primary" />}<span className="min-w-0"><span className="block text-sm font-medium">{section.label}</span><span className="block text-xs text-muted-foreground">{section.complete ? locale === "ru" ? "Заполнен" : "Complete" : section.blockId ? locale === "ru" ? "Нужно заполнить" : "Needs text" : locale === "ru" ? "Добавить раздел" : "Add section"}</span></span>
    </button>)}</div>
  </section>;
}

function nextRecoveryTimestamp(previous: number): number {
  return Math.max(Date.now(), previous + 1);
}

function draftFields(value: Record<string, unknown> | undefined): ResponseCommercialFieldsValue | null {
  if (!value || !Object.keys(value).length) return null;
  return { mode: value.mode === "hourly" ? "hourly" : value.mode === "fixed" ? "fixed" : undefined,
    ...Object.fromEntries(["price", "rate", "hours", "duration"].filter(key => typeof value[key] === "string").map(key => [key, value[key]])) };
}

function tenderSubmitWarnings(opportunity: OpportunityRecord, copy: ResponseCopy): string[] {
  if (opportunity.type !== "tender") return [];
  const requirements = tenderRequirements(opportunity);
  const unknown = requirements.filter((item) => item.status === "Unknown").length;
  const notMet = requirements.filter((item) => item.status === "Not met").length;
  const conflicts = (opportunity.criticalConflicts ?? []).length;
  return [
    requirements.length === 0 ? copy.submitTenderRequirementsMissing : "",
    unknown ? copy.submitTenderUnknown(unknown) : "",
    notMet ? copy.submitTenderNotMet(notMet) : "",
    conflicts ? copy.submitTenderConflicts(conflicts) : "",
  ].filter(Boolean);
}

function generationOf(draft?: Draft): NonNullable<Draft["generation"]> {
  return draft?.generation ?? {};
}

function isBusyGeneration(draft?: Draft): boolean {
  return ["queued", "running"].includes(generationOf(draft).status ?? "");
}

function ConflictPanel({ conflict, onSaveMine, onTakeServer, copy }: { conflict: ConflictState | null; onSaveMine: () => void; onTakeServer: () => void; copy: ResponseCopy }) {
  return <div role="alert" className="rounded-lg border border-destructive/40 p-4">
    <p className="text-sm font-medium text-destructive">{copy.conflictTitle}</p>
    <p className="mt-1 text-xs text-muted-foreground">{copy.conflictHint}</p>
    {conflict ? <div className="mt-3 grid gap-3 md:grid-cols-2">
      <VersionBox title={copy.myUnsavedText} text={conflict.localText} />
      <VersionBox title={`${copy.serverVersion} · rev ${conflict.serverDraft.revision}`} text={conflict.serverText} />
    </div> : <p className="mt-3 text-xs text-muted-foreground">{copy.serverVersionLoadFailed}</p>}
    <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={!conflict} onClick={onSaveMine}>{copy.keepMine}</Button><Button size="sm" variant="outline" disabled={!conflict} onClick={onTakeServer}>{copy.takeServer}</Button></div>
  </div>;
}

function VersionBox({ title, text }: { title: string; text: string }) {
  return <div className="rounded-md border bg-background p-3"><h4 className="text-xs font-medium text-muted-foreground">{title}</h4><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-relaxed">{text || "—"}</pre></div>;
}

function ReadinessChecklist({ checklist, savingItemId, disabled, onToggle, onInputRef, copy }: { checklist: ResponseChecklist; savingItemId: string | null; disabled: boolean; onToggle: (itemId: string, checked: boolean) => void; onInputRef?: (itemId: string, node: HTMLInputElement | null) => void; copy: ResponseCopy }) {
  return <section className="rounded-lg border bg-card p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">{copy.readinessTitle}</h3><p className="mt-1 text-xs text-muted-foreground">{copy.readinessDescription}</p></div><Badge intent={checklist.complete ? "success" : "warning"}>{checklist.complete ? copy.ready : copy.needsReview}</Badge></div>
    <div className="mt-3 grid gap-2">
      {checklist.items.map((item) => <label key={item.id} className="flex items-start gap-3 rounded-md border bg-background p-3 text-sm">
        <input ref={(node) => { onInputRef?.(item.id, node); }} type="checkbox" className="mt-1" disabled={disabled} checked={item.checked} onChange={(event) => onToggle(item.id, event.target.checked)} />
        <span className="min-w-0"><span className="font-medium">{item.label}</span>{savingItemId === item.id && <span className="ml-2 text-xs text-muted-foreground">{copy.saving}</span>}<span className="mt-1 block text-xs text-muted-foreground">{item.description}</span></span>
      </label>)}
    </div>
  </section>;
}

function ReadinessBlockers({ issues, copy, onActivate }: { issues: ReadinessIssue[]; copy: ResponseCopy; onActivate: (issue: ReadinessIssue) => void }) {
  return <div role="status" className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
    <p className="font-medium">{copy.blockersTitle}</p>
    <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{issues.map((issue) => <li key={issue.id}>
      {issue.target ? <button type="button" className="text-left underline decoration-dotted underline-offset-4 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" onClick={() => onActivate(issue)}>{issue.message}</button> : <span>{issue.message}</span>}
    </li>)}</ul>
  </div>;
}

function operationPreviews(documentJson: JSONContent, operations: EditorOperation[], job: TransformJob, locale: OpportunityLocale) {
  let document = documentJson;
  return operations.map(operation => {
    const preview = previewEditorOperation(document, operation, job.selection, locale);
    const next = operation.target.kind !== "selection" ? applyEditorOperations(document, [operation], job.target) : null;
    if (next) document = next;
    return { operation, preview, diff: humanRewriteDiff(preview.before, preview.after) };
  });
}

function TransformPreview({ documentJson, job, progress, run, proposal, onApply, onDismiss, onRegenerate, locale, copy }: { documentJson: JSONContent; job: TransformJob; progress?: AiRunProgress; run?: AiRun; proposal: TransformProposal | null; onApply: (proposal: TransformProposal) => void; onDismiss: () => void; onRegenerate: () => void; locale: OpportunityLocale; copy: ResponseCopy }) {
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const status = progress?.status ?? run?.status ?? "queued";
  const operations = proposal?.operations ?? [];
  const previews = operationPreviews(documentJson, operations, job, locale);
  const valid = job.target.kind === "selection" ? operations.length === 1 && operations[0]?.target.kind === "selection" : !!applyEditorOperations(documentJson, operations, job.target);
  const renderActions = () => <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={status !== "completed" || !valid} onClick={() => proposal && onApply(proposal)}>{locale === "ru" ? "Принять все изменения" : "Accept all changes"}</Button><Button size="sm" variant="outline" onClick={onDismiss}>{locale === "ru" ? "Отклонить" : "Reject"}</Button><Button size="sm" variant="ghost" disabled={["queued", "running"].includes(status)} onClick={onRegenerate}>{locale === "ru" ? "Предложить заново" : "Regenerate suggestion"}</Button></div>;
  const renderPreviews = (wide: boolean) => <div className={wide ? "space-y-4" : "space-y-3"}>{previews.map(({ operation, preview, diff }, index) => <section key={index} className="min-w-0 rounded-md border p-3" aria-label={(locale === "ru" ? "Изменение " : "Change ") + (index + 1)}>
      <p className="text-xs font-medium">{toolLabel(operation.tool, locale)}</p>
      <div className={["mt-2 grid min-w-0 gap-2", wide ? "md:grid-cols-2" : ""].join(" ")}><div className="min-w-0 rounded bg-destructive/5 p-2"><p className="text-xs font-medium text-destructive">− {copy.before}</p><del aria-label={locale === "ru" ? "Удаляемый текст" : "Removed text"} className="mt-1 block break-words whitespace-pre-wrap text-sm">{diff.removed || "—"}</del></div><div className="min-w-0 rounded bg-success/5 p-2"><p className="text-xs font-medium text-success">+ {copy.after}</p><ins aria-label={locale === "ru" ? "Добавляемый текст" : "Added text"} className="mt-1 block break-words whitespace-pre-wrap text-sm no-underline">{diff.added || "—"}</ins></div></div>
      {!diff.changed && <p className="mt-2 text-xs text-warning">{copy.unchanged}</p>}{!preview.valid && <p className="mt-2 text-xs text-destructive">{preview.reason}</p>}{operation.explanation && <p className="mt-2 text-xs text-muted-foreground">{operation.explanation}</p>}
    </section>)}</div>;
  return <>
    <div className="mt-3 rounded-lg border bg-background p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-medium">{copy.previewTitle}</p><p className="text-xs text-muted-foreground">{progress ? aiProgressLabel(progress, locale) : statusLabel(status, locale)} · {toolLabel(job.tool, locale)}</p></div><div className="flex flex-wrap gap-1">{previews.length > 0 && <Button size="sm" variant="ghost" onClick={() => setComparisonOpen(true)}>{locale === "ru" ? "Развернуть сравнение" : "Expand comparison"}</Button>}<Button size="sm" variant="ghost" onClick={onDismiss}>{copy.close}</Button></div></div>
    {previews.length ? <div className="mt-3">{renderPreviews(false)}</div> : <div className="mt-3 grid gap-3"><VersionBox title={copy.before} text={targetWaitingText(job.target, documentJson, copy)} /><VersionBox title={copy.after} text={status === "completed" ? copy.invalidAiResult : status === "failed" ? copy.transformFailed : status === "cancelled" ? statusLabel(status, locale) : progress ? aiProgressLabel(progress, locale) : copy.waiting} /></div>}
    {proposal?.summary && <p className="mt-3 text-sm text-muted-foreground">{proposal.summary}</p>}
    {status === "failed" && <p role="alert" className="mt-3 text-sm text-destructive">{["AI_ROUTE_UNAVAILABLE", "AI_PROVIDER_UNAVAILABLE"].includes(run?.errorCode ?? "") ? copy.providerMissing : copy.transformFailed}</p>}
    {renderActions()}
  </div>
  <Modal open={comparisonOpen} onOpenChange={setComparisonOpen} wide title={copy.previewTitle} description={(progress ? aiProgressLabel(progress, locale) : statusLabel(status, locale)) + " · " + toolLabel(job.tool, locale)}>
    {renderPreviews(true)}
    {proposal?.summary && <p className="mt-3 text-sm text-muted-foreground">{proposal.summary}</p>}
    {renderActions()}
  </Modal>
  </>;
}

function proposalFromRun(run: AiRun, draftId: string, baseRevision: number): TransformProposal {
  const operations = parseEditorTransformOperations(run.structuredOutput, draftId, baseRevision);
  return { operations, operation: operations[0] ?? null, summary: typeof run.structuredOutput?.explanation === "string" ? run.structuredOutput.explanation : undefined };
}

function resolveTransformTarget(scope: EditorTarget["kind"], blockId: string, selection: RichTextSelection | null | undefined, copy: ResponseCopy): { target: EditorTarget; selection?: RichTextSelection } {
  if (scope === "selection") {
    if (!selection) throw new Error(copy.selectTextForEdit);
    return { target: targetFromSelection(selection), selection };
  }
  if (scope === "block") {
    if (!blockId) throw new Error(copy.noBlockForEdit);
    return { target: { kind: "block", blockId } };
  }
  return { target: { kind: "document" } };
}

function toolsForScope(scope: EditorTarget["kind"], block?: ResponseEditorBlock): EditorTool[] {
  if (scope === "selection") return ["rewriteSelection", "changeTone"];
  if (scope === "document") return ["replaceDocument"];
  const tools: EditorTool[] = ["replaceBlock", "regenerateBlock", "shortenBlock", "changeTone", "emphasizeFact", "insertBefore", "insertAfter", "addParagraph", "removeBlock", "updateHeading"];
  return block?.nodeType === "heading" ? tools : tools.filter(tool => tool !== "updateHeading");
}

function toolLabel(tool: EditorTool, locale: OpportunityLocale): string {
  return editorToolLabel(tool, locale);
}

function blockLabel(block: ResponseEditorBlock, copy: ResponseCopy): string {
  const text = block.text || copy.emptyBlock;
  return `${block.index + 1}. ${text.slice(0, 80)}`;
}

function targetWaitingText(target: EditorTarget, documentJson: JSONContent, copy: ResponseCopy): string {
  if (target.kind === "selection") return target.selectionText;
  if (target.kind === "block") return listResponseEditorBlocks(documentJson).find(block => block.id === target.blockId)?.text || `${copy.blockPrefix} ${target.blockId}`;
  return copy.wholeDraft;
}

function getRunId(run: AiRun): string | null {
  return run.id ?? run._id ?? null;
}

function documentText(value: JSONContent): string { if (value.type === "text") return value.text ?? ""; return (value.content ?? []).map(documentText).join(value.type === "doc" ? "\n" : ""); }
