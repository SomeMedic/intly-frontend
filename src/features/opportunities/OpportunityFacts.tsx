"use client";

import { ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { PublicSource } from "@/features/profiles";
import { downloadStoredFile } from "@/services/files/download-file";
import type { CriticalConflict, OpportunityRecord, SourceDocumentLink } from "./contracts";
import { factValueLabel, formatOpportunityFieldDate, moneyLabelForLocale, opportunityTypeLabels, sourceStatusLabels, type OpportunityLocale } from "./opportunity-workspace-labels";

type FactsCopy = {
  title: string;
  description: string;
  hasConflicts: string;
  noConflicts: string;
  labels: Record<string, string>;
  vacancy: Record<string, string>;
  freelance: Record<string, string>;
  tender: Record<string, string>;
  eligibilityMissing: string;
  requirementDocuments: string;
  requirementLinks: string;
  requirementQuotes: string;
  conflictsTitle: string;
  cardValue: string;
  primarySource: string;
  source: string;
  open: string;
  sourceLinks: string;
  noSafeLinks: string;
  sourceLinksDescription: string;
  tenderSourceLinksDescription: string;
  adminAnnotations: string;
  unknown: string;
  yes: string;
  no: string;
  filled: string;
  downloadFailed: string;
  sourceFile: string;
};

const factsCopy: Record<OpportunityLocale, FactsCopy> = {
  ru: {
    title: "Факты возможности",
    description: "Поля из карточки и безопасные сведения от источников.",
    hasConflicts: "Есть расхождения",
    noConflicts: "Расхождений нет",
    labels: {
      type: "Тип",
      company: "Компания или заказчик",
      money: "Сумма",
      deadline: "Дедлайн",
      status: "Статус",
      published: "Опубликовано",
      location: "Локация",
      remoteType: "Формат работы",
      employmentType: "Занятость",
      seniority: "Уровень",
      eligibility: "Соответствие требованиям",
      deadlineField: "Дедлайн",
      moneyField: "Сумма",
      sourceStatusField: "Статус",
    },
    vacancy: { salary: "Зарплата", schedule: "График", experience: "Опыт", grade: "Уровень", team: "Команда", companySize: "Размер компании", education: "Образование", qualification: "Квалификация", category: "Категория", typicalPosition: "Типовая должность", workPlaces: "Рабочие места" },
    freelance: { budget: "Бюджет", duration: "Срок", durationText: "Срок выполнения", experienceText: "Требуемый опыт", clientTimezone: "Часовой пояс заказчика", engagementText: "Формат проекта", category: "Категория", clientRating: "Рейтинг заказчика", proposalsCount: "Откликов", paymentVerified: "Оплата проверена" },
    tender: { procurementMethod: "Способ закупки", customer: "Заказчик", region: "Регион", submissionDeadline: "Срок подачи", contractNumber: "Номер закупки", procedureNumber: "Номер процедуры", lotNumber: "Лот", platform: "Площадка" },
    eligibilityMissing: "Нет подтверждения из документов требований",
    requirementDocuments: "Документы требований",
    requirementLinks: "Ссылки на требования",
    requirementQuotes: "Цитаты требований",
    conflictsTitle: "Расхождения между источниками",
    cardValue: "В карточке",
    primarySource: "Основной источник",
    source: "Источник",
    open: "открыть",
    sourceLinks: "Ссылки источников",
    noSafeLinks: "Безопасных ссылок нет.",
    sourceLinksDescription: "Эти ссылки помогают открыть первоисточник и уточнить сведения из карточки.",
    tenderSourceLinksDescription: "Эти ссылки помогают открыть первоисточник. Они не считаются подтверждением соответствия требованиям тендера без отдельных цитат или документов требований.",
    adminAnnotations: "Закреплённые правки администратора",
    unknown: "Нет данных",
    yes: "Да",
    no: "Нет",
    filled: "Данные заполнены",
    downloadFailed: "Не удалось скачать файл",
    sourceFile: "source-file",
  },
  en: {
    title: "Opportunity facts",
    description: "Card fields and safe details collected from sources.",
    hasConflicts: "Conflicts found",
    noConflicts: "No conflicts",
    labels: {
      type: "Type",
      company: "Company or client",
      money: "Amount",
      deadline: "Deadline",
      status: "Status",
      published: "Published",
      location: "Location",
      remoteType: "Work format",
      employmentType: "Employment",
      seniority: "Level",
      eligibility: "Eligibility",
      deadlineField: "Deadline",
      moneyField: "Amount",
      sourceStatusField: "Status",
    },
    vacancy: { salary: "Salary", schedule: "Schedule", experience: "Experience", grade: "Level", team: "Team", companySize: "Company size", education: "Education", qualification: "Qualification", category: "Category", typicalPosition: "Typical position", workPlaces: "Work places" },
    freelance: { budget: "Budget", duration: "Duration", durationText: "Delivery time", experienceText: "Required experience", clientTimezone: "Client time zone", engagementText: "Project format", category: "Category", clientRating: "Client rating", proposalsCount: "Proposals", paymentVerified: "Payment verified" },
    tender: { procurementMethod: "Procurement method", customer: "Customer", region: "Region", submissionDeadline: "Submission deadline", contractNumber: "Procurement number", procedureNumber: "Procedure number", lotNumber: "Lot", platform: "Platform" },
    eligibilityMissing: "No confirmation from requirement documents",
    requirementDocuments: "Requirement documents",
    requirementLinks: "Requirement links",
    requirementQuotes: "Requirement quotes",
    conflictsTitle: "Conflicts between sources",
    cardValue: "Card value",
    primarySource: "Primary source",
    source: "Source",
    open: "open",
    sourceLinks: "Source links",
    noSafeLinks: "No safe links found.",
    sourceLinksDescription: "These links open the original source so you can check the details in this card.",
    tenderSourceLinksDescription: "These links open the original source. They are not treated as proof of tender eligibility without separate quotes or requirement documents.",
    adminAnnotations: "Pinned administrator corrections",
    unknown: "No data",
    yes: "Yes",
    no: "No",
    filled: "Data is filled in",
    downloadFailed: "Could not download the file",
    sourceFile: "source-file",
  }
};

export function OpportunityFacts({ opportunity, sources = [], locale = "ru" }: { opportunity: OpportunityRecord; sources?: PublicSource[]; locale?: OpportunityLocale }) {
  const copy = factsCopy[locale];
  const typeFacts = factsForType(opportunity, locale, copy);
  const conflicts = opportunity.criticalConflicts ?? [];
  return <section className="space-y-4">
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{copy.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <Badge intent={conflicts.length ? "warning" : "success"}>{conflicts.length ? copy.hasConflicts : copy.noConflicts}</Badge>
      </div>
      <dl className="mt-4 grid gap-3 md:grid-cols-2">
        <Fact label={copy.labels.type} value={opportunityTypeLabels[locale][opportunity.type]} copy={copy} />
        <Fact label={copy.labels.company} value={opportunity.companyOrClient} copy={copy} />
        <Fact label={copy.labels.money} value={moneyLabelForLocale(opportunity.money, locale)} copy={copy} />
        <Fact label={copy.labels.deadline} value={formatOpportunityFieldDate(opportunity, "deadline", locale)} copy={copy} />
        <Fact label={copy.labels.status} value={sourceStatusLabels[locale][opportunity.sourceStatus]} copy={copy} />
        <Fact label={copy.labels.published} value={formatOpportunityFieldDate(opportunity, "publishedAt", locale)} copy={copy} />
        <Fact label={copy.labels.location} value={opportunity.location} copy={copy} />
        <Fact label={copy.labels.remoteType} value={opportunity.remoteType ? factValueLabel(opportunity.remoteType, locale) : undefined} copy={copy} />
        <Fact label={copy.labels.employmentType} value={opportunity.employmentType ? factValueLabel(opportunity.employmentType, locale) : undefined} copy={copy} />
        <Fact label={copy.labels.seniority} value={opportunity.seniority ? factValueLabel(opportunity.seniority, locale) : undefined} copy={copy} />
        {typeFacts.map((fact) => <Fact key={fact.label} label={fact.label} value={fact.value} copy={copy} />)}
      </dl>
    </div>

    <Conflicts conflicts={conflicts} locale={locale} copy={copy} />
    <SourceLinks documents={opportunity.sourceDocuments ?? []} sources={sources} copy={copy} type={opportunity.type} />
    <AdminAnnotations annotations={opportunity.pinnedAdminAnnotations ?? []} locale={locale} copy={copy} />
  </section>;
}

function factsForType(opportunity: OpportunityRecord, locale: OpportunityLocale, copy: FactsCopy): Array<{ label: string; value: unknown }> {
  if (opportunity.type === "vacancy") return primitiveFacts(opportunity.vacancyData, copy.vacancy, copy);
  if (opportunity.type === "freelance") return primitiveFacts(opportunity.freelanceData, copy.freelance, copy);
  const tenderData = recordOrEmpty(opportunity.tenderData);
  const eligibility = explicitEligibilityEvidence(tenderData);
  return [
    ...tenderNumberFacts(tenderData, copy),
    ...primitiveFacts(tenderData, copy.tender, copy).filter((fact) => ![copy.tender.contractNumber, copy.tender.procedureNumber, copy.tender.lotNumber].includes(fact.label)),
    { label: copy.labels.eligibility, value: eligibility ? valueOrUnknown(tenderData.eligibility ?? tenderData.eligibilityStatus ?? tenderData.requirementsStatus, copy) : copy.eligibilityMissing },
    ...(eligibility ? eligibilityFacts(eligibility, copy) : []),
  ];
}

function tenderNumberFacts(tenderData: Record<string, unknown>, copy: FactsCopy): Array<{ label: string; value: unknown }> {
  const procedureNumber = tenderData.procedureNumber;
  const fallbackNumber = tenderData.contractNumber ?? tenderData.purchaseNumber;
  const lotNumber = tenderData.lotNumber;
  return [
    ...(isEmptyFact(procedureNumber) ? (isEmptyFact(fallbackNumber) ? [] : [{ label: copy.tender.contractNumber, value: humanValue(fallbackNumber, copy) }]) : [{ label: copy.tender.procedureNumber, value: humanValue(procedureNumber, copy) }]),
    ...(isEmptyFact(lotNumber) ? [] : [{ label: copy.tender.lotNumber, value: humanValue(lotNumber, copy) }]),
  ];
}

function primitiveFacts(data: unknown, labels: Record<string, string>, copy: FactsCopy) {
  const source = recordOrEmpty(data);
  return Object.entries(labels).flatMap(([key, label]) => {
    const value = source[key];
    return isEmptyFact(value) || (typeof value === "object" && !Array.isArray(value)) ? [] : [{ label, value: humanValue(value, copy) }];
  });
}

function recordOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function Conflicts({ conflicts, locale, copy }: { conflicts: CriticalConflict[]; locale: OpportunityLocale; copy: FactsCopy }) {
  if (!conflicts.length) return null;
  return <section className="rounded-lg border border-warning/40 bg-warning/5 p-4">
    <h3 className="font-medium">{copy.conflictsTitle}</h3>
    <div className="mt-3 space-y-3">{conflicts.map((conflict) => <div key={conflict.field} className="rounded-md border bg-background p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge intent="warning">{conflictFieldLabel(conflict.field, copy)}</Badge>
        <span className="text-muted-foreground">{copy.cardValue}: {formatConflictValue(conflict.field, conflict.canonical, locale, copy)}</span>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {conflict.occurrences.map((occurrence, index) => <li key={`${occurrence.sourceId}-${index}`}>
          {occurrence.primary ? copy.primarySource : copy.source} {occurrence.sourceId}: {formatConflictValue(conflict.field, occurrence.value, locale, copy)}
          {safeHttpUrl(occurrence.url) ? <> · <a className="text-primary underline" href={occurrence.url} target="_blank" rel="noreferrer">{copy.open}</a></> : null}
        </li>)}
      </ul>
    </div>)}</div>
  </section>;
}

function SourceLinks({ documents, sources, copy, type }: { documents: SourceDocumentLink[]; sources: PublicSource[]; copy: FactsCopy; type: OpportunityRecord["type"] }) {
  const safeDocuments = documents.filter((document) => document.kind === "file" || safeHttpUrl(document.url));
  if (!safeDocuments.length) return <section className="rounded-lg border bg-card p-4"><h3 className="font-medium">{copy.sourceLinks}</h3><p className="mt-2 text-sm text-muted-foreground">{copy.noSafeLinks}</p></section>;
  return <section className="rounded-lg border bg-card p-4">
    <h3 className="font-medium">{copy.sourceLinks}</h3>
    <p className="mt-1 text-sm text-muted-foreground">{type === "tender" ? copy.tenderSourceLinksDescription : copy.sourceLinksDescription}</p>
    <div className="mt-3 flex flex-wrap gap-2">{safeDocuments.map((document, index) => <SourceLink key={`${document.kind}-${document.sourceId}-${document.url ?? document.fileId ?? index}`} document={document} label={sourceLabel(document, sources)} copy={copy} />)}</div>
  </section>;
}

function SourceLink({ document, label, copy }: { document: SourceDocumentLink; label: string; copy: FactsCopy }) {
  if (document.kind === "file" && document.fileId) {
    return <button type="button" className="inline-flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted" onClick={() => downloadFile(document.fileId!, label, copy)}>
      <FileText className="size-4 shrink-0" /><span className="truncate">{label}</span>
    </button>;
  }
  if (!safeHttpUrl(document.url)) return null;
  return <a className="inline-flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted" href={document.url} target="_blank" rel="noreferrer">
    <ExternalLink className="size-4 shrink-0" /><span className="truncate">{label}</span>
  </a>;
}

function AdminAnnotations({ annotations, locale, copy }: { annotations: NonNullable<OpportunityRecord["pinnedAdminAnnotations"]>; locale: OpportunityLocale; copy: FactsCopy }) {
  if (!annotations.length) return null;
  return <section className="rounded-lg border bg-card p-4"><h3 className="font-medium">{copy.adminAnnotations}</h3><ul className="mt-3 space-y-2 text-sm">{annotations.map((item, index) => <li key={`${item.field}-${index}`} className="rounded-md border p-3"><span className="font-medium">{conflictFieldLabel(item.field, copy)}</span>: {formatConflictValue(item.field, item.value, locale, copy)}{item.reason ? <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p> : null}</li>)}</ul></section>;
}

function Fact({ label, value, copy }: { label: string; value: unknown; copy: FactsCopy }) {
  if (isEmptyFact(value)) return null;
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{humanValue(value, copy)}</dd></div>;
}

type EligibilityEvidence = { documentIds: string[]; excerpts: string[]; citations: string[] };

function explicitEligibilityEvidence(data: Record<string, unknown>): EligibilityEvidence | null {
  const source = data.eligibilityEvidence;
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  const documentIds = stringsFrom(record.requirementDocumentIds ?? record.documentIds ?? record.sourceDocumentIds);
  const excerpts = stringsFrom(record.excerpts);
  const citations = Array.isArray(record.citations)
    ? record.citations.flatMap((item) => citationText(item))
    : stringsFrom(record.citations);
  return documentIds.length || excerpts.length || citations.length ? { documentIds, excerpts, citations } : null;
}

function eligibilityFacts(evidence: EligibilityEvidence, copy: FactsCopy): Array<{ label: string; value: unknown }> {
  const facts: Array<{ label: string; value: unknown }> = [];
  if (evidence.documentIds.length) facts.push({ label: copy.requirementDocuments, value: evidence.documentIds.join(", ") });
  if (evidence.citations.length) facts.push({ label: copy.requirementLinks, value: evidence.citations.join("; ") });
  if (evidence.excerpts.length) facts.push({ label: copy.requirementQuotes, value: evidence.excerpts.slice(0, 3).join("; ") });
  return facts;
}

function citationText(value: unknown): string[] {
  if (typeof value === "string") return [value].filter(Boolean);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return [record.label, record.documentId, record.fileId, record.excerpt].filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function stringsFrom(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return typeof value === "string" && value.trim().length > 0 ? [value] : [];
}

function formatConflictValue(field: string, value: unknown, locale: OpportunityLocale, copy: FactsCopy): string {
  if (field === "money" && value && typeof value === "object" && !Array.isArray(value)) return moneyLabelForLocale(value as OpportunityRecord["money"], locale);
  if (field === "sourceStatus" && typeof value === "string") return sourceStatusLabels[locale][value as keyof typeof sourceStatusLabels[typeof locale]] ?? value;
  return humanValue(value, copy);
}

function humanValue(value: unknown, copy: FactsCopy): string {
  if (isEmptyFact(value)) return copy.unknown;
  if (typeof value === "boolean") return value ? copy.yes : copy.no;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(item => humanValue(item, copy)).join(", ");
  if (value && typeof value === "object") return copy.filled;
  return copy.unknown;
}

function valueOrUnknown(value: unknown, copy: FactsCopy) {
  return isEmptyFact(value) ? copy.unknown : value;
}

function isEmptyFact(value: unknown) {
  return value === undefined || value === null || value === "";
}

function conflictFieldLabel(field: string, copy: FactsCopy) {
  return ({ deadline: copy.labels.deadlineField, money: copy.labels.moneyField, sourceStatus: copy.labels.sourceStatusField } as Record<string, string>)[field] ?? field.replace(/([A-Z])/g, " $1").toLowerCase();
}

function sourceLabel(document: SourceDocumentLink, sources: PublicSource[]) {
  const source = sources.find((item) => item.id === document.sourceId);
  return document.label && document.label !== document.sourceId ? document.label : source?.name || document.sourceId;
}

function safeHttpUrl(url?: string): url is string {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

async function downloadFile(fileId: string, label: string, copy: FactsCopy) {
  try {
    await downloadStoredFile(fileId, label || copy.sourceFile);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : copy.downloadFailed);
  }
}
