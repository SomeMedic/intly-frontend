"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, HelpCircle, ListChecks, Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/intly/empty-state";
import { ErrorState } from "@/components/intly/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/services/api";
import { enumLabel, taskTypeLabels, workflowApi } from "@/features/workflows";
import { downloadStoredFile } from "@/services/files/download-file";
import type { TaskItem } from "@/types";
import { ResponsePanel } from "./ResponsePanel";
import { TenderDocumentAnalysis } from "./TenderDocumentAnalysis";
import { sourceUrl, type AiRun, type OpportunityRecord } from "./contracts";
import { formatOpportunityFieldDate, moneyLabelForLocale, type OpportunityLocale } from "./opportunity-workspace-labels";
import { applicationChecklist, chooseTenderBoard, documentTypeLabel, eligibilitySummary, formatDate, processingLabel, requirementStatusLabel, stringValue, structuredItems, splitTextList, tenderDocuments, tenderDocumentReady, tenderDocumentFormat, tenderRequirements, type Evidence, type Requirement, type TenderDocument } from "./tender-workspace-state";

export type TenderSection = "overview" | "documents" | "eligibility" | "requirements" | "application" | "risks";

type LinkedTenderDocument = { id: string; title: string; fileId: string; knowledgeDocumentId: string; documentType: string; processingStatus: string; textStatus?: string; textReady: boolean; aiStatus?: string; aiRunId?: string; aiScore?: number | null; summary?: string; lastError?: string; sourceId?: string; sourceUrl?: string; filename?: string; mimeType?: string; size?: number; importedAt?: string };
type TenderDocumentPage = { items: LinkedTenderDocument[]; nextCursor: string | null };
type SourceImportError = { key: string; error: unknown };

type TenderCopy = {
  noData: string;
  overviewTitle: string;
  overviewDescription: string;
  customer: string;
  procurementMethod: string;
  region: string;
  purchaseNumber: string;
  procedureNumber: string;
  lotNumber: string;
  initialPrice: string;
  deadline: string;
  readinessTitle: string;
  readinessDescription: string;
  confirmed: string;
  notMet: string;
  unknown: string;
  documentsTitle: string;
  documentsOverviewDescription: string;
  documentsCount: string;
  financeTitle: string;
  financeDescription: string;
  documentsPanelTitle: string;
  documentsPanelDescription: string;
  analyzeDocuments: string;
  openSource: string;
  uploadFile: string;
  uploading: string;
  chooseProfileUpload: string;
  documentsEmptyTitle: string;
  documentsEmptyDescription: string;
  fileSummary: string;
  urlSummary: string;
  reprocess: string;
  uploadProfileRequired: string;
  uploaded: string;
  analysisProfileRequired: string;
  analysisDocumentRequired: string;
  analysisStarted: string;
  reprocessStarted: string;
  importSource: string;
  importedSource: string;
  importedSourceReady: string;
  importProfileRequired: string;
  importSourceFailedTitle: string;
  retryImport: string;
  allDocumentTypes: string;
  documentTypeFilter: string;
  noMatchingDocuments: string;
  analyzeDocument: string;
  processingRequired: string;
  viewAnalysis: string;
  sourceCopy: string;
  documentsLoading: string;
  eligibilityEmptyTitle: string;
  eligibilityEmptyDescription: string;
  sourcePrefix: string;
  citationPrefix: string;
  noRequirementEvidence: string;
  requirementsTitle: string;
  requirementsDescription: string;
  applicationTitle: string;
  applicationDescription: string;
  createPrepTask: string;
  noBoard: string;
  willCreateTask: (name?: string) => string;
  create: string;
  cancel: string;
  createBoardFirst: string;
  taskTitlePrefix: string;
  taskCreated: string;
  risksTitle: string;
  risksDescription: string;
  riskBadge: string;
  noRisks: string;
  financeLimitsTitle: string;
  financeLimitsDescription: string;
  conflictsFound: string;
  bidSecurity: string;
  contractSecurity: string;
  advance: string;
  restrictions: string;
  financeEmpty: string;
  checklistTitle: string;
  tasksLoading: string;
  tasksEmpty: string;
  taskDone: string;
  due: string;
  noDue: string;
  fileUnavailable: string;
  tenderDocument: string;
  open: string;
  download: string;
  evidenceFound: string;
  evidenceMissing: string;
  aiPrefix: string;
  aiStatus: Record<string, string>;
  conflictFields: Record<string, string>;
  documentRequirement: string;
  documentCitation: string;
};

const tenderCopy: Record<OpportunityLocale, TenderCopy> = {
  ru: {
    noData: "Нет данных",
    overviewTitle: "Тендерная сводка",
    overviewDescription: "Основные условия закупки и сведения, которые уже удалось выделить из карточки и документов.",
    customer: "Заказчик",
    procurementMethod: "Способ закупки",
    region: "Регион",
    purchaseNumber: "Номер закупки",
    procedureNumber: "Номер процедуры",
    lotNumber: "Лот",
    initialPrice: "Начальная цена",
    deadline: "Дедлайн",
    readinessTitle: "Готовность к участию",
    readinessDescription: "Статус показывает, какие требования уже подтверждены, какие не выполнены, а где пока не хватает данных.",
    confirmed: "Подтверждено",
    notMet: "Не выполнено",
    unknown: "Нет данных",
    documentsTitle: "Документы",
    documentsOverviewDescription: "Состав документов из карточки тендера и подключённых файлов.",
    documentsCount: "документов и ссылок доступно",
    financeTitle: "Финансы и обеспечение",
    financeDescription: "Суммы, гарантии и ограничения отображаются как условия закупки; оценка риска доступна в AI-анализе.",
    documentsPanelTitle: "Документы тендера",
    documentsPanelDescription: "Импортируйте файлы с площадки или загрузите свои. После обработки текста можно анализировать отдельный документ или весь готовый набор.",
    analyzeDocuments: "Проанализировать документы",
    openSource: "Открыть источник",
    uploadFile: "Загрузить файл",
    uploading: "Загружаем…",
    chooseProfileUpload: "Выберите профиль для импорта, загрузки и AI-анализа. Исходные документы можно открыть без профиля.",
    documentsEmptyTitle: "Документы не найдены",
    documentsEmptyDescription: "Источник не передал файлы или ссылки. Проверьте официальный источник закупки.",
    fileSummary: "Файл добавлен к подготовке и доступен для скачивания.",
    urlSummary: "Откройте официальный источник, чтобы сверить последнюю версию документа.",
    reprocess: "Обработать снова",
    uploadProfileRequired: "Выберите профиль для загрузки документа",
    uploaded: "Документ загружен и добавлен к тендеру",
    analysisProfileRequired: "Выберите профиль для AI-анализа",
    analysisDocumentRequired: "Дождитесь обработки хотя бы одного документа для анализа",
    analysisStarted: "AI-анализ документов запущен",
    reprocessStarted: "Повторная обработка запущена",
    importSource: "Импортировать",
    importedSource: "Документ импортирован, обрабатываем текст",
    importedSourceReady: "Документ уже импортирован и готов к анализу",
    importProfileRequired: "Выберите профиль для импорта документа",
    importSourceFailedTitle: "Не удалось импортировать файл с площадки",
    retryImport: "Повторить импорт",
    allDocumentTypes: "Все типы документов",
    documentTypeFilter: "Тип документа",
    noMatchingDocuments: "Документов выбранного типа нет",
    analyzeDocument: "Анализировать",
    processingRequired: "AI-анализ станет доступен после обработки текста.",
    viewAnalysis: "Показать AI-анализ",
    sourceCopy: "Копия документа источника",
    documentsLoading: "Загружаем документы профиля…",
    eligibilityEmptyTitle: "Требования пока не выделены",
    eligibilityEmptyDescription: "Проверка остаётся в состоянии «Нет данных», пока в карточке нет выдержек, ссылок на пункты или документов с требованиями.",
    sourcePrefix: "Источник",
    citationPrefix: "Пункт",
    noRequirementEvidence: "Подтверждения пока нет. Статус требования — «Нет данных».",
    requirementsTitle: "Требования закупки",
    requirementsDescription: "Условия участия и подачи заявки. Если подтверждения нет, пункт остаётся в статусе «Нет данных».",
    applicationTitle: "Подготовка заявки",
    applicationDescription: "Соберите чеклист, создайте задачи и подготовьте текст. Отправка заявки выполняется только на внешней площадке.",
    createPrepTask: "Создать задачу подготовки",
    noBoard: "Нет доступной доски задач. Создайте доску на странице Tasks, затем вернитесь к тендеру.",
    willCreateTask: (name) => `Будет создана задача на доске «${name ?? "—"}».`,
    create: "Создать",
    cancel: "Отмена",
    createBoardFirst: "Сначала создайте доску задач для тендеров",
    taskTitlePrefix: "Подготовить заявку",
    taskCreated: "Задача подготовки заявки создана",
    risksTitle: "Риски и вопросы к проверке",
    risksDescription: "Здесь отображаются найденные риски и расхождения. Окончательное решение принимает пользователь после просмотра документов.",
    riskBadge: "Риск",
    noRisks: "Риски пока не выделены. Запустите AI-анализ или проверьте документы закупки.",
    financeLimitsTitle: "Финансы и ограничения",
    financeLimitsDescription: "Условия обеспечения, аванс и ограничения показываются отдельно от оценки рисков.",
    conflictsFound: "Есть расхождения источников",
    bidSecurity: "Обеспечение заявки",
    contractSecurity: "Обеспечение контракта",
    advance: "Аванс",
    restrictions: "Ограничения",
    financeEmpty: "Финансовые условия пока не выделены.",
    checklistTitle: "Черновой чеклист подготовки",
    tasksLoading: "Загружаем задачи подготовки…",
    tasksEmpty: "Связанных задач подготовки пока нет.",
    taskDone: "Завершена",
    due: "Срок",
    noDue: "Без срока",
    fileUnavailable: "Файл недоступен",
    tenderDocument: "tender-document",
    open: "Открыть",
    download: "Скачать",
    evidenceFound: "Есть подтверждение в документах или выдержках.",
    evidenceMissing: "Подтверждение пока не найдено.",
    aiPrefix: "AI",
    aiStatus: { "Not analyzed": "не запускался", Queued: "в очереди", Running: "выполняется", Completed: "готов", Failed: "ошибка", Cancelled: "отменён" },
    conflictFields: { deadline: "Дедлайн", money: "Сумма", sourceStatus: "Статус источника" },
    documentRequirement: "Документ требований",
    documentCitation: "Пункт документа",
  },
  en: {
    noData: "No data",
    overviewTitle: "Tender overview",
    overviewDescription: "Key procurement terms and details already extracted from the card and documents.",
    customer: "Customer",
    procurementMethod: "Procurement method",
    region: "Region",
    purchaseNumber: "Procurement number",
    procedureNumber: "Procedure number",
    lotNumber: "Lot",
    initialPrice: "Initial price",
    deadline: "Deadline",
    readinessTitle: "Participation readiness",
    readinessDescription: "The status shows which requirements are confirmed, which are not met, and where more data is needed.",
    confirmed: "Confirmed",
    notMet: "Not met",
    unknown: "No data",
    documentsTitle: "Documents",
    documentsOverviewDescription: "Documents from the tender card and connected files.",
    documentsCount: "documents and links available",
    financeTitle: "Finances and security",
    financeDescription: "Amounts, guarantees, and restrictions are shown as procurement terms; risk assessment is available in AI analysis.",
    documentsPanelTitle: "Tender documents",
    documentsPanelDescription: "Import source files or upload your own. After text processing, analyze one document or the entire ready bundle.",
    analyzeDocuments: "Analyze documents",
    openSource: "Open source",
    uploadFile: "Upload file",
    uploading: "Uploading…",
    chooseProfileUpload: "Choose a profile to import, upload and analyze documents. Original source files can be opened without a profile.",
    documentsEmptyTitle: "No documents found",
    documentsEmptyDescription: "The source did not provide files or links. Check the official procurement source.",
    fileSummary: "The file was added to preparation and is available for download.",
    urlSummary: "Open the official source to check the latest document version.",
    reprocess: "Process again",
    uploadProfileRequired: "Choose a profile to upload a document",
    uploaded: "Document uploaded and added to the tender",
    analysisProfileRequired: "Choose a profile for AI analysis",
    analysisDocumentRequired: "Wait until at least one document has finished text processing",
    analysisStarted: "AI document analysis started",
    reprocessStarted: "Reprocessing started",
    importSource: "Import",
    importedSource: "Document imported; processing text",
    importedSourceReady: "Document is already imported and ready for analysis",
    importProfileRequired: "Choose a profile to import a document",
    importSourceFailedTitle: "Could not import the source file",
    retryImport: "Retry import",
    allDocumentTypes: "All document types",
    documentTypeFilter: "Document type",
    noMatchingDocuments: "No documents of this type",
    analyzeDocument: "Analyze",
    processingRequired: "AI analysis is available after text processing.",
    viewAnalysis: "View AI analysis",
    sourceCopy: "Copy of source document",
    documentsLoading: "Loading profile documents…",
    eligibilityEmptyTitle: "No requirements extracted yet",
    eligibilityEmptyDescription: "The check stays in “No data” until the card includes excerpts, clause links, or requirement documents.",
    sourcePrefix: "Source",
    citationPrefix: "Clause",
    noRequirementEvidence: "No confirmation yet. Requirement status is “No data”.",
    requirementsTitle: "Procurement requirements",
    requirementsDescription: "Participation and application terms. If no confirmation is available, the item stays in “No data”.",
    applicationTitle: "Application preparation",
    applicationDescription: "Assemble the checklist, create tasks, and prepare the text. The application is submitted only on the external platform.",
    createPrepTask: "Create preparation task",
    noBoard: "No task board is available. Create a board on the Tasks page, then return to the tender.",
    willCreateTask: (name) => `A task will be created on board “${name ?? "—"}”.`,
    create: "Create",
    cancel: "Cancel",
    createBoardFirst: "Create a task board for tenders first",
    taskTitlePrefix: "Prepare application",
    taskCreated: "Application preparation task created",
    risksTitle: "Risks and checks",
    risksDescription: "Detected risks and conflicts are shown here. The user makes the final decision after reviewing documents.",
    riskBadge: "Risk",
    noRisks: "No risks have been extracted yet. Run AI analysis or check the procurement documents.",
    financeLimitsTitle: "Finances and restrictions",
    financeLimitsDescription: "Security terms, advance payment, and restrictions are shown separately from risk assessment.",
    conflictsFound: "Source conflicts found",
    bidSecurity: "Bid security",
    contractSecurity: "Contract security",
    advance: "Advance",
    restrictions: "Restrictions",
    financeEmpty: "Financial terms have not been extracted yet.",
    checklistTitle: "Draft preparation checklist",
    tasksLoading: "Loading preparation tasks…",
    tasksEmpty: "No linked preparation tasks yet.",
    taskDone: "Completed",
    due: "Due",
    noDue: "No due date",
    fileUnavailable: "File is unavailable",
    tenderDocument: "tender-document",
    open: "Open",
    download: "Download",
    evidenceFound: "Confirmed in documents or excerpts.",
    evidenceMissing: "No confirmation found yet.",
    aiPrefix: "AI",
    aiStatus: { "Not analyzed": "not analyzed", Queued: "queued", Running: "running", Completed: "ready", Failed: "failed", Cancelled: "cancelled" },
    conflictFields: { deadline: "Deadline", money: "Amount", sourceStatus: "Source status" },
    documentRequirement: "Requirement document",
    documentCitation: "Document clause",
  }
};

const tenderDocumentsApi = {
  list: (opportunityId: string, profileId: string) => api.get<TenderDocumentPage>(`/opportunities/${opportunityId}/tender-documents?profileId=${encodeURIComponent(profileId)}`),
  upload: (opportunityId: string, profileId: string, file: File, documentType = "other") => {
    const form = new FormData();
    form.set("file", file);
    form.set("profileId", profileId);
    form.set("title", file.name);
    form.set("documentType", documentType);
    form.set("filename", file.name);
    form.set("mimeType", mimeForFile(file));
    return api.upload<LinkedTenderDocument>(`/opportunities/${opportunityId}/tender-documents/multipart`, form);
  },
  analyze: (opportunityId: string, profileId: string, tenderDocumentIds?: string[]) => api.post<AiRun>(`/opportunities/${opportunityId}/tender-documents/analyze`, { profileId, ...(tenderDocumentIds?.length ? { tenderDocumentIds } : {}) }),
  reprocess: (opportunityId: string, id: string) => api.post<{ success: true }>(`/opportunities/${opportunityId}/tender-documents/${id}/reprocess`, {}),
  importSource: (opportunityId: string, profileId: string, document: TenderDocument) => api.post<LinkedTenderDocument>(`/opportunities/${opportunityId}/tender-documents/import-source`, { profileId, sourceId: document.sourceId, url: document.url, documentType: normalizedDocumentType(document.documentType) }),
};

export function TenderWorkspace({ opportunity, profileId, section, locale = "ru", onOpenPipeline }: { onOpenPipeline?: () => void; opportunity: OpportunityRecord; profileId?: string; section: TenderSection; locale?: OpportunityLocale }) {
  const copy = tenderCopy[locale];
  if (opportunity.type !== "tender") return null;
  if (section === "overview") return <TenderOverview opportunity={opportunity} locale={locale} copy={copy} />;
  if (section === "documents") return <TenderDocuments key={`${opportunity.id}:${profileId ?? "none"}`} opportunity={opportunity} profileId={profileId} locale={locale} copy={copy} />;
  if (section === "eligibility") return <TenderEligibility opportunity={opportunity} locale={locale} copy={copy} />;
  if (section === "requirements") return <TenderRequirements opportunity={opportunity} locale={locale} copy={copy} />;
  if (section === "application") return <TenderApplication opportunity={opportunity} profileId={profileId} locale={locale} copy={copy} onOpenPipeline={onOpenPipeline} />;
  return <TenderRisks opportunity={opportunity} locale={locale} copy={copy} />;
}

function TenderOverview({ opportunity, locale, copy }: { opportunity: OpportunityRecord; locale: OpportunityLocale; copy: TenderCopy }) {
  const data = opportunity.tenderData ?? {};
  const documents = tenderDocuments(opportunity);
  const requirements = tenderRequirements(opportunity);
  const eligibility = eligibilitySummary(requirements);
  const procedureNumber = stringValue(data.procedureNumber);
  const purchaseNumber = procedureNumber || stringValue(data.contractNumber) || stringValue(data.purchaseNumber);
  const lotNumber = stringValue(data.lotNumber);
  return <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
    <div className="space-y-4">
      <Panel title={copy.overviewTitle} description={copy.overviewDescription}>
        <div className="grid gap-3 md:grid-cols-2">
          <Info label={copy.customer} value={stringValue(data.customer) || opportunity.companyOrClient || copy.noData} />
          <Info label={copy.procurementMethod} value={stringValue(data.procurementMethod) || copy.noData} />
          <Info label={copy.region} value={stringValue(data.region) || opportunity.location || copy.noData} />
          <Info label={procedureNumber ? copy.procedureNumber : copy.purchaseNumber} value={purchaseNumber || copy.noData} />
          {lotNumber ? <Info label={copy.lotNumber} value={lotNumber} /> : null}
          <Info label={copy.initialPrice} value={moneyLabelForLocale(opportunity.money, locale)} />
          <Info label={copy.deadline} value={(opportunity.deadline ? formatOpportunityFieldDate(opportunity, "deadline", locale) : formatDate(stringValue(data.submissionDeadline), locale)) || copy.noData} />
        </div>
      </Panel>
      <Panel title={copy.readinessTitle} description={copy.readinessDescription}>
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label={copy.confirmed} value={eligibility.met} intent="success" />
          <Metric label={copy.notMet} value={eligibility.notMet} intent="danger" />
          <Metric label={copy.unknown} value={eligibility.unknown} intent="warning" />
        </div>
      </Panel>
    </div>
    <aside className="space-y-4">
      <Panel title={copy.documentsTitle} description={copy.documentsOverviewDescription}><p className="text-2xl font-semibold">{documents.length}</p><p className="mt-1 text-sm text-muted-foreground">{copy.documentsCount}</p></Panel>
      <Panel title={copy.financeTitle} description={copy.financeDescription}><FinanceList opportunity={opportunity} locale={locale} copy={copy} /></Panel>
    </aside>
  </section>;
}

function TenderDocuments({ opportunity, profileId, locale, copy }: { opportunity: OpportunityRecord; profileId?: string; locale: OpportunityLocale; copy: TenderCopy }) {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [analysisDocumentId, setAnalysisDocumentId] = useState<string>();
  const [sourceImportErrors, setSourceImportErrors] = useState<Record<string, SourceImportError>>({});
  const sourceDocuments = tenderDocuments(opportunity);
  const linked = useQuery({ queryKey: ["tender-documents", opportunity.id, profileId], queryFn: () => tenderDocumentsApi.list(opportunity.id, profileId!), enabled: !!profileId, refetchInterval: (query) => query.state.data?.items.some((document) => !["Indexed", "Failed"].includes(document.processingStatus) || ["Queued", "Running"].includes(document.aiStatus ?? "")) ? 2000 : false });
  const linkedDocuments = (linked.data?.items ?? []).map((document): TenderDocument => ({
    kind: "file",
    sourceId: document.sourceId || "private",
    label: document.title,
    fileId: document.fileId,
    documentType: document.documentType,
    processingStatus: document.processingStatus,
    textStatus: document.textStatus,
    textReady: document.textReady,
    aiStatus: document.aiStatus,
    aiRunId: document.aiRunId,
    knowledgeDocumentId: document.knowledgeDocumentId,
    tenderDocumentId: document.id,
    summary: document.summary,
    lastError: document.lastError,
    sourceUrl: document.sourceUrl,
    filename: document.filename,
    mimeType: document.mimeType,
    size: document.size,
    importedAt: document.importedAt,
  }));
  const documents = [...linkedDocuments, ...sourceDocuments.filter((document) => !linkedDocuments.some((linkedDocument) => (document.url && linkedDocument.sourceUrl === document.url) || (document.fileId && linkedDocument.fileId === document.fileId)))];
  const visibleDocuments = documents.filter((document) => typeFilter === "all" || normalizedDocumentType(document.documentType) === typeFilter);
  const types = [...new Set(documents.map((document) => normalizedDocumentType(document.documentType)))];
  const readyDocuments = linkedDocuments.filter(tenderDocumentReady);
  const invalidateDocuments = () => queryClient.invalidateQueries({ queryKey: ["tender-documents", opportunity.id] });
  const upload = useMutation({ mutationFn: async (file: File) => {
    if (!profileId) throw new Error(copy.uploadProfileRequired);
    return tenderDocumentsApi.upload(opportunity.id, profileId, file, "other");
  }, onSuccess: () => { invalidateDocuments(); toast.success(copy.uploaded); }, onError: error => toast.error(error.message) });
  const sourceImport = useMutation({ mutationFn: (document: TenderDocument) => {
    if (!profileId) throw new Error(copy.importProfileRequired);
    return tenderDocumentsApi.importSource(opportunity.id, profileId, document);
  }, onMutate: (document) => {
    const key = sourceImportKey(opportunity.id, profileId, document);
    setSourceImportErrors((errors) => {
      const next = { ...errors };
      delete next[key];
      return next;
    });
  }, onSuccess: (document, variables) => {
    const key = sourceImportKey(opportunity.id, profileId, variables);
    setSourceImportErrors((errors) => {
      const next = { ...errors };
      delete next[key];
      return next;
    });
    invalidateDocuments();
    toast.success(document.processingStatus === "Indexed" && document.textReady ? copy.importedSourceReady : copy.importedSource);
  }, onError: (error, document) => {
    const key = sourceImportKey(opportunity.id, profileId, document);
    const message = sourceImportErrorMessage(error, locale);
    setSourceImportErrors((errors) => ({ ...errors, [key]: { key, error } }));
    toast.error(message);
  } });
  const analysis = useMutation({ mutationFn: (selectedId?: string) => {
    if (!profileId) throw new Error(copy.analysisProfileRequired);
    const ids = readyDocuments.filter((document) => !selectedId || document.tenderDocumentId === selectedId).map((document) => document.tenderDocumentId!);
    if (!ids.length) throw new Error(copy.analysisDocumentRequired);
    return tenderDocumentsApi.analyze(opportunity.id, profileId, ids);
  }, onSuccess: () => { invalidateDocuments(); toast.success(copy.analysisStarted); }, onError: error => toast.error(error.message) });
  const reprocess = useMutation({ mutationFn: (id: string) => tenderDocumentsApi.reprocess(opportunity.id, id), onSuccess: () => { invalidateDocuments(); toast.success(copy.reprocessStarted); }, onError: error => toast.error(error.message) });

  return <section className="space-y-4">
    <Panel title={copy.documentsPanelTitle} description={copy.documentsPanelDescription}>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" loading={analysis.isPending} disabled={!profileId || analysis.isPending || !readyDocuments.length || linkedDocuments.some((document) => ["Queued", "Running"].includes(document.aiStatus ?? ""))} onClick={() => analysis.mutate(undefined)}><Sparkles className="size-4 text-ai" />{copy.analyzeDocuments}{readyDocuments.length ? ` (${readyDocuments.length})` : ""}</Button>
        {sourceUrl(opportunity) ? <Button variant="outline" asChild><a href={sourceUrl(opportunity)} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />{copy.openSource}</a></Button> : null}
        <label className="inline-flex h-[var(--control-height)] cursor-pointer items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-60" aria-disabled={!profileId || upload.isPending}>
          <Upload className="size-4" />{upload.isPending ? copy.uploading : copy.uploadFile}
          <input className="sr-only" disabled={!profileId || upload.isPending} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.md,.json,.png,.jpg,.jpeg,.webp" onChange={(event) => selectUploadFile(event, upload.mutate)} />
        </label>
      </div>
      {!profileId ? <p className="mt-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-muted-foreground">{copy.chooseProfileUpload}</p> : null}
      {linked.isError ? <div className="mt-3"><ErrorState message={linked.error.message} onRetry={() => linked.refetch()} /></div> : null}
      {profileId && linked.isPending ? <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin" />{copy.documentsLoading}</p> : null}
      {documents.length ? <label className="mt-4 grid max-w-xs gap-1 text-xs text-muted-foreground">{copy.documentTypeFilter}<select className="h-[var(--control-height)] rounded-md border bg-background px-3 text-sm text-foreground" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">{copy.allDocumentTypes}</option>{types.map((type) => <option key={type} value={type}>{documentTypeLabel(type, locale)}</option>)}</select></label> : null}
    </Panel>
    {analysisDocumentId ? <TenderDocumentAnalysis opportunityId={opportunity.id} documentId={analysisDocumentId} documents={linkedDocuments} locale={locale} onClose={() => setAnalysisDocumentId(undefined)} /> : null}
    {!documents.length ? profileId && (linked.isPending || linked.isError) ? null : <EmptyState title={copy.documentsEmptyTitle} description={copy.documentsEmptyDescription} actionLabel={sourceUrl(opportunity) ? copy.openSource : undefined} onAction={sourceUrl(opportunity) ? () => window.open(sourceUrl(opportunity), "_blank", "noopener,noreferrer") : undefined} /> : !visibleDocuments.length ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">{copy.noMatchingDocuments}</p> : <div className="divide-y rounded-lg border bg-card">
      {visibleDocuments.map((document, index) => {
        const importError = sourceImportErrors[sourceImportKey(opportunity.id, profileId, document)];
        return <article key={`${document.kind}-${document.sourceId}-${document.url ?? document.fileId ?? index}`} className="p-4">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><FileText className="size-4 shrink-0 text-primary" /><h3 className="min-w-0 break-words font-medium">{document.label || documentTypeLabel(document.documentType, locale)}</h3><Badge>{documentTypeLabel(document.documentType, locale)}</Badge><Badge intent={document.processingStatus === "Failed" || document.processingStatus === "failed" ? "danger" : document.processingStatus === "Indexed" || document.processingStatus === "indexed" ? "success" : "neutral"}>{processingLabel(document.processingStatus, locale)}</Badge>{document.aiStatus ? <Badge intent={document.aiStatus === "Completed" ? "success" : document.aiStatus === "Failed" ? "danger" : document.aiStatus === "Queued" || document.aiStatus === "Running" ? "ai" : "neutral"}>{copy.aiPrefix}: {aiStatusLabel(document.aiStatus, copy)}</Badge> : null}</div><p className="mt-2 text-xs text-muted-foreground">{document.sourceUrl ? `${copy.sourceCopy} · ${document.sourceId}` : copy.sourcePrefix + ": " + document.sourceId}{tenderDocumentFormat(document) ? ` · ${tenderDocumentFormat(document)}` : ""}{typeof document.size === "number" ? ` · ${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(document.size / 1024)} KB` : ""}{document.importedAt ? ` · ${formatDate(document.importedAt, locale)}` : ""}</p>{document.summary ? <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{document.summary}</p> : document.tenderDocumentId && !tenderDocumentReady(document) ? <p className="mt-2 text-sm text-muted-foreground">{copy.processingRequired}</p> : null}{document.lastError ? <p className="mt-2 break-words text-sm text-destructive">{document.lastError}</p> : null}{importError ? <SourceImportErrorAlert document={document} error={importError} copy={copy} locale={locale} retrying={sourceImport.isPending && sourceImport.variables?.url === document.url} onRetry={() => sourceImport.mutate(document)} /> : null}</div>
          <div className="flex flex-wrap gap-2"><DocumentAction document={document} copy={copy} />{document.sourceUrl ? <Button variant="outline" asChild><a href={document.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />{copy.openSource}</a></Button> : null}{document.kind === "url" && document.url && opportunity.sourceOccurrences.some((source) => source.sourceId === document.sourceId) ? <Button variant="outline" disabled={!profileId || sourceImport.isPending} loading={sourceImport.isPending && sourceImport.variables?.url === document.url} onClick={() => sourceImport.mutate(document)}>{copy.importSource}</Button> : null}{document.tenderDocumentId ? <><Button variant="outline" disabled={!tenderDocumentReady(document) || analysis.isPending || ["Queued", "Running"].includes(document.aiStatus ?? "")} loading={analysis.isPending && analysis.variables === document.tenderDocumentId} onClick={() => analysis.mutate(document.tenderDocumentId)}><Sparkles className="size-4 text-ai" />{copy.analyzeDocument}</Button>{document.aiRunId ? <Button variant="outline" onClick={() => setAnalysisDocumentId(document.tenderDocumentId)}>{copy.viewAnalysis}</Button> : null}<Button variant="outline" disabled={reprocess.isPending || !["Indexed", "Failed"].includes(document.processingStatus)} loading={reprocess.isPending && reprocess.variables === document.tenderDocumentId} onClick={() => reprocess.mutate(document.tenderDocumentId!)}>{copy.reprocess}</Button></> : null}</div>
        </div>
      </article>;
      })}
    </div>}
  </section>;
}

function TenderEligibility({ opportunity, locale, copy }: { opportunity: OpportunityRecord; locale: OpportunityLocale; copy: TenderCopy }) {
  const documents = tenderDocuments(opportunity);
  const requirements = tenderRequirements(opportunity);
  if (!requirements.length) return <EmptyState title={copy.eligibilityEmptyTitle} description={copy.eligibilityEmptyDescription} />;
  return <section className="space-y-3">
    {requirements.map((requirement) => <article key={requirement.id} className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><EligibilityIcon status={requirement.status} /><h3 className="min-w-0 break-words font-medium">{requirement.title}</h3></div>{friendlySource(requirement.source, documents) ? <p className="mt-1 text-xs text-muted-foreground">{copy.sourcePrefix}: {friendlySource(requirement.source, documents)}</p> : null}</div><EligibilityBadge status={requirement.status} locale={locale} /></div>
      {requirement.evidence.length ? <div className="mt-3 grid gap-2">{requirement.evidence.map((item, index) => <div key={`${item.label}-${index}`} className="rounded-md border bg-background p-3 text-sm"><p className="font-medium">{evidenceTitle(item, documents, copy)}</p>{item.excerpt ? <p className="mt-1 text-muted-foreground">{item.excerpt}</p> : null}{item.citation ? <p className="mt-1 text-xs text-muted-foreground">{copy.citationPrefix}: {item.citation}</p> : null}</div>)}</div> : <p className="mt-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-muted-foreground">{copy.noRequirementEvidence}</p>}
    </article>)}
  </section>;
}

function TenderRequirements({ opportunity, locale, copy }: { opportunity: OpportunityRecord; locale: OpportunityLocale; copy: TenderCopy }) {
  const requirements = tenderRequirements(opportunity);
  const fallback = splitTextList(opportunity.description).slice(0, 12);
  return <section className="space-y-4">
    <Panel title={copy.requirementsTitle} description={copy.requirementsDescription}>
      <div className="space-y-2">{requirements.length ? requirements.map((item) => <RequirementRow key={item.id} requirement={item} locale={locale} copy={copy} />) : fallback.map((item, index) => <div key={index} className="rounded-md border bg-background p-3 text-sm"><Badge intent="warning">{copy.unknown}</Badge><p className="mt-2">{item}</p></div>)}</div>
    </Panel>
  </section>;
}

function TenderApplication({ opportunity, profileId, locale, copy, onOpenPipeline }: { onOpenPipeline?: () => void; opportunity: OpportunityRecord; profileId?: string; locale: OpportunityLocale; copy: TenderCopy }) {
  const queryClient = useQueryClient();
  const boards = useQuery({ queryKey: ["tasks", "boards"], queryFn: workflowApi.tasks.boards });
  const tasks = useQuery({ queryKey: ["tasks", "opportunity", opportunity.id], queryFn: () => workflowApi.tasks.list({ opportunityId: opportunity.id }) });
  const [creating, setCreating] = useState(false);
  const applicationTasks = tasks.data?.items ?? [];
  const board = chooseTenderBoard(boards.data ?? []);
  const checklist = applicationChecklist(opportunity, locale);
  const createTask = useMutation({ mutationFn: () => {
    if (!board) throw new Error(copy.createBoardFirst);
    return workflowApi.tasks.create({ boardId: board.id, statusColumnId: board.columns[0]?.id ?? "todo", title: `${copy.taskTitlePrefix}: ${opportunity.title}`.slice(0, 240), type: "Tender Step", opportunityId: opportunity.id, ...(profileId ? { profileId } : {}), priority: "high", checklist, labels: ["tender", "application"] });
  }, onSuccess: () => { setCreating(false); queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success(copy.taskCreated); }, onError: error => toast.error(error.message) });

  return <section className="space-y-4">
    <Panel title={copy.applicationTitle} description={copy.applicationDescription}>
      {boards.isError ? <ErrorState message={boards.error.message} onRetry={() => boards.refetch()} /> : tasks.isError ? <ErrorState message={tasks.error.message} onRetry={() => tasks.refetch()} /> : <div className="space-y-3">
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!board || createTask.isPending} loading={createTask.isPending} onClick={() => setCreating(true)}><ListChecks className="size-4" />{copy.createPrepTask}</Button>{sourceUrl(opportunity) ? <Button variant="outline" asChild><a href={sourceUrl(opportunity)} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />{copy.openSource}</a></Button> : null}</div>
        {!board ? <p className="rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-muted-foreground">{copy.noBoard}</p> : null}
        {creating ? <div className="rounded-md border bg-background p-3 text-sm"><p className="font-medium">{copy.willCreateTask(board?.name)}</p><ul className="mt-2 list-disc pl-5 text-muted-foreground">{checklist.map((item) => <li key={item.text}>{item.text}</li>)}</ul><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => createTask.mutate()} loading={createTask.isPending}>{copy.create}</Button><Button size="sm" variant="outline" onClick={() => setCreating(false)}>{copy.cancel}</Button></div></div> : null}
        <ChecklistPreview items={checklist} copy={copy} />
        <TaskList tasks={applicationTasks} loading={tasks.isLoading} locale={locale} copy={copy} />
      </div>}
    </Panel>
    <ResponsePanel opportunity={opportunity} profileId={profileId} locale={locale} onOpenPipeline={onOpenPipeline} />
  </section>;
}

function TenderRisks({ opportunity, locale, copy }: { opportunity: OpportunityRecord; locale: OpportunityLocale; copy: TenderCopy }) {
  const data = opportunity.tenderData ?? {};
  const risks = structuredItems(data.risks ?? data.riskFactors ?? data.stopFactors);
  const conflicts = opportunity.criticalConflicts ?? [];
  return <section className="grid gap-4 lg:grid-cols-2">
    <Panel title={copy.risksTitle} description={copy.risksDescription}>
      {risks.length ? <div className="space-y-2">{risks.map((risk, index) => <div key={`${risk.title}-${index}`} className="rounded-md border bg-background p-3 text-sm"><Badge intent="warning">{copy.riskBadge}</Badge><p className="mt-2 font-medium">{risk.title}</p>{risk.description ? <p className="mt-1 text-muted-foreground">{risk.description}</p> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">{copy.noRisks}</p>}
    </Panel>
    <Panel title={copy.financeLimitsTitle} description={copy.financeLimitsDescription}>
      <FinanceList opportunity={opportunity} locale={locale} copy={copy} />
      {conflicts.length ? <div className="mt-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm"><p className="font-medium">{copy.conflictsFound}</p><ul className="mt-2 list-disc pl-5 text-muted-foreground">{conflicts.map((conflict) => <li key={conflict.field}>{humanConflictField(conflict.field, copy)}</li>)}</ul></div> : null}
    </Panel>
  </section>;
}

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="rounded-lg border bg-card p-4"><div className="mb-3 min-w-0"><h2 className="font-semibold">{title}</h2>{description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}</div>{children}</section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-md border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{value}</p></div>;
}

function Metric({ label, value, intent }: { label: string; value: number; intent: "success" | "danger" | "warning" }) {
  return <div className="rounded-md border bg-background p-3"><Badge intent={intent}>{label}</Badge><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function TenderPanelList({ items }: { items: string[] }) {
  return <ul className="space-y-2 text-sm">{items.map((item) => <li key={item} className="rounded-md border bg-background p-3">{item}</li>)}</ul>;
}

function FinanceList({ opportunity, locale, copy }: { opportunity: OpportunityRecord; locale: OpportunityLocale; copy: TenderCopy }) {
  const data = opportunity.tenderData ?? {};
  const items = [
    [copy.initialPrice, moneyLabelForLocale(opportunity.money, locale)],
    [copy.bidSecurity, stringValue(data.bidSecurity ?? data.applicationSecurity ?? data.guarantee)],
    [copy.contractSecurity, stringValue(data.contractSecurity ?? data.performanceSecurity)],
    [copy.advance, stringValue(data.advancePayment ?? data.prepayment)],
    [copy.restrictions, stringValue(data.restrictions ?? data.complianceRestrictions)],
  ].filter(([, value]) => Boolean(value));
  return items.length ? <TenderPanelList items={items.map(([label, value]) => `${label}: ${value}`)} /> : <p className="text-sm text-muted-foreground">{copy.financeEmpty}</p>;
}

function ChecklistPreview({ items, copy }: { items: ReturnType<typeof applicationChecklist>; copy: TenderCopy }) {
  return <div className="rounded-md border bg-background p-3 text-sm"><p className="font-medium">{copy.checklistTitle}</p><ul className="mt-2 space-y-1">{items.map((item) => <li key={item.text} className="flex gap-2"><span aria-hidden>{item.completed ? "✓" : "□"}</span><span>{item.text}</span></li>)}</ul></div>;
}

function TaskList({ tasks, loading, locale, copy }: { tasks: TaskItem[]; loading: boolean; locale: OpportunityLocale; copy: TenderCopy }) {
  if (loading) return <p className="text-sm text-muted-foreground">{copy.tasksLoading}</p>;
  if (!tasks.length) return <p className="text-sm text-muted-foreground">{copy.tasksEmpty}</p>;
  return <div className="space-y-2">{tasks.map((task) => <div key={task.id} className="rounded-md border bg-background p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{task.title}</p><Badge>{enumLabel(taskTypeLabels, task.type)}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{task.completedAt ? copy.taskDone : task.dueAt ? `${copy.due}: ${formatDate(task.dueAt, locale)}` : copy.noDue}</p></div>)}</div>;
}

function DocumentAction({ document, copy }: { document: TenderDocument; copy: TenderCopy }) {
  const download = useMutation({ mutationFn: async () => {
    if (!document.fileId) throw new Error(copy.fileUnavailable);
    await downloadStoredFile(document.fileId, document.filename || document.label || copy.tenderDocument);
  }, onError: error => toast.error(error.message) });
  if (document.kind === "url" && document.url) return <Button variant="outline" asChild><a href={document.url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />{copy.open}</a></Button>;
  if (document.kind === "file" && document.fileId) return <Button variant="outline" loading={download.isPending} onClick={() => download.mutate()}><FileText className="size-4" />{copy.download}</Button>;
  return null;
}

function SourceImportErrorAlert({ document, error, copy, locale, retrying, onRetry }: { document: TenderDocument; error: SourceImportError; copy: TenderCopy; locale: OpportunityLocale; retrying: boolean; onRetry: () => void }) {
  return <div role="alert" className="mt-3 rounded-md border border-destructive/35 bg-destructive/5 p-3 text-sm">
    <div className="flex flex-wrap items-start gap-2">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-destructive">{copy.importSourceFailedTitle}</p>
        <p className="mt-1 break-words text-muted-foreground">{sourceImportErrorMessage(error.error, locale)}</p>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      <Button size="sm" variant="outline" loading={retrying} onClick={onRetry}>{copy.retryImport}</Button>
      {document.url ? <Button size="sm" variant="outline" asChild><a href={document.url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />{copy.openSource}</a></Button> : null}
    </div>
  </div>;
}

function EligibilityIcon({ status }: { status: Requirement["status"] }) {
  if (status === "Met") return <CheckCircle2 className="size-4 shrink-0 text-success" />;
  if (status === "Not met") return <AlertTriangle className="size-4 shrink-0 text-destructive" />;
  return <HelpCircle className="size-4 shrink-0 text-warning" />;
}

function EligibilityBadge({ status, locale }: { status: Requirement["status"]; locale: OpportunityLocale }) {
  const intent = status === "Met" ? "success" : status === "Not met" ? "danger" : "warning";
  return <Badge intent={intent}>{requirementStatusLabel(status, locale)}</Badge>;
}

function RequirementRow({ requirement, locale, copy }: { requirement: Requirement; locale: OpportunityLocale; copy: TenderCopy }) {
  return <div className="rounded-md border bg-background p-3 text-sm"><div className="flex flex-wrap items-center gap-2"><EligibilityBadge status={requirement.status} locale={locale} /><span className="font-medium">{requirement.title}</span></div>{requirement.evidence.length ? <p className="mt-2 text-xs text-muted-foreground">{copy.evidenceFound}</p> : <p className="mt-2 text-xs text-muted-foreground">{copy.evidenceMissing}</p>}</div>;
}

function aiStatusLabel(status: string, copy: TenderCopy) {
  return copy.aiStatus[status] ?? status;
}

function selectUploadFile(event: ChangeEvent<HTMLInputElement>, upload: (file: File) => void) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (file) upload(file);
}

function mimeForFile(file: File) {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".doc")) return "application/msword";
  if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (name.endsWith(".xls")) return "application/vnd.ms-excel";
  if (name.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (name.endsWith(".json")) return "application/json";
  if (name.endsWith(".csv")) return "text/csv";
  if (name.endsWith(".md")) return "text/markdown";
  if (name.endsWith(".txt")) return "text/plain";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function sourceImportKey(opportunityId: string, profileId: string | undefined, document: Pick<TenderDocument, "sourceId" | "url" | "fileId">) {
  return [opportunityId, profileId ?? "none", document.sourceId, document.url ?? document.fileId ?? "none"].join("::");
}

function sourceImportErrorMessage(error: unknown, locale: OpportunityLocale) {
  const code = apiErrorCode(error);
  const status = error instanceof ApiError ? error.status : undefined;
  const message = error instanceof Error ? error.message : "";
  const lower = message.toLowerCase();
  const messages = locale === "en" ? {
    tls: "The source file could not be downloaded because the procurement site certificate could not be verified. Open the source and download the file manually, then upload it here.",
    timeout: "The procurement site did not respond in time. Retry import later or open the source file manually.",
    unavailable: "The procurement site is temporarily unavailable. Retry import later or open the source file manually.",
    denied: "The procurement site refused access to this file. Open the source and download it manually if your account has access.",
    missing: "The procurement site no longer returns this file. Open the source to check whether the document was replaced.",
    rateLimited: "The procurement site is rate limiting file downloads. Retry import later.",
    generic: "The source file is not available for automatic import right now. Open the source file or retry later.",
  } : {
    tls: "Файл не удалось скачать автоматически: сертификат площадки не прошёл проверку. Откройте источник, скачайте файл вручную и загрузите его сюда.",
    timeout: "Площадка не ответила вовремя. Повторите импорт позже или откройте файл в источнике.",
    unavailable: "Площадка временно недоступна. Повторите импорт позже или откройте файл вручную.",
    denied: "Площадка отказала в доступе к файлу. Откройте источник и скачайте документ вручную, если у аккаунта есть доступ.",
    missing: "Площадка больше не отдаёт этот файл. Откройте источник и проверьте, не заменили ли документ.",
    rateLimited: "Площадка ограничила скачивание файлов. Повторите импорт позже.",
    generic: "Файл источника сейчас недоступен для автоматического импорта. Откройте его в источнике или повторите попытку позже.",
  };
  if (code === "SOURCE_DOCUMENT_TLS_ERROR" || lower.includes("certificate") || lower.includes("self signed") || lower.includes("tls")) return messages.tls;
  if (code === "SOURCE_DOCUMENT_TIMEOUT" || lower.includes("timeout") || lower.includes("timed out")) return messages.timeout;
  if (code === "SOURCE_DOCUMENT_ACCESS_DENIED" || status === 401 || status === 403) return messages.denied;
  if (code === "SOURCE_DOCUMENT_NOT_FOUND" || status === 404) return messages.missing;
  if (code === "SOURCE_DOCUMENT_RATE_LIMITED" || status === 429) return messages.rateLimited;
  if (code === "SOURCE_DOCUMENT_UNAVAILABLE" || status === 502 || status === 503 || status === 504) return messages.unavailable;
  return messages.generic;
}

function apiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  if (error.code) return error.code;
  const details = error.details;
  if (details && typeof details === "object" && "code" in details) {
    const code = (details as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function normalizedDocumentType(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  const aliases: Record<string, string> = { contract_draft: "draft_contract", pricing: "pricing_estimate", estimate: "pricing_estimate", schedule: "schedule_milestones", security: "security_guarantee", guarantee: "security_guarantee", clarifications: "clarifications_amendments", amendments: "clarifications_amendments", announcement: "notice", unknown: "other" };
  const type = aliases[normalized] ?? normalized;
  return ["notice", "technical_specification", "draft_contract", "participant_requirements", "application_form", "pricing_estimate", "evaluation_criteria", "schedule_milestones", "security_guarantee", "clarifications_amendments", "appendix", "other"].includes(type) ? type : "other";
}

function evidenceTitle(item: Evidence, documents: TenderDocument[], copy: TenderCopy) {
  if (item.excerpt) return item.label;
  if (item.citation) return copy.documentCitation;
  if (item.documentId) return friendlySource(item.documentId, documents) || copy.documentRequirement;
  return item.label;
}

function friendlySource(value: string | undefined, documents: TenderDocument[]) {
  if (!value) return "";
  const document = documents.find((item) => item.fileId === value || item.label === value || item.sourceId === value);
  if (document?.label) return document.label;
  return looksLikeIdentifier(value) ? "" : value;
}

function looksLikeIdentifier(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f-]{10,}$/i.test(value) || /^[0-9a-f]{24}$/i.test(value) || value.length > 48;
}

function humanConflictField(field: string, copy: TenderCopy) {
  return copy.conflictFields[field] ?? field.replace(/([A-Z])/g, " $1").toLowerCase();
}
