import type { SavedView } from "@/types";
import { formatOpportunityDate } from "./opportunity-workspace-labels";

export type OpportunityLocale = "ru" | "en";

export const filterLabelsByLocale: Record<OpportunityLocale, Record<string, string>> = {
  ru: {
    types: "Типы",
    sourceIds: "Источники",
    excludeSourceIds: "Исключённые источники",
    sourceGroups: "Площадки",
    skills: "Навыки",
    technologies: "Технологии",
    seniority: "Уровень",
    employmentTypes: "Занятость",
    remoteType: "Формат",
    locations: "Местоположение",
    countriesAllowed: "Доступные страны",
    currency: "Валюта",
    moneyMin: "Сумма от",
    moneyMax: "Сумма до",
    includeMissingMoney: "Без указанной оплаты",
    publishedFrom: "Опубликована с",
    publishedTo: "Опубликована до",
    firstSeenFrom: "Добавлена с",
    firstSeenTo: "Добавлена до",
    deadlineFrom: "Дедлайн с",
    deadlineTo: "Дедлайн до",
    updatedFrom: "Обновлена с",
    updatedTo: "Обновлена до",
    hasDeadline: "С дедлайном",
    multipleSources: "Несколько источников",
    manualOnly: "Ручные записи",
    importedOnly: "Импортированные",
    descriptionContains: "Текст описания",
    language: "Язык",
    status: "Статус источника",
    archive: "Закрытые записи",
    favorite: "Избранные",
    hidden: "Скрытые",
    archived: "Личный архив",
    pipelineStatuses: "Этапы",
    tags: "Метки",
    minMatch: "Соответствие от",
    minAiScore: "Оценка AI от",
    analyzed: "AI-анализ",
    latestAI: "Актуальный AI-анализ",
    role: "Роль/категория",
    counterpart: "Контрагент",
    moneyPeriod: "Период оплаты",
    moneyKind: "Вид оплаты",
    profileScope: "Профили",
    trackedOnly: "В личной работе",
    pipelineReachedStatuses: "Достигнутые этапы",
    pipelineReachedFrom: "Достигнуты с",
    pipelineReachedTo: "Достигнуты до"
  },
  en: {
    types: "Types",
    sourceIds: "Sources",
    excludeSourceIds: "Excluded sources",
    sourceGroups: "Platforms",
    skills: "Skills",
    technologies: "Technologies",
    seniority: "Seniority",
    employmentTypes: "Employment",
    remoteType: "Work format",
    locations: "Location",
    countriesAllowed: "Allowed countries",
    currency: "Currency",
    moneyMin: "Amount from",
    moneyMax: "Amount to",
    includeMissingMoney: "Without stated pay",
    publishedFrom: "Published from",
    publishedTo: "Published to",
    firstSeenFrom: "Added from",
    firstSeenTo: "Added to",
    deadlineFrom: "Deadline from",
    deadlineTo: "Deadline to",
    updatedFrom: "Updated from",
    updatedTo: "Updated to",
    hasDeadline: "Has deadline",
    multipleSources: "Multiple sources",
    manualOnly: "Manual records",
    importedOnly: "Imported",
    descriptionContains: "Description text",
    language: "Language",
    status: "Source status",
    archive: "Closed records",
    favorite: "Favorites",
    hidden: "Hidden",
    archived: "Personal archive",
    pipelineStatuses: "Stages",
    tags: "Tags",
    minMatch: "Fit from",
    minAiScore: "AI rating from",
    analyzed: "AI analysis",
    latestAI: "Latest AI analysis",
    role: "Role/category",
    counterpart: "Counterparty",
    moneyPeriod: "Pay period",
    moneyKind: "Pay type",
    profileScope: "Profiles",
    trackedOnly: "In personal work",
    pipelineReachedStatuses: "Reached stages",
    pipelineReachedFrom: "Reached from",
    pipelineReachedTo: "Reached to"
  }
};
export const filterLabels: Record<string, string> = filterLabelsByLocale.ru;
export const filterKeys = Object.keys(filterLabels);
export const queryKeys = ["query", "profileId", "type", ...filterKeys, "sort", "advancedSort"];
const multiKeys = new Set([
  "types",
  "sourceIds",
  "excludeSourceIds",
  "sourceGroups",
  "skills",
  "technologies",
  "employmentTypes",
  "locations",
  "countriesAllowed",
  "status",
  "pipelineStatuses",
  "pipelineReachedStatuses",
  "tags"
]);
const booleanKeys = new Set([
  "includeMissingMoney",
  "hasDeadline",
  "multipleSources",
  "manualOnly",
  "importedOnly",
  "archive",
  "favorite",
  "hidden",
  "archived",
  "analyzed",
  "latestAI",
  "trackedOnly"
]);
const numericKeys = new Set(["moneyMin", "moneyMax", "minMatch", "minAiScore"]);
const dateKeys = new Set([
  "publishedFrom",
  "publishedTo",
  "firstSeenFrom",
  "firstSeenTo",
  "deadlineFrom",
  "deadlineTo",
  "updatedFrom",
  "updatedTo",
  "pipelineReachedFrom",
  "pipelineReachedTo"
]);
const moneyDimensionLabelByLocale: Record<
  OpportunityLocale,
  Record<"moneyPeriod" | "moneyKind", Record<string, string>>
> = {
  ru: {
    moneyPeriod: {
      hour: "Час",
      hourly: "Час",
      day: "День",
      week: "Неделя",
      month: "Месяц",
      year: "Год",
      project: "Проект",
      unknown: "Не указан"
    },
    moneyKind: {
      salary: "Зарплата",
      budget: "Бюджет",
      rate: "Ставка",
      gross: "До вычетов",
      net: "После вычетов",
      unknown: "Не указан"
    }
  },
  en: {
    moneyPeriod: {
      hour: "Hour",
      hourly: "Hour",
      day: "Day",
      week: "Week",
      month: "Month",
      year: "Year",
      project: "Project",
      unknown: "Unspecified"
    },
    moneyKind: {
      salary: "Salary",
      budget: "Budget",
      rate: "Rate",
      gross: "Gross",
      net: "Net",
      unknown: "Unspecified"
    }
  }
};
const visibleColumns = [
  "money",
  "match",
  "ai",
  "source",
  "status",
  "firstSeen",
  "published",
  "deadline",
  "skills",
  "location"
];

function readColumnWidths(value: unknown): Record<string, number> {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(
          ([key, width]) =>
            (key === "title" || visibleColumns.includes(key)) &&
            typeof width === "number" &&
            Number.isFinite(width)
        )
        .map(([key, width]) => [
          key,
          Math.max(key === "title" ? 240 : 80, Math.min(800, Number(width)))
        ])
    );
  } catch {
    return {};
  }
}

export function buildOpportunityQuery(
  params: URLSearchParams,
  profileId?: string,
  type?: string
): URLSearchParams {
  const query = new URLSearchParams({ limit: "40", sort: params.get("sort") ?? "recommended" });
  for (const key of filterKeys) {
    const value = params.get(key);
    if (value !== null && value !== "") query.set(key, value);
  }
  if (params.get("q")) query.set("query", params.get("q")!);
  if (params.get("advancedSort")) query.set("advancedSort", params.get("advancedSort")!);
  if (profileId && params.get("profileScope") !== "all") query.set("profileId", profileId);
  if (type ?? params.get("type")) query.set("type", (type ?? params.get("type"))!);
  return query;
}

export function savedViewPayload(
  params: URLSearchParams,
  scope: string,
  name: string,
  profileId?: string,
  type?: string
): Partial<SavedView> {
  const current = buildOpportunityQuery(params, profileId, type);
  const filters: Record<string, unknown> = {};
  for (const key of filterKeys) {
    const value = current.get(key);
    if (value === null) continue;
    filters[key] = multiKeys.has(key)
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : booleanKeys.has(key)
        ? value === "true"
        : numericKeys.has(key)
          ? Number(value)
          : value;
  }
  return {
    name: name.trim(),
    scope,
    query: Object.fromEntries(
      ["query", "profileId", "type"].flatMap((key) =>
        current.has(key) ? [[key, current.get(key)!]] : []
      )
    ),
    filters,
    sort: {
      sort: current.get("sort"),
      ...(current.has("advancedSort") ? { advancedSort: current.get("advancedSort") } : {})
    },
    mode: params.get("mode") ?? "list",
    ...(params.has("fields")
      ? {
          visibleFields: params
            .get("fields")!
            .split(",")
            .filter((key) => visibleColumns.includes(key))
        }
      : {}),
    columnState: {
      fieldsExplicit: params.has("fields"),
      ...(params.has("columnWidths")
        ? { widths: readColumnWidths(params.get("columnWidths")) }
        : {})
    }
  };
}

/** Materialize the complete view, so removing a filter doesn't reapply a hidden server default. */
export function savedViewUrl(view: SavedView): string {
  const values = { ...view.query, ...view.filters, ...view.sort };
  const params = new URLSearchParams({
    view: view.id,
    mode: view.mode === "table" || view.mode === "cards" ? view.mode : "list"
  });
  for (const key of queryKeys) {
    const value = values[key];
    if (value === undefined || value === null || value === "") continue;
    params.set(key === "query" ? "q" : key, Array.isArray(value) ? value.join(",") : String(value));
  }
  if (view.columnState?.fieldsExplicit && Array.isArray(view.visibleFields))
    params.set(
      "fields",
      view.visibleFields.filter((key) => visibleColumns.includes(key)).join(",") || "none"
    );
  const widths = readColumnWidths(view.columnState?.widths);
  if (Object.keys(widths).length) params.set("columnWidths", JSON.stringify(widths));
  const paths: Record<string, string> = {
    vacancies: "/vacancies",
    freelance: "/freelance",
    tenders: "/tenders"
  };
  return `${paths[view.scope] ?? "/opportunities"}?${params}`;
}

export function defaultSavedViewUrl(
  views: SavedView[],
  pathname: string,
  params: URLSearchParams
): string | null {
  if (params.size) return null;
  const view = views.find((item) => item.isDefault && item.scope === pathname.slice(1));
  return view ? savedViewUrl(view) : null;
}

export function filterLabel(key: string, locale: OpportunityLocale = "ru"): string {
  return filterLabelsByLocale[locale][key] ?? filterLabelsByLocale.ru[key] ?? key;
}

export function filterValueLabel(
  key: string,
  value: string,
  sourceNames: Record<string, string> = {},
  locale: OpportunityLocale = "ru"
): string {
  if (booleanKeys.has(key))
    return value === "true" ? (locale === "en" ? "yes" : "да") : locale === "en" ? "no" : "нет";
  if (key === "moneyPeriod" || key === "moneyKind")
    return value
      .split(",")
      .map((item) => {
        const trimmed = item.trim();
        return moneyDimensionLabelByLocale[locale][key][trimmed.toLowerCase()] ?? trimmed;
      })
      .join(", ");
  if (dateKeys.has(key)) return formatOpportunityDate(value, locale, value.includes("T")) ?? value;
  const names: Record<OpportunityLocale, Record<string, string>> = {
    ru: {
      all: "Все профили",
      trackedOnly: "В личной работе",
      remote: "Удалённо",
      hybrid: "Гибрид",
      office: "Офис",
      web: "Сайты",
      telegram: "Telegram",
      vk: "VK",
      Active: "Активна",
      Unknown: "Неизвестен",
      Closed: "Закрыта",
      Expired: "Истекла",
      Removed: "Удалена",
      New: "Новая",
      Reviewed: "Просмотрена",
      Interested: "Интересно",
      Shortlisted: "В списке",
      Applied: "Отклик",
      HRReply: "Ответ HR",
      Interview: "Интервью",
      TechnicalInterview: "Техническое интервью",
      Offer: "Предложение",
      ResponseSent: "Предложение отправлено",
      ClientReplied: "Ответ клиента",
      Negotiation: "Переговоры",
      Won: "Успех",
      InProgress: "В работе",
      Completed: "Завершено",
      Lost: "Проиграно",
      PreparingApplication: "Готовим заявку",
      ApplicationSubmitted: "Заявка подана",
      Admitted: "Допущены",
      BiddingEvaluation: "Торги / оценка",
      Contracting: "Контрактование",
      Rejected: "Отказ",
      Archived: "Архив",
      vacancy: "Вакансия",
      freelance: "Проект",
      tender: "Тендер",
      junior: "Junior",
      middle: "Middle",
      senior: "Senior",
      lead: "Lead",
      manual: "Ручной импорт"
    },
    en: {
      all: "All profiles",
      trackedOnly: "In personal work",
      remote: "Remote",
      hybrid: "Hybrid",
      office: "Office",
      web: "Websites",
      telegram: "Telegram",
      vk: "VK",
      Active: "Active",
      Unknown: "Unknown",
      Closed: "Closed",
      Expired: "Expired",
      Removed: "Removed",
      New: "New",
      Reviewed: "Reviewed",
      Interested: "Interested",
      Shortlisted: "Shortlisted",
      Applied: "Applied",
      HRReply: "HR reply",
      Interview: "Interview",
      TechnicalInterview: "Technical interview",
      Offer: "Offer",
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
      Contracting: "Contracting",
      Rejected: "Rejected",
      Archived: "Archived",
      vacancy: "Vacancy",
      freelance: "Project",
      tender: "Tender",
      junior: "Junior",
      middle: "Middle",
      senior: "Senior",
      lead: "Lead",
      manual: "Manual import"
    }
  };
  return value
    .split(",")
    .map((item) => sourceNames[item] ?? names[locale][item] ?? item)
    .join(", ");
}
