import type { OpportunityMini, OpportunityType, PipelineStage, SourceStatus } from "@/types";
import { pipelineStageLabels } from "./opportunity-workspace-labels";
import type { PublicSource } from "@/features/profiles";

export type PersonalState = {
  id: string;
  profileId: string;
  pipelineStatus: PipelineStage;
  favorite: boolean;
  hidden: boolean;
  archived: boolean;
  tags: string[];
  matchScore: number | null;
  matchComponents: Record<string, number>;
  notes: { body: string; createdAt?: string }[];
};
export type SourceOccurrenceSnapshot = {
  deadline?: string;
  money?: OpportunityRecord["money"];
  sourceStatus?: SourceStatus;
};
export type SourceOccurrenceRecord = {
  sourceId: string;
  externalId?: string;
  url: string;
  primary: boolean;
  status: SourceStatus;
  publishedAt?: string;
  lastSeenAt?: string;
  normalizedSnapshot?: SourceOccurrenceSnapshot;
};
export type OpportunityDatePrecisionMetadata = {
  precision: "day";
  calendarDate: string;
  originalText?: string;
  timezone?: string;
};
export type OpportunityDateMetadata = {
  publishedAt?: OpportunityDatePrecisionMetadata;
  deadline?: OpportunityDatePrecisionMetadata;
};
export type CriticalConflict = {
  field: "deadline" | "money" | "sourceStatus" | string;
  severity: "critical" | string;
  canonical: unknown;
  occurrences: {
    sourceId: string;
    url?: string;
    primary: boolean;
    lastSeenAt?: string | null;
    value: unknown;
  }[];
};
export type SourceDocumentLink = {
  kind: "url" | "file";
  sourceId: string;
  label: string;
  url?: string;
  fileId?: string;
};
export type LatestAiAnalysis = {
  id: string;
  taskType: string;
  aiScore: number | null;
  completedAt?: string | null;
};
export type PrimaryCanonical = {
  deadline?: string | null;
  money?: OpportunityRecord["money"];
  sourceStatus?: SourceStatus;
  primarySource?: SourceOccurrenceRecord | null;
};
export type PinnedAdminAnnotation = {
  field: string;
  value: unknown;
  reason?: string;
  correctedAt?: string;
};
export type OpportunityRecord = {
  id: string;
  type: OpportunityType;
  title: string;
  companyOrClient: string;
  description: string;
  summary?: string;
  skills: string[];
  technologies: string[];
  seniority?: string;
  location?: string;
  remoteType?: string;
  employmentType?: string;
  money: {
    originalText?: string;
    min?: number | null;
    max?: number | null;
    currency?: string;
    period?: string;
  };
  sourceStatus: SourceStatus;
  sourceOccurrences: SourceOccurrenceRecord[];
  firstSeenAt: string;
  publishedAt?: string;
  deadline?: string;
  dateMetadata?: OpportunityDateMetadata;
  matchScore?: number | null;
  aiScore?: number | null;
  latestAiAnalysis?: LatestAiAnalysis | null;
  pipelineStatus?: PipelineStage;
  favorite?: boolean;
  hidden?: boolean;
  archived?: boolean;
  tags?: string[];
  personalState?: PersonalState | null;
  vacancyData: Record<string, unknown>;
  freelanceData: Record<string, unknown>;
  tenderData: Record<string, unknown>;
  sourceDocuments?: SourceDocumentLink[];
  criticalConflicts?: CriticalConflict[];
  primaryCanonical?: PrimaryCanonical;
  pinnedAdminAnnotations?: PinnedAdminAnnotation[];
};
export type Page<T> = { items: T[]; nextCursor: string | null; total?: number };
export type AiRun = {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  taskType: string;
  provider?: string;
  modelId?: string;
  createdAt: string;
  aiScore?: number;
  errorCode?: string;
  errorSummary?: string;
  structuredOutput?: Record<string, unknown>;
};
export const typeLabels = { vacancy: "Вакансии", freelance: "Проекты", tender: "Тендеры" };
export const stageLabels: Record<PipelineStage, string> = pipelineStageLabels.ru;
export const stageLabelsByLocale = pipelineStageLabels;

export const tableColumns = {
  money: "Оплата",
  match: "Соответствие",
  ai: "Оценка AI",
  source: "Источники",
  status: "Этап",
  firstSeen: "Добавлена",
  published: "Опубликована",
  deadline: "Дедлайн",
  skills: "Навыки",
  location: "Формат и место"
};
export const tableColumnsByLocale = {
  ru: tableColumns,
  en: {
    money: "Pay",
    match: "Соответствие",
    ai: "Оценка AI",
    source: "Sources",
    status: "Stage",
    firstSeen: "Added",
    published: "Published",
    deadline: "Deadline",
    skills: "Skills",
    location: "Format and place"
  }
} as const;
export type OpportunityTableLocale = keyof typeof tableColumnsByLocale;

export function resolveOpportunityTableLocale(locale?: string | null): OpportunityTableLocale {
  return locale === "en" ? "en" : "ru";
}

export const selectClass =
  "h-[var(--control-height)] rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const periodLabels: Record<"ru" | "en", Record<string, string>> = {
  ru: { hour: "час", day: "день", week: "неделя", month: "месяц", year: "год", project: "проект" },
  en: { hour: "hour", day: "day", week: "week", month: "month", year: "year", project: "project" }
};

const currencyLabels: Record<"ru" | "en", Record<string, string>> = {
  ru: { RUB: "₽", RUR: "₽", USD: "$", EUR: "€", GBP: "£", KZT: "₸" },
  en: { RUB: "RUB", RUR: "RUB", USD: "USD", EUR: "EUR", GBP: "GBP", KZT: "KZT" }
};

const machineMoneyTextPattern =
  /^\s*\d[\d\s.,]*(?:\s*[–-]\s*\d[\d\s.,]*)?(?:\s+(?:RUR|RUB|USD|EUR|GBP|KZT|₽|\$|€|£|₸))?(?:\s+(?:HOUR|DAY|WEEK|MONTH|YEAR|PROJECT|hour|day|week|month|year|project))?\s*$/;
const boundedMachineMoneyTextPattern =
  /^\s*(?:от\s+\d[\d\s.,]*(?:\s+до\s+\d[\d\s.,]*)?|до\s+\d[\d\s.,]*)(?:\s+(?:RUR|RUB|USD|EUR|GBP|KZT|₽|\$|€|£|₸))?\s*$/;
const workdayBasePayRangeTextPattern =
  /^\s*(?:primary\s+location\s+)?base\s+pay\s+range\s*:\s*(?:[$€£₽₸]\s*)?\d[\d\s.,]*(?:\s*(?:RUR|RUB|USD|EUR|GBP|KZT))?(?:\s*[–-]\s*(?:[$€£₽₸]\s*)?\d[\d\s.,]*(?:\s*(?:RUR|RUB|USD|EUR|GBP|KZT))?)?\s*$/i;

function normalizeMoneyToken(value: string | undefined) {
  return value?.trim().replace(/-/g, "_").toUpperCase();
}

function knownMachineMoneyText(money: OpportunityRecord["money"]) {
  return Boolean(
    money.originalText &&
    hasFiniteMoneyValue(money) &&
    (machineMoneyTextPattern.test(money.originalText) ||
      boundedMachineMoneyTextPattern.test(money.originalText) ||
      workdayBasePayRangeTextPattern.test(money.originalText))
  );
}

function hasFiniteMoneyValue(money: OpportunityRecord["money"]) {
  return [money.min, money.max].some(
    (value) => typeof value === "number" && Number.isFinite(value)
  );
}

export function moneyLabel(money: OpportunityRecord["money"] = {}, locale: "ru" | "en" = "ru") {
  if (money.originalText && !knownMachineMoneyText(money)) return money.originalText;
  const numericValues = [money.min, money.max].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  const uniqueValues =
    numericValues.length === 2 && numericValues[0] === numericValues[1]
      ? [numericValues[0]]
      : numericValues;
  const values = uniqueValues.map((value) =>
    value.toLocaleString(locale === "en" ? "en-US" : "ru-RU")
  );
  const boundLabel =
    numericValues.length === 1
      ? typeof money.min === "number" && Number.isFinite(money.min)
        ? locale === "en"
          ? "from "
          : "от "
        : locale === "en"
          ? "up to "
          : "до "
      : "";
  const currencyToken = normalizeMoneyToken(money.currency);
  const currency = currencyToken
    ? (currencyLabels[locale][currencyToken] ?? money.currency?.trim() ?? "")
    : "";
  const periodToken = normalizeMoneyToken(money.period)?.toLowerCase();
  const period = periodToken
    ? (periodLabels[locale][periodToken] ?? money.period?.trim() ?? "")
    : "";
  return values.length
    ? `${boundLabel}${values.join(" – ")}${currency ? ` ${currency}` : ""}${period ? ` / ${period}` : ""}`
    : locale === "en"
      ? "Amount not specified"
      : "Сумма не указана";
}

const recognizedDescriptionHtmlPattern =
  /<\/?(?:p|div|br|ul|ol|li|h[1-6]|blockquote|section|article|strong|em|b|i|span|a|code|pre)\b[^>]*>/i;

function decodeDescriptionEntity(entity: string) {
  const rawName = entity.slice(1, -1);
  const name = rawName.toLowerCase();
  const named: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'"
  };
  if (name in named) return named[name];
  const codePoint = /^#x[0-9a-f]+$/i.test(rawName)
    ? Number.parseInt(rawName.slice(2), 16)
    : /^#\d+$/.test(rawName)
      ? Number.parseInt(rawName.slice(1), 10)
      : null;
  if (
    codePoint === null ||
    !Number.isInteger(codePoint) ||
    codePoint < 0 ||
    codePoint > 0x10ffff ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff)
  )
    return entity;
  return String.fromCodePoint(codePoint);
}

function decodeDescriptionEntities(value: string) {
  return value.replace(/&(?:nbsp|amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (match) =>
    decodeDescriptionEntity(match)
  );
}

export function plainOpportunityDescription(description: string) {
  if (!recognizedDescriptionHtmlPattern.test(description)) {
    let fence: string | undefined;
    return description
      .split("\n")
      .map((line) => {
        const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
        if (marker) {
          if (!fence) fence = marker;
          else if (marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
          return line;
        }
        if (fence) return line;
        return line.replace(/^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/, "$1");
      })
      .join("\n")
      .trim();
  }
  const text = description
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/\r\n?|\n/g, " ")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(?:p|div|section|article|h[1-6]|blockquote|pre)\s*>/gi, "\n\n")
    .replace(/<\s*li\b[^>]*>/gi, "\n• ")
    .replace(/<\s*\/\s*li\s*>/gi, "\n")
    .replace(/<\s*\/\s*(?:ul|ol)\s*>/gi, "\n\n")
    .replace(/<\s*(?:p|div|section|article|h[1-6]|blockquote|pre|ul|ol)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeDescriptionEntities(text)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/•\n+(?=\S)/g, "• ")
    .replace(/(• [^\n]*)\n\n(?=• )/g, "$1\n")
    .trim();
}

export function sourceUrl(opportunity: OpportunityRecord) {
  const occurrence =
    opportunity.sourceOccurrences.find((source) => source.primary) ??
    opportunity.sourceOccurrences[0];
  return occurrence?.url.startsWith("https://") || occurrence?.url.startsWith("http://")
    ? occurrence.url
    : undefined;
}
export function opportunityPlaceLabel(
  opportunity: Pick<OpportunityRecord, "location" | "remoteType">,
  locale: "ru" | "en" = "ru"
) {
  const labels = [opportunity.location, opportunity.remoteType].reduce<string[]>(
    (result, value) => {
      if (!value) return result;
      const label = factLabel(String(value), locale);
      return result.includes(label) ? result : [...result, label];
    },
    []
  );
  return labels.join(" · ");
}

export function toMini(
  opportunity: OpportunityRecord,
  sources: PublicSource[] = [],
  locale: "ru" | "en" = "ru"
): OpportunityMini {
  const primary =
    opportunity.sourceOccurrences.find((source) => source.primary) ??
    opportunity.sourceOccurrences[0];
  return {
    id: opportunity.id,
    type: opportunity.type,
    title: opportunity.title,
    companyOrClient: opportunity.companyOrClient,
    compensationLabel: moneyLabel(opportunity.money, locale),
    placeLabel: opportunityPlaceLabel(opportunity, locale) || undefined,
    source: {
      id: primary?.sourceId ?? "manual",
      name:
        sources.find((source) => source.id === primary?.sourceId)?.name ??
        (primary?.sourceId && primary.sourceId !== "manual"
          ? locale === "en"
            ? "External import"
            : "Внешний импорт"
          : locale === "en"
            ? "Manual import"
            : "Ручной импорт"),
      url: sourceUrl(opportunity),
      status: opportunity.sourceStatus,
      extraCount: Math.max(0, opportunity.sourceOccurrences.length - 1)
    },
    matchScore: opportunity.matchScore ?? opportunity.personalState?.matchScore ?? null,
    aiScore: opportunity.aiScore ?? null,
    skills: [...new Set([...(opportunity.skills ?? []), ...(opportunity.technologies ?? [])])],
    pipelineStage: opportunity.pipelineStatus ?? opportunity.personalState?.pipelineStatus ?? "New",
    firstSeenAt: opportunity.firstSeenAt,
    publishedAt: opportunity.publishedAt,
    favorite: opportunity.favorite ?? opportunity.personalState?.favorite ?? false,
    hidden: opportunity.hidden,
    archived: opportunity.archived,
    description: plainOpportunityDescription(opportunity.description ?? "")
  };
}

export function normalizeFactToken(value: string) {
  const token = value.trim();
  const normalized = token
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
  const aliases: Record<string, string> = {
    telecommute: "remote",
    fulltime: "full_time",
    parttime: "part_time",
    contractor: "contractor",
    ft: "full_time",
    senior_level: "senior"
  };
  return aliases[normalized] ?? normalized;
}

export function factLabel(value: string, locale: "ru" | "en" = "ru") {
  const labels: Record<"ru" | "en", Record<string, string>> = {
    ru: {
      remote: "Удалённо",
      hybrid: "Гибрид",
      office: "Офис",
      full_time: "Полная занятость",
      part_time: "Частичная занятость",
      contract: "Контракт",
      contractor: "Контрактор",
      intern: "Стажёр",
      junior: "Junior",
      middle: "Middle",
      senior: "Senior",
      lead: "Lead",
      principal: "Principal"
    },
    en: {
      remote: "Remote",
      hybrid: "Hybrid",
      office: "Office",
      full_time: "Full-time",
      part_time: "Part-time",
      contract: "Contract",
      contractor: "Contractor",
      intern: "Intern",
      junior: "Junior",
      middle: "Middle",
      senior: "Senior",
      lead: "Lead",
      principal: "Principal"
    }
  };
  return labels[locale][normalizeFactToken(value)] ?? value;
}
