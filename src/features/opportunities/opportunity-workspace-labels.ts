import type { OpportunityType, PipelineStage, SourceStatus } from "@/types";
import type { OpportunityRecord } from "./contracts";

export type OpportunityLocale = "ru" | "en";

export function resolveOpportunityLocale(locale?: string | null): OpportunityLocale {
  return locale === "en" ? "en" : "ru";
}

export const opportunityTypeLabels: Record<OpportunityLocale, Record<OpportunityType, string>> = {
  ru: { vacancy: "Вакансия", freelance: "Заказ", tender: "Тендер" },
  en: { vacancy: "Vacancy", freelance: "Project", tender: "Tender" }
};

export const sourceStatusLabels: Record<OpportunityLocale, Record<SourceStatus, string>> = {
  ru: { Active: "Активна", Unknown: "Статус не подтверждён", Closed: "Закрыта", Expired: "Истёк срок", Removed: "Удалена из источника" },
  en: { Active: "Active", Unknown: "Status is not confirmed", Closed: "Closed", Expired: "Expired", Removed: "Removed from source" }
};

export const pipelineStageLabels: Record<OpportunityLocale, Record<PipelineStage, string>> = {
  ru: {
    New: "Новые",
    Reviewed: "Просмотрено",
    Interested: "Интересно",
    Applied: "Отклик отправлен",
    HRReply: "Ответ HR",
    Interview: "Интервью",
    TechnicalInterview: "Техническое интервью",
    Offer: "Оффер",
    Rejected: "Отклонено",
    Archived: "Архив",
    ResponseSent: "Предложение отправлено",
    ClientReplied: "Ответ клиента",
    Negotiation: "Переговоры",
    Won: "Выиграно",
    InProgress: "В работе",
    Completed: "Завершено",
    Lost: "Проиграно",
    PreparingApplication: "Готовим заявку",
    ApplicationSubmitted: "Заявка подана",
    Admitted: "Допущены",
    BiddingEvaluation: "Торги / оценка",
    Contracting: "Контрактование"
  },
  en: {
    New: "New",
    Reviewed: "Reviewed",
    Interested: "Interested",
    Applied: "Applied",
    HRReply: "HR reply",
    Interview: "Interview",
    TechnicalInterview: "Technical interview",
    Offer: "Offer",
    Rejected: "Rejected",
    Archived: "Archived",
    ResponseSent: "Response sent",
    ClientReplied: "Client replied",
    Negotiation: "Negotiation",
    Won: "Won",
    InProgress: "In progress",
    Completed: "Completed",
    Lost: "Lost",
    PreparingApplication: "Preparing application",
    ApplicationSubmitted: "Application submitted",
    Admitted: "Admitted",
    BiddingEvaluation: "Bidding / evaluation",
    Contracting: "Contracting"
  }
};

export const factValueLabels: Record<OpportunityLocale, Record<string, string>> = {
  ru: { remote: "Удалённо", hybrid: "Гибрид", office: "Офис", full_time: "Полная занятость", part_time: "Частичная занятость", contract: "Контракт", contractor: "Контрактор", intern: "Стажёр", junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead", principal: "Principal" },
  en: { remote: "Remote", hybrid: "Hybrid", office: "Office", full_time: "Full-time", part_time: "Part-time", contract: "Contract", contractor: "Contractor", intern: "Intern", junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead", principal: "Principal" }
};

export const responseFormatLabels: Record<OpportunityLocale, Record<string, string>> = {
  ru: { short_response: "Короткий отклик", full_response: "Полный отклик", cover_letter: "Сопроводительное письмо", telegram_chat: "Сообщение в Telegram", why_good_fit: "Почему я подхожу", short_proposal: "Короткое предложение", full_proposal: "Полное предложение", chat_message: "Сообщение в чат", commercial_proposal: "Коммерческое предложение", application_draft: "Черновик заявки", checklist_text: "Текст по чеклисту" },
  en: { short_response: "Short response", full_response: "Full response", cover_letter: "Cover letter", telegram_chat: "Telegram message", why_good_fit: "Why I am a good fit", short_proposal: "Short proposal", full_proposal: "Full proposal", chat_message: "Chat message", commercial_proposal: "Commercial proposal", application_draft: "Application draft", checklist_text: "Checklist text" }
};

export const aiRunStatusLabels: Record<OpportunityLocale, Record<string, string>> = {
  ru: { queued: "В очереди", running: "Выполняется", completed: "Готов", failed: "Ошибка", cancelled: "Отменён" },
  en: { queued: "Queued", running: "Running", completed: "Ready", failed: "Failed", cancelled: "Cancelled" }
};

export const responseStatusLabels: Record<OpportunityLocale, Record<string, string>> = {
  ru: { draft: "Черновик", ready: "Готов", sent: "Отправлен", submitted: "Подан" },
  en: { draft: "Draft", ready: "Ready", sent: "Sent", submitted: "Submitted" }
};

export const saveStateLabels: Record<OpportunityLocale, Record<string, string>> = {
  ru: { saved: "Сохранено", dirty: "Есть изменения", saving: "Сохраняем…", error: "Ошибка сохранения", conflict: "Конфликт версий" },
  en: { saved: "Saved", dirty: "Unsaved changes", saving: "Saving…", error: "Save error", conflict: "Version conflict" }
};

export function formatOpportunityDate(value: string | undefined | null, locale: OpportunityLocale, withTime = true) {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";
  return withTime ? date.toLocaleString(dateLocale) : date.toLocaleDateString(dateLocale);
}

const strictCalendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function formatCalendarDate(value: string, locale: OpportunityLocale) {
  const match = strictCalendarDatePattern.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { timeZone: "UTC" }).format(date);
}

export function formatOpportunityFieldDate(
  opportunity: Pick<OpportunityRecord, "publishedAt" | "deadline" | "dateMetadata">,
  field: "publishedAt" | "deadline",
  locale: OpportunityLocale,
  withTime = true
) {
  const metadata = opportunity.dateMetadata?.[field];
  if (metadata?.precision === "day") {
    const dayLabel = formatCalendarDate(metadata.calendarDate, locale);
    if (dayLabel) return dayLabel;
  }
  return formatOpportunityDate(opportunity[field], locale, withTime);
}

export function normalizeFactValueToken(value: string) {
  const token = value.trim();
  const normalized = token.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_").toLowerCase();
  const aliases: Record<string, string> = { telecommute: "remote", fulltime: "full_time", parttime: "part_time", contractor: "contractor", ft: "full_time", senior_level: "senior" };
  return aliases[normalized] ?? normalized;
}

export function factValueLabel(value: string, locale: OpportunityLocale) {
  return factValueLabels[locale][normalizeFactValueToken(value)] ?? value;
}

const periodLabels: Record<OpportunityLocale, Record<string, string>> = {
  ru: { hour: "час", day: "день", week: "неделя", month: "месяц", year: "год", project: "проект" },
  en: { hour: "hour", day: "day", week: "week", month: "month", year: "year", project: "project" }
};

const currencyLabels: Record<OpportunityLocale, Record<string, string>> = {
  ru: { RUB: "₽", RUR: "₽", USD: "$", EUR: "€", GBP: "£", KZT: "₸" },
  en: { RUB: "RUB", RUR: "RUB", USD: "USD", EUR: "EUR", GBP: "GBP", KZT: "KZT" }
};

const machineMoneyTextPattern = /^\s*\d[\d\s.,]*(?:\s*[–-]\s*\d[\d\s.,]*)?(?:\s+(?:RUR|RUB|USD|EUR|GBP|KZT|₽|\$|€|£|₸))?(?:\s+(?:HOUR|DAY|WEEK|MONTH|YEAR|PROJECT|hour|day|week|month|year|project))?\s*$/;
const boundedMachineMoneyTextPattern = /^\s*(?:от\s+\d[\d\s.,]*(?:\s+до\s+\d[\d\s.,]*)?|до\s+\d[\d\s.,]*)(?:\s+(?:RUR|RUB|USD|EUR|GBP|KZT|₽|\$|€|£|₸))?\s*$/;
const workdayBasePayRangeTextPattern = /^\s*(?:primary\s+location\s+)?base\s+pay\s+range\s*:\s*(?:[$€£₽₸]\s*)?\d[\d\s.,]*(?:\s*(?:RUR|RUB|USD|EUR|GBP|KZT))?(?:\s*[–-]\s*(?:[$€£₽₸]\s*)?\d[\d\s.,]*(?:\s*(?:RUR|RUB|USD|EUR|GBP|KZT))?)?\s*$/i;

function normalizeMoneyToken(value: string | undefined) {
  return value?.trim().replace(/-/g, "_").toUpperCase();
}

function hasFiniteMoneyValue(money: OpportunityRecord["money"]) {
  return [money.min, money.max].some((value) => typeof value === "number" && Number.isFinite(value));
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

export function moneyLabelForLocale(money: OpportunityRecord["money"] = {}, locale: OpportunityLocale) {
  if (money.originalText && !knownMachineMoneyText(money)) return money.originalText;
  const numberLocale = locale === "ru" ? "ru-RU" : "en-US";
  const numericValues = [money.min, money.max].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const uniqueValues = numericValues.length === 2 && numericValues[0] === numericValues[1] ? [numericValues[0]] : numericValues;
  const values = uniqueValues.map(value => value.toLocaleString(numberLocale));
  if (!values.length) return locale === "ru" ? "Сумма не указана" : "Amount is not specified";
  const boundLabel = numericValues.length === 1
    ? typeof money.min === "number" && Number.isFinite(money.min)
      ? locale === "en" ? "from " : "от "
      : locale === "en" ? "up to " : "до "
    : "";
  const currencyToken = normalizeMoneyToken(money.currency);
  const currency = currencyToken ? (currencyLabels[locale][currencyToken] ?? money.currency?.trim() ?? "") : "";
  const periodToken = normalizeMoneyToken(money.period)?.toLowerCase();
  const period = periodToken ? (periodLabels[locale][periodToken] ?? money.period?.trim() ?? "") : "";
  return `${boundLabel}${values.join(" – ")}${currency ? ` ${currency}` : ""}${period ? ` / ${period}` : ""}`;
}

export const commonTabLabels: Record<OpportunityLocale, Record<string, string>> = {
  ru: { description: "Описание", facts: "Факты", ai: "AI-анализ", response: "Отклик", notes: "Личные заметки", comments: "Обсуждение", sources: "Источники" },
  en: { description: "Description", facts: "Facts", ai: "AI analysis", response: "Response", notes: "Private notes", comments: "Discussion", sources: "Sources" }
};

export const tenderTabLabels: Record<OpportunityLocale, Record<string, string>> = {
  ru: { description: "Сводка", facts: "Факты", documents: "Документы", eligibility: "Проверка", requirements: "Требования", application: "Заявка", risks: "Риски", ai: "AI-анализ", notes: "Личные заметки", comments: "Обсуждение", sources: "Источники" },
  en: { description: "Overview", facts: "Facts", documents: "Documents", eligibility: "Eligibility", requirements: "Requirements", application: "Application", risks: "Risks", ai: "AI analysis", notes: "Private notes", comments: "Discussion", sources: "Sources" }
};
