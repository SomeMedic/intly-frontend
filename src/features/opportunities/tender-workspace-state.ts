import type { OpportunityRecord, SourceDocumentLink } from "./contracts";
import type { OpportunityLocale } from "./opportunity-workspace-labels";
import type { TaskBoard } from "../../types";

export type Evidence = { label: string; excerpt?: string; documentId?: string; citation?: string };
export type Requirement = { id: string; title: string; status: "Met" | "Not met" | "Unknown"; evidence: Evidence[]; source?: string };
export type TenderDocument = SourceDocumentLink & { documentType: string; processingStatus: string; textStatus?: string; textReady?: boolean; aiStatus?: string; aiRunId?: string; knowledgeDocumentId?: string; tenderDocumentId?: string; summary?: string; lastError?: string; sourceUrl?: string; filename?: string; mimeType?: string; size?: number; importedAt?: string };

export function tenderDocuments(opportunity: Pick<OpportunityRecord, "sourceDocuments" | "tenderData"> & Partial<Pick<OpportunityRecord, "sourceOccurrences">>): TenderDocument[] {
  const typed = Array.isArray(opportunity.tenderData?.documents) ? opportunity.tenderData.documents : [];
  const landingUrls = new Set((opportunity.sourceOccurrences ?? []).map((occurrence) => occurrence.url));
  const sourceDocuments = (opportunity.sourceDocuments ?? []).filter((document) => !document.url || !landingUrls.has(document.url)).map((document) => ({ ...document, documentType: documentType(document.label), processingStatus: document.kind === "url" ? "Source" : "uploaded" }));
  const tenderDocs = typed.flatMap((value, index): TenderDocument[] => {
    if (!isRecord(value)) return [];
    const label = stringValue(value.label ?? value.name ?? value.title) || `Документ ${index + 1}`;
    const url = stringValue(value.url);
    const fileId = stringValue(value.fileId);
    if (!url && !fileId) return [];
    if (url && landingUrls.has(url)) return [];
    const source = sourceDocuments.find((document) => (url && document.url === url) || (fileId && document.fileId === fileId));
    return [{ kind: fileId ? "file" : "url", sourceId: source?.sourceId || stringValue(value.sourceId) || "tender", label, url, fileId, documentType: stringValue(value.type) || documentType(label), processingStatus: stringValue(value.processingStatus) || stringValue(value.status) || (url ? "Source" : "uploaded") }];
  });
  const seen = new Set<string>();
  return [...tenderDocs, ...sourceDocuments].filter((document) => {
    const key = document.fileId ? `file:${document.fileId}` : `url:${document.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function tenderDocumentReady(document: Pick<TenderDocument, "tenderDocumentId" | "processingStatus" | "textReady">) {
  return Boolean(document.tenderDocumentId && document.processingStatus.toLowerCase() === "indexed" && document.textReady === true);
}

export function tenderDocumentFormat(document: Pick<TenderDocument, "filename" | "label" | "mimeType">): string | undefined {
  const formats: Record<string, string> = {
    "application/pdf": "PDF", "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.ms-excel": "XLS", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "text/plain": "TXT", "text/csv": "CSV", "text/markdown": "MD", "application/json": "JSON",
    "image/png": "PNG", "image/jpeg": "JPEG", "image/webp": "WebP",
  };
  return formats[document.mimeType ?? ""] || (document.filename || document.label || "").match(/\.(pdf|docx?|xlsx?|csv|txt|md|json|png|jpe?g|webp)$/i)?.[1].toUpperCase();
}

export function tenderRequirements(opportunity: Pick<OpportunityRecord, "tenderData">): Requirement[] {
  const data = opportunity.tenderData ?? {};
  const explicitEvidence = eligibilityEvidence(data.eligibilityEvidence);
  const rawRequirements = arrayFrom(data.requirements ?? data.requirementItems ?? data.eligibilityRequirements ?? data.checklist);
  if (rawRequirements.length) return rawRequirements.map((item, index) => requirementFromValue(item, index, explicitEvidence));
  if (explicitEvidence.length) return [{ id: "eligibility-evidence", title: stringValue(data.eligibility ?? data.eligibilityStatus ?? data.requirementsStatus) || "Соответствие требованиям", status: statusFromValue(data.eligibility ?? data.eligibilityStatus), evidence: explicitEvidence, source: undefined }];
  return [];
}

function requirementFromValue(value: unknown, index: number, fallbackEvidence: Evidence[]): Requirement {
  if (!isRecord(value)) return { id: `req-${index}`, title: String(value), status: "Unknown", evidence: [] };
  const evidence = eligibilityEvidence(value.evidence ?? value.eligibilityEvidence);
  return {
    id: stringValue(value.id) || `req-${index}`,
    title: stringValue(value.title ?? value.name ?? value.text ?? value.requirement) || `Требование ${index + 1}`,
    status: evidence.length ? statusFromValue(value.status ?? value.eligibility ?? value.result) : "Unknown",
    evidence: evidence.length ? evidence : fallbackEvidence.filter((item) => item.documentId && stringValue(value.documentId) === item.documentId),
    source: stringValue(value.source ?? value.documentId),
  };
}

function eligibilityEvidence(value: unknown): Evidence[] {
  if (!isRecord(value)) return [];
  const excerpts = stringsFrom(value.excerpts);
  const docs = stringsFrom(value.requirementDocumentIds ?? value.documentIds ?? value.sourceDocumentIds);
  const citations = Array.isArray(value.citations) ? value.citations.flatMap((item) => stringValue(item) ? [stringValue(item)!] : isRecord(item) ? [stringValue(item.label ?? item.documentId ?? item.excerpt)].filter((row): row is string => Boolean(row)) : []) : stringsFrom(value.citations);
  return [
    ...excerpts.map((excerpt, index) => ({ label: `Выдержка ${index + 1}`, excerpt })),
    ...docs.map((documentId) => ({ label: "Документ требований", documentId })),
    ...citations.map((citation) => ({ label: "Цитата", citation })),
  ];
}

export function eligibilitySummary(requirements: Requirement[]) {
  return requirements.reduce((acc, item) => ({ ...acc, [item.status === "Met" ? "met" : item.status === "Not met" ? "notMet" : "unknown"]: acc[item.status === "Met" ? "met" : item.status === "Not met" ? "notMet" : "unknown"] + 1 }), { met: 0, notMet: 0, unknown: requirements.length ? 0 : 1 });
}

export function applicationChecklist(opportunity: OpportunityRecord, locale: OpportunityLocale = "ru") {
  const documents = tenderDocuments(opportunity);
  const requirements = tenderRequirements(opportunity);
  const labels = locale === "en"
    ? ["Check the current tender document set", "Confirm eligibility requirements", "Prepare the application text and commercial sections", "Check bid security and the submission deadline"]
    : ["Проверить актуальный состав документов закупки", "Подтвердить соответствие требованиям", "Подготовить текст заявки и коммерческие разделы", "Проверить обеспечение заявки и дедлайн подачи"];
  return [
    { text: labels[0], completed: documents.length > 0 },
    { text: labels[1], completed: requirements.length > 0 && requirements.every((item) => item.status !== "Unknown") },
    { text: labels[2], completed: false },
    { text: labels[3], completed: Boolean(opportunity.deadline) },
  ];
}

export function chooseTenderBoard(boards: TaskBoard[]) {
  return boards.find((board) => board.scope?.toLowerCase().includes("tender")) ?? boards[0] ?? null;
}

export function structuredItems(value: unknown): Array<{ title: string; description?: string }> {
  return arrayFrom(value).flatMap((item, index) => {
    if (typeof item === "string") return [{ title: item }];
    if (!isRecord(item)) return [];
    const title = stringValue(item.title ?? item.name ?? item.text ?? item.risk) || `Пункт ${index + 1}`;
    return [{ title, description: stringValue(item.description ?? item.details ?? item.evidence) }];
  });
}

export function splitTextList(value: unknown) {
  return stringValue(value)?.split(/\n|•|- /).map((item) => item.trim()).filter((item) => item.length > 20) ?? [];
}

function arrayFrom(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return value.split(/\n|;/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function statusFromValue(value: unknown): Requirement["status"] {
  const text = normalizeStatusAlias(stringValue(value));
  if (!text) return "Unknown";
  if (unknownStatusAliases.has(text)) return "Unknown";
  if (negativeStatusAliases.has(text)) return "Not met";
  if (positiveStatusAliases.has(text)) return "Met";
  return "Unknown";
}

const unknownStatusAliases = new Set([
  "unknown",
  "unclear",
  "not checked",
  "not verified",
  "no data",
  "no information",
  "n a",
  "na",
  "неизвестно",
  "не известно",
  "не проверено",
  "данные не проверены",
  "нет данных",
  "нет информации",
]);

const negativeStatusAliases = new Set([
  "not met",
  "not satisfied",
  "not compliant",
  "non compliant",
  "does not meet",
  "does not comply",
  "no",
  "false",
  "fail",
  "failed",
  "failure",
  "не соответствует",
  "не выполнено",
  "не подходит",
  "нет",
  "ложь",
  "отрицательно",
]);

const positiveStatusAliases = new Set([
  "met",
  "satisfied",
  "compliant",
  "yes",
  "true",
  "ok",
  "pass",
  "passed",
  "соответствует",
  "выполнено",
  "подходит",
  "да",
  "истина",
  "подтверждено",
]);

function normalizeStatusAlias(value?: string): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[._-]+/g, " ")
    .replace(/[,:;!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function documentType(label?: string) {
  const text = normalizeDocumentLabel(label);
  if (!text) return "other";
  if (/\b(тз|tz)\b/.test(text) || text.includes("тех задание") || text.includes("техническое задание") || text.includes("technical specification") || text.includes("terms of reference")) return "technical_specification";
  if (text.includes("локально смет") || text.includes("локальный смет") || text.includes("смет") || text.includes("обоснование начальной") || text.includes("начальной максимальной цены") || text.includes("нмц") || text.includes("price justification") || text.includes("price calculation") || text.includes("pricing estimate")) return "pricing_estimate";
  if (text.includes("проект государственного контракта") || text.includes("проект контракта") || text.includes("проект договора") || text.includes("draft contract") || text.includes("contract draft") || text.includes("договор") || text.includes("контракт")) return "draft_contract";
  if (text.includes("требован") || text.includes("participant requirement") || text.includes("supplier requirement") || text.includes("qualification requirement")) return "participant_requirements";
  if (text.includes("порядок рассмотрения") || text.includes("порядок оценки") || text.includes("критери") || text.includes("evaluation criteria") || text.includes("scoring")) return "evaluation_criteria";
  if (text.includes("форма кп") || text.includes("коммерческое предложение") || text.includes("форма заявки") || text.includes("заявка на определение") || text.includes("application form") || text.includes("bid form")) return "application_form";
  if (text.includes("извещение") || text.includes("notice") || text.includes("announcement")) return "notice";
  if (text.includes("график") || text.includes("schedule") || text.includes("milestone")) return "schedule_milestones";
  if (text.includes("обеспечение") || text.includes("гарант") || text.includes("security") || text.includes("guarantee")) return "security_guarantee";
  if (text.includes("разъяснен") || text.includes("изменен") || text.includes("clarification") || text.includes("amendment")) return "clarifications_amendments";
  if (text.includes("приложение") || text.includes("appendix") || text.includes("annex")) return "appendix";
  return "other";
}

function normalizeDocumentLabel(label?: string) {
  return (label ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[_./()[\]{}:;,"'«»]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function processingLabel(status: string, locale: OpportunityLocale = "ru") {
  const labels = {
    ru: { Source: "На площадке", uploaded: "Загружен", Uploading: "Загружен", parsing: "Обрабатывается", Parsing: "Читаем текст", Chunking: "Разбиваем текст", Embedding: "Индексируем", Indexing: "Индексируем", indexed: "Готов", Indexed: "Готов", analyzed: "Проанализирован", processing: "Обрабатывается", failed: "Ошибка", Failed: "Ошибка" },
    en: { Source: "Source", uploaded: "Uploaded", Uploading: "Uploaded", parsing: "Processing", Parsing: "Reading text", Chunking: "Splitting text", Embedding: "Indexing", Indexing: "Indexing", indexed: "Ready", Indexed: "Ready", analyzed: "Analyzed", processing: "Processing", failed: "Failed", Failed: "Failed" }
  } satisfies Record<OpportunityLocale, Record<string, string>>;
  const byLocale: Record<string, string> = labels[locale];
  return byLocale[status] ?? status;
}

export function requirementStatusLabel(status: Requirement["status"], locale: OpportunityLocale = "ru") {
  const labels = locale === "en" ? { Met: "Confirmed", "Not met": "Not met", Unknown: "No data" } : { Met: "Подтверждено", "Not met": "Не выполнено", Unknown: "Нет данных" };
  return labels[status];
}

export function documentTypeLabel(type: string, locale: OpportunityLocale = "ru") {
  const labels = {
    ru: {
      "notice": "Извещение", "announcement": "Извещение", "technical specification": "Техническое задание", "technical_specification": "Техническое задание", "contract draft": "Проект договора", "draft_contract": "Проект договора", "draft contract": "Проект договора", "participant requirements": "Требования к участнику", "participant_requirements": "Требования к участнику", "application form": "Форма заявки", "application_form": "Форма заявки", "pricing": "Расчёт цены", "pricing_estimate": "Расчёт цены", "estimate": "Смета", "evaluation criteria": "Критерии оценки", "evaluation_criteria": "Критерии оценки", "schedule": "График работ", "schedule_milestones": "График работ", "security": "Обеспечение", "security_guarantee": "Обеспечение", "guarantee": "Гарантии", "clarifications": "Разъяснения", "clarifications_amendments": "Разъяснения", "amendments": "Изменения", "appendix": "Приложение", "other": "Документ", "unknown": "Документ"
    },
    en: {
      "notice": "Notice", "announcement": "Notice", "technical specification": "Technical specification", "technical_specification": "Technical specification", "contract draft": "Contract draft", "draft_contract": "Contract draft", "draft contract": "Contract draft", "participant requirements": "Participant requirements", "participant_requirements": "Participant requirements", "application form": "Application form", "application_form": "Application form", "pricing": "Price calculation", "pricing_estimate": "Price calculation", "estimate": "Estimate", "evaluation criteria": "Evaluation criteria", "evaluation_criteria": "Evaluation criteria", "schedule": "Work schedule", "schedule_milestones": "Work schedule", "security": "Security", "security_guarantee": "Security", "guarantee": "Guarantees", "clarifications": "Clarifications", "clarifications_amendments": "Clarifications", "amendments": "Amendments", "appendix": "Appendix", "other": "Document", "unknown": "Document"
    }
  } satisfies Record<OpportunityLocale, Record<string, string>>;
  const byLocale: Record<string, string> = labels[locale];
  return byLocale[type.toLowerCase()] ?? type;
}

export function formatDate(value?: string | null, locale: OpportunityLocale = "ru") {
  return value ? new Date(value).toLocaleString(locale === "ru" ? "ru-RU" : "en-US") : undefined;
}

export function stringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function stringsFrom(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return stringValue(value) ? [stringValue(value)!] : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
