import { pipelineStageDefinitions } from "../../lib/pipeline-model";
import type {
  AnalyticsFilters,
  AnalyticsKind,
  AnalyticsOpportunityType,
  AnalyticsPeriod,
  AnalyticsRow
} from "./contracts";

export type AnalyticsLocale = "ru" | "en";

export const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  "7d": "7 дней",
  "30d": "30 дней",
  "90d": "90 дней",
  custom: "Период"
};
export const TYPE_LABELS: Record<AnalyticsOpportunityType, string> = {
  all: "Все типы",
  vacancy: "Вакансии",
  freelance: "Проекты",
  tender: "Тендеры"
};

export const KPI_LABELS: Record<string, string> = {
  found: "Найдено",
  tracked: "В личной работе (все даты)",
  reviewed: "Просмотрено",
  responsesSent: "Отклики отправлены",
  replies: "Ответы",
  interviewsNegotiations: "Интервью/переговоры",
  offersWon: "Офферы/выиграно",
  conversionRate: "Конверсия",
  avgMatchScore: "Подходит профилю",
  avgAiScore: "Уверенность AI",
  opportunities: "Возможности",
  active: "Активные",
  closedExpiredRemoved: "Закрытые/истекшие",
  numericMoneyCoverage: "Покрытие денег",
  sourceCount: "Источники"
};

export const SERIES_LABELS: Record<string, string> = {
  found: "Найдено",
  responses: "Отклики",
  wins: "Победы",
  replies: "Ответы",
  interviews: "Интервью/переговоры",
  count: "Всего",
  vacancy: "Вакансии",
  freelance: "Проекты",
  tender: "Тендеры"
};

const PERIOD_LABELS_EN: Record<AnalyticsPeriod, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  custom: "Custom"
};
const TYPE_LABELS_EN: Record<AnalyticsOpportunityType, string> = {
  all: "All types",
  vacancy: "Vacancies",
  freelance: "Projects",
  tender: "Tenders"
};
const CANONICAL_PIPELINE_STATUSES = new Set(Object.values(pipelineStageDefinitions).flat());

const KPI_LABELS_EN: Record<string, string> = {
  found: "Found",
  tracked: "In personal work (all time)",
  reviewed: "Reviewed",
  responsesSent: "Responses sent",
  replies: "Replies",
  interviewsNegotiations: "Interviews/negotiations",
  offersWon: "Offers/won",
  conversionRate: "Conversion",
  avgMatchScore: "Profile fit",
  avgAiScore: "AI confidence",
  opportunities: "Opportunities",
  active: "Active",
  closedExpiredRemoved: "Closed/expired",
  numericMoneyCoverage: "Money coverage",
  sourceCount: "Sources"
};

const SERIES_LABELS_EN: Record<string, string> = {
  found: "Found",
  responses: "Responses",
  wins: "Wins",
  replies: "Replies",
  interviews: "Interviews/negotiations",
  count: "Total",
  vacancy: "Vacancies",
  freelance: "Projects",
  tender: "Tenders"
};

export const COLUMN_LABELS: Record<string, string> = {
  active: "Активные",
  closed: "Закрытые",
  count: "Количество",
  counterpart: "Контрагент",
  currencyPeriod: "Валюта/период",
  duplicateContributions: "Дубли",
  duplicateRate: "Доля дублей",
  found: "Найдено",
  freshnessLabel: "Свежесть",
  group: "Группа",
  label: "Стадия",
  lastSeenAt: "Последний раз видели",
  location: "География",
  max: "Максимум",
  median: "Медиана",
  min: "Минимум",
  profileId: "Профиль",
  profileName: "Профиль",
  trackedAllTime: "В работе (все даты)",
  replyRate: "Доля ответов",
  sourceGroup: "Группа источников",
  country: "Допустимая страна",
  date: "Период",
  qualityLabel: "Качество",
  remoteType: "Формат",
  responseRate: "Доля откликов",
  responses: "Отклики",
  role: "Роль/категория",
  sampleCount: "Выборка",
  sourceId: "Источник ID",
  sourceName: "Источник",
  status: "Статус",
  technology: "Технология",
  tracked: "В работе",
  type: "Тип",
  vacancy: "Вакансии",
  freelance: "Проекты",
  tender: "Тендеры",
  winRate: "Доля побед",
  wins: "Победы",
  interviews: "Интервью/переговоры",
  replies: "Ответы",
  conversionRate: "Переход к стадии",
  previousCount: "Предыдущий период",
  growthRate: "Изменение",
  band: "Диапазон",
  currency: "Валюта",
  period: "Период оплаты",
  kind: "Вид оплаты",
  seniority: "Уровень"
};

const COLUMN_LABELS_EN: Record<string, string> = {
  active: "Active",
  closed: "Closed",
  count: "Count",
  counterpart: "Counterpart",
  currencyPeriod: "Currency/period",
  duplicateContributions: "Duplicates",
  duplicateRate: "Duplicate rate",
  found: "Found",
  freshnessLabel: "Freshness",
  group: "Group",
  label: "Stage",
  lastSeenAt: "Last seen",
  location: "Location",
  max: "Max",
  median: "Median",
  min: "Min",
  profileId: "Profile",
  profileName: "Profile",
  trackedAllTime: "In work (all time)",
  replyRate: "Reply rate",
  sourceGroup: "Source group",
  country: "Allowed country",
  date: "Period",
  qualityLabel: "Quality",
  remoteType: "Format",
  responseRate: "Response rate",
  responses: "Responses",
  role: "Role/category",
  sampleCount: "Sample",
  sourceId: "Source ID",
  sourceName: "Source",
  status: "Status",
  technology: "Technology",
  tracked: "In work",
  type: "Type",
  vacancy: "Vacancies",
  freelance: "Projects",
  tender: "Tenders",
  winRate: "Win rate",
  wins: "Wins",
  interviews: "Interviews/negotiations",
  replies: "Replies",
  conversionRate: "Stage conversion",
  previousCount: "Previous period",
  growthRate: "Change",
  band: "Range",
  currency: "Currency",
  period: "Pay period",
  kind: "Pay kind",
  seniority: "Seniority"
};

const OPPORTUNITY_ROUTES: Record<Exclude<AnalyticsOpportunityType, "all">, string> = {
  vacancy: "/vacancies",
  freelance: "/freelance",
  tender: "/tenders"
};

export type MoneyDimensionOptions = {
  currencies: string[];
  periods: string[];
  kinds: string[];
};

const TRUSTED_CURRENCIES = ["RUB", "RUR", "USD", "EUR", "GBP", "KZT", "unknown"];
const TRUSTED_PERIODS = ["year", "month", "hour", "day", "week", "project", "unknown"];
const TRUSTED_KINDS = ["gross", "net", "unknown"];

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeCustomDate(value: string | undefined, edge: "from" | "to"): string | undefined {
  if (!value) return undefined;
  if (!isDateOnly(value)) return value;
  return `${value}T${edge === "from" ? "00:00:00.000" : "23:59:59.999"}Z`;
}

export function buildAnalyticsQuery(filters: AnalyticsFilters): string {
  const params = new URLSearchParams();
  params.set("period", filters.period);
  if (filters.period === "custom") {
    const from = normalizeCustomDate(filters.from, "from");
    const to = normalizeCustomDate(filters.to, "to");
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  if (filters.profileId) params.set("profileId", filters.profileId);
  if (filters.type && filters.type !== "all") params.set("type", filters.type);
  if (filters.sourceIds?.length) params.set("sourceIds", filters.sourceIds.join(","));
  if (filters.includeClosed !== undefined)
    params.set("includeClosed", String(filters.includeClosed));
  for (const key of ["sourceGroups", "locations", "countriesAllowed", "technologies"] as const) {
    if (filters[key]?.length) params.set(key, filters[key].join(","));
  }
  for (const key of ["seniority", "remoteType", "role", "currency"] as const)
    if (filters[key]) params.set(key, filters[key]);
  const moneyPeriod = moneyDimensionFilterValue("period", filters.moneyPeriod);
  const moneyKind = moneyDimensionFilterValue("kind", filters.moneyKind);
  if (moneyPeriod) params.set("moneyPeriod", moneyPeriod);
  if (moneyKind) params.set("moneyKind", moneyKind);
  if (filters.comparePrevious !== undefined)
    params.set("comparePrevious", String(filters.comparePrevious));
  const value = params.toString();
  return value ? `?${value}` : "";
}

/** Reuse the server's resolved time window, so a rolling period does not drift on click. */
export function analyticsDrilldownFilters(
  filters: AnalyticsFilters,
  resolved: Record<string, unknown>
): AnalyticsFilters {
  return typeof resolved.from === "string" && typeof resolved.to === "string"
    ? { ...filters, period: "custom", from: resolved.from, to: resolved.to }
    : filters;
}

function dimensionValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function uniqueOptions(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function moneyDimensionOptions(
  rows: AnalyticsRow[],
  selected: Pick<AnalyticsFilters, "currency" | "moneyPeriod" | "moneyKind"> = {}
): MoneyDimensionOptions {
  return {
    currencies: uniqueOptions([
      ...TRUSTED_CURRENCIES,
      ...rows.map((row) => dimensionValue(row.currency)),
      dimensionValue(selected.currency)
    ]),
    periods: uniqueOptions([
      ...TRUSTED_PERIODS,
      ...rows.map((row) => moneyDimensionFilterValue("period", row.period)),
      moneyDimensionFilterValue("period", selected.moneyPeriod)
    ]),
    kinds: uniqueOptions([
      ...TRUSTED_KINDS,
      ...rows.map((row) => moneyDimensionFilterValue("kind", row.kind)),
      moneyDimensionFilterValue("kind", selected.moneyKind)
    ])
  };
}

export function mergeMoneyDimensionOptions(
  left: MoneyDimensionOptions,
  right: MoneyDimensionOptions
): MoneyDimensionOptions {
  return {
    currencies: uniqueOptions([...left.currencies, ...right.currencies]),
    periods: uniqueOptions([...left.periods, ...right.periods]),
    kinds: uniqueOptions([...left.kinds, ...right.kinds])
  };
}

export function moneyDimensionFilterValue(
  kind: "period" | "kind",
  value: unknown
): string | undefined {
  const normalized = dimensionValue(value);
  if (!normalized) return undefined;
  if (normalized.toLowerCase() === "unknown") return "unknown";
  if (kind === "period") {
    const alias = normalized.toLowerCase().replace(/-/g, "_");
    if (alias === "hourly") return "hour";
    if (["hour", "day", "week", "month", "year", "project"].includes(alias)) return alias;
    return normalized;
  }
  const alias = normalized.toLowerCase().replace(/-/g, "_");
  return ["salary", "budget", "rate", "gross", "net"].includes(alias) ? alias : normalized;
}

export function buildOpportunityDrilldown(
  filters: AnalyticsFilters,
  row: AnalyticsRow = {}
): string {
  const rowType =
    typeof row.type === "string" && row.type in OPPORTUNITY_ROUTES
      ? (row.type as Exclude<AnalyticsOpportunityType, "all">)
      : undefined;
  const type = rowType ?? (filters.type && filters.type !== "all" ? filters.type : undefined);
  const params = new URLSearchParams();
  if (filters.profileId) params.set("profileId", filters.profileId);
  else if (filters.scope === "personal") params.set("profileScope", "all");
  if (filters.scope === "personal") params.set("trackedOnly", "true");
  if (type) params.set("type", type);
  const sourceIds = typeof row.sourceId === "string" ? [row.sourceId] : (filters.sourceIds ?? []);
  if (sourceIds.length) params.set("sourceIds", sourceIds.join(","));
  for (const key of ["sourceGroups", "locations", "countriesAllowed", "technologies"] as const) {
    if (filters[key]?.length) params.set(key, filters[key].join(","));
  }
  for (const key of ["seniority", "remoteType", "role", "currency"] as const)
    if (filters[key]) params.set(key, filters[key]);
  const filterMoneyPeriod = moneyDimensionFilterValue("period", filters.moneyPeriod);
  const filterMoneyKind = moneyDimensionFilterValue("kind", filters.moneyKind);
  if (filterMoneyPeriod) params.set("moneyPeriod", filterMoneyPeriod);
  if (filterMoneyKind) params.set("moneyKind", filterMoneyKind);
  const from = normalizeCustomDate(filters.period === "custom" ? filters.from : undefined, "from");
  const to = normalizeCustomDate(filters.period === "custom" ? filters.to : undefined, "to");
  if (from) params.set("firstSeenFrom", from);
  if (to) params.set("firstSeenTo", to);
  if (typeof row.technology === "string") params.set("technologies", row.technology);
  if (typeof row.location === "string") params.set("locations", row.location);
  if (typeof row.country === "string") params.set("countriesAllowed", row.country);
  if (typeof row.remoteType === "string") params.set("remoteType", row.remoteType);
  if (typeof row.sourceGroup === "string") params.set("sourceGroups", row.sourceGroup);
  if (typeof row.seniority === "string") params.set("seniority", row.seniority);
  if (typeof row.currency === "string") params.set("currency", row.currency);
  const rowMoneyPeriod = moneyDimensionFilterValue("period", row.period);
  const rowMoneyKind = moneyDimensionFilterValue("kind", row.kind);
  if (rowMoneyPeriod) params.set("moneyPeriod", rowMoneyPeriod);
  if (rowMoneyKind) params.set("moneyKind", rowMoneyKind);
  if (filters.includeClosed) params.set("status", "Active,Closed,Expired,Removed,Unknown");
  if (typeof row.status === "string") {
    if (["Active", "Closed", "Expired", "Removed", "Unknown"].includes(row.status))
      params.set("status", row.status);
    else if (CANONICAL_PIPELINE_STATUSES.has(row.status as never) || row.status === "Shortlisted")
      params.set("pipelineStatuses", row.status);
  }
  if (typeof row.counterpart === "string") params.set("counterpart", row.counterpart);
  if (typeof row.role === "string") params.set("role", row.role);
  const route = type ? OPPORTUNITY_ROUTES[type] : "/opportunities";
  const query = params.toString();
  return query ? `${route}?${query}` : route;
}

/** Activity is grouped by first stage reached, independent of when the record arrived. */
export function buildPersonalEventDrilldown(
  filters: AnalyticsFilters,
  statuses: string,
  row: AnalyticsRow = {}
): string {
  const url = new URL(
    buildOpportunityDrilldown({ ...filters, scope: "personal" }, row),
    "http://localhost"
  );
  url.searchParams.delete("firstSeenFrom");
  url.searchParams.delete("firstSeenTo");
  url.searchParams.delete("pipelineStatuses");
  url.searchParams.set("pipelineReachedStatuses", statuses);
  const from = normalizeCustomDate(filters.from, "from");
  const to = normalizeCustomDate(filters.to, "to");
  if (from) url.searchParams.set("pipelineReachedFrom", from);
  if (to) url.searchParams.set("pipelineReachedTo", to);
  return `${url.pathname}?${url.searchParams}`;
}

export function buildActivityTimeseriesDrilldown(
  filters: AnalyticsFilters,
  row: AnalyticsRow,
  series: string
): string {
  const bucket = String(row.bucket ?? row.date ?? "");
  const periodUrl = new URL(buildTimeseriesDrilldown(filters, bucket), "http://localhost");
  const period = {
    ...filters,
    from:
      typeof row.from === "string"
        ? row.from
        : (periodUrl.searchParams.get("firstSeenFrom") ?? filters.from),
    to:
      typeof row.to === "string"
        ? row.to
        : (periodUrl.searchParams.get("firstSeenTo") ?? filters.to)
  };
  const statuses: Record<string, string> = {
    responses: "Applied",
    replies: "Interview,Offer,Won",
    interviews: "Interview",
    wins: "Won"
  };
  if (statuses[series]) return buildPersonalEventDrilldown(period, statuses[series]);
  return typeof row.from === "string" && typeof row.to === "string"
    ? buildOpportunityDrilldown({ ...period, period: "custom" })
    : buildTimeseriesDrilldown(period, bucket);
}

export function buildTimeseriesDrilldown(filters: AnalyticsFilters, bucket: string): string {
  const url = new URL(buildOpportunityDrilldown(filters), "http://localhost");
  const params = url.searchParams;
  let from: string | undefined;
  let to: string | undefined;
  if (/^\d{4}-\d{2}$/.test(bucket)) {
    const [year, month] = bucket.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    from = `${bucket}-01T00:00:00.000Z`;
    to = `${bucket}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`;
  } else if (isDateOnly(bucket)) {
    from = `${bucket}T00:00:00.000Z`;
    to = `${bucket}T23:59:59.999Z`;
  }
  const rangeFrom = params.get("firstSeenFrom");
  const rangeTo = params.get("firstSeenTo");
  if (from)
    params.set(
      "firstSeenFrom",
      rangeFrom && +new Date(rangeFrom) > +new Date(from) ? rangeFrom : from
    );
  if (to) params.set("firstSeenTo", rangeTo && +new Date(rangeTo) < +new Date(to) ? rangeTo : to);
  const query = params.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

export function periodLabels(locale: AnalyticsLocale = "ru"): Record<AnalyticsPeriod, string> {
  return locale === "en" ? PERIOD_LABELS_EN : PERIOD_LABELS;
}

export function typeLabels(
  locale: AnalyticsLocale = "ru"
): Record<AnalyticsOpportunityType, string> {
  return locale === "en" ? TYPE_LABELS_EN : TYPE_LABELS;
}

export function kpiLabel(key: string, locale: AnalyticsLocale = "ru"): string {
  return (locale === "en" ? KPI_LABELS_EN : KPI_LABELS)[key] ?? columnLabel(key, locale);
}

export function columnLabel(key: string, locale: AnalyticsLocale = "ru"): string {
  return (locale === "en" ? COLUMN_LABELS_EN : COLUMN_LABELS)[key] ?? key;
}

export function seriesLabel(key: string, locale: AnalyticsLocale = "ru"): string {
  return (locale === "en" ? SERIES_LABELS_EN : SERIES_LABELS)[key] ?? columnLabel(key, locale);
}

export function formatMetric(key: string, value: unknown, locale: AnalyticsLocale = "ru"): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && value.trim().toLowerCase() === "unknown")
    return locale === "en" ? "Unspecified" : "Не указан";
  const dimensionLabels: Record<string, Record<string, [string, string]>> = {
    remoteType: {
      remote: ["Удалённо", "Remote"],
      hybrid: ["Гибрид", "Hybrid"],
      office: ["Офис", "Office"]
    },
    period: {
      month: ["Месяц", "Month"],
      year: ["Год", "Year"],
      hour: ["Час", "Hour"],
      day: ["День", "Day"],
      week: ["Неделя", "Week"],
      project: ["Проект", "Project"]
    },
    kind: {
      salary: ["Зарплата", "Salary"],
      budget: ["Бюджет", "Budget"],
      rate: ["Ставка", "Rate"],
      gross: ["До вычетов", "Gross"],
      net: ["После вычетов", "Net"]
    },
    sourceGroup: {
      web: ["Площадки", "Web platforms"],
      telegram: ["Telegram", "Telegram"],
      vk: ["VK", "VK"]
    },
    group: {
      web: ["Площадки", "Web platforms"],
      telegram: ["Telegram", "Telegram"],
      vk: ["VK", "VK"]
    }
  };
  const aliasValue =
    typeof value === "string" ? value.trim().toLowerCase().replace("hourly", "hour") : undefined;
  if (typeof value === "string" && dimensionLabels[key]?.[aliasValue ?? value])
    return dimensionLabels[key][aliasValue ?? value][locale === "en" ? 1 : 0];
  if (key.toLowerCase().includes("rate") || key.toLowerCase().includes("coverage"))
    return `${value}%`;
  if (key.toLowerCase().includes("score")) return `${value}`;
  if (typeof value === "number")
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", {
      maximumFractionDigits: 1
    }).format(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value))
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
      dateStyle: "medium"
    }).format(new Date(value));
  if (key === "type" && typeof value === "string" && value in TYPE_LABELS)
    return typeLabels(locale)[value as AnalyticsOpportunityType];
  if (key === "status" && typeof value === "string") {
    const labels: Record<string, [string, string]> = {
      New: ["Новые", "New"],
      Reviewed: ["Просмотрены", "Reviewed"],
      Interested: ["Интересно", "Interested"],
      Shortlisted: ["В списке", "Shortlisted"],
      Applied: ["Отклики", "Applied"],
      HRReply: ["Ответ HR", "HR reply"],
      Interview: ["Интервью", "Interview"],
      TechnicalInterview: ["Техническое интервью", "Technical interview"],
      Offer: ["Предложения", "Offers"],
      ResponseSent: ["Предложение отправлено", "Response sent"],
      ClientReplied: ["Ответ клиента", "Client replied"],
      Negotiation: ["Переговоры", "Negotiation"],
      Won: ["Успех", "Won"],
      InProgress: ["В работе", "In progress"],
      Completed: ["Завершено", "Completed"],
      Lost: ["Проиграно", "Lost"],
      PreparingApplication: ["Готовим заявку", "Preparing application"],
      ApplicationSubmitted: ["Заявка подана", "Application submitted"],
      Admitted: ["Допущены", "Admitted"],
      BiddingEvaluation: ["Торги / оценка", "Bidding / evaluation"],
      Contracting: ["Контрактование", "Contracting"],
      Rejected: ["Отказы", "Rejected"],
      Archived: ["Архив", "Archived"],
      Active: ["Активные", "Active"],
      Closed: ["Закрытые", "Closed"],
      Expired: ["Истекшие", "Expired"],
      Removed: ["Удалённые", "Removed"],
      Unknown: ["Неизвестен", "Unknown"]
    };
    if (labels[value]) return labels[value][locale === "en" ? 1 : 0];
  }
  if (locale === "en" && typeof value === "string") {
    const labels: Record<string, string> = {
      "Ручной импорт": "Manual import",
      "Малая выборка": "Small sample",
      "Есть успешные исходы": "Successful outcomes",
      "Без успешных исходов": "No successful outcomes",
      Свежий: "Fresh",
      Устаревший: "Stale",
      Неизвестно: "Unknown"
    };
    if (labels[value]) return labels[value];
  }
  return String(value);
}

export function rowLabel(
  row: AnalyticsRow,
  keys: string[],
  locale: AnalyticsLocale = "ru"
): string {
  const key = keys.find((item) => typeof row[item] === "string" || typeof row[item] === "number");
  return key ? formatMetric(key, row[key], locale) : "—";
}

export function chartRows(
  rows: AnalyticsRow[],
  labelKeys: string[],
  valueKey = "count",
  locale: AnalyticsLocale = "ru",
  includeZeros = false
) {
  return rows
    .map((row) => ({
      ...row,
      name: rowLabel(row, labelKeys, locale),
      count: Number(row[valueKey] ?? 0)
    }))
    .filter((row) => Number.isFinite(row.count) && (includeZeros ? row.count >= 0 : row.count > 0))
    .slice(0, 14);
}

export function analyticsExportName(kind: AnalyticsKind): string {
  return kind === "personal" ? "personal-analytics.csv" : "market-analytics.csv";
}
