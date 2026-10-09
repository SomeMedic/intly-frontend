import type { AdminSource } from "@/types";
import type { AdminLocale, Localized } from "./admin-locale";

export const sourceGroupLabels: Localized<Record<string, string>> = {
  ru: {
    web: "Веб",
    telegram: "Telegram",
    vk: "VK",
  },
  en: {
    web: "Web",
    telegram: "Telegram",
    vk: "VK",
  },
};

export const healthLabels: Localized<Record<string, string>> = {
  ru: {
    Healthy: "Здоров",
    Degraded: "Деградация",
    Failed: "Ошибка",
    Disabled: "Отключён",
    Unknown: "Не проверялся",
    healthy: "Здоров",
    degraded: "Деградация",
    available: "Доступны",
    unavailable: "Недоступен",
    unconfigured: "Не настроен",
    configured: "Настроен",
    unknown: "Неизвестно",
    operational: "Работает",
    issue: "Проблема",
  },
  en: {
    Healthy: "Healthy",
    Degraded: "Degraded",
    Failed: "Failed",
    Disabled: "Disabled",
    Unknown: "Not checked",
    healthy: "Healthy",
    degraded: "Degraded",
    available: "Available",
    unavailable: "Unavailable",
    unconfigured: "Not configured",
    configured: "Configured",
    unknown: "Unknown",
    operational: "Operational",
    issue: "Issue",
  },
};

export const runtimeLabels: Localized<Record<string, string>> = {
  ru: {
    Enabled: "Включён",
    Disabled: "Отключён",
    Maintenance: "Обслуживание",
    Experimental: "Эксперимент",
    Conditional: "Условно",
  },
  en: {
    Enabled: "Enabled",
    Disabled: "Disabled",
    Maintenance: "Maintenance",
    Experimental: "Experimental",
    Conditional: "Conditional",
  },
};

export const runStatusLabels: Localized<Record<string, string>> = {
  ru: {
    Queued: "В очереди",
    Running: "Выполняется",
    Succeeded: "Успешно",
    Failed: "Ошибка",
    Cancelled: "Остановлен",
  },
  en: {
    Queued: "Queued",
    Running: "Running",
    Succeeded: "Succeeded",
    Failed: "Failed",
    Cancelled: "Cancelled",
  },
};

export const jobStateLabels: Localized<Record<string, string>> = {
  ru: {
    failed: "Ошибки",
    waiting: "Ожидают",
    active: "В работе",
    delayed: "Отложены",
    completed: "Завершены",
  },
  en: {
    failed: "Failed",
    waiting: "Waiting",
    active: "Active",
    delayed: "Delayed",
    completed: "Completed",
  },
};

export function sourceId(source: Pick<AdminSource, "id" | "_id" | "name">) {
  return source.id ?? source._id ?? source.name;
}

export function label(labels: Record<string, string>, value?: string | null) {
  if (!value) return "—";
  return labels[value] ?? value;
}

export function localizedLabel(labels: Localized<Record<string, string>>, value: string | null | undefined, locale: AdminLocale) {
  return label(labels[locale], value);
}

export function dateLabel(value?: string | Date | null, locale: AdminLocale = "ru") {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(+date)) return "—";
  return date.toLocaleString(locale === "en" ? "en-US" : "ru-RU");
}

export function secondsLabel(value?: number, locale: AdminLocale = "ru") {
  if (!value) return "—";
  if (locale === "en") {
    if (value < 60) return `${value}s`;
    if (value < 3600) return `${Math.round(value / 60)}m`;
    return `${Math.round(value / 3600)}h`;
  }
  if (value < 60) return `${value} сек`;
  if (value < 3600) return `${Math.round(value / 60)} мин`;
  return `${Math.round(value / 3600)} ч`;
}

export function boolLabel(value?: boolean, locale: AdminLocale = "ru") {
  return value ? locale === "en" ? "Yes" : "Да" : locale === "en" ? "No" : "Нет";
}

export function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  return Object.fromEntries(Object.entries(source).map(([key, item]) => [key, /token|secret|password|key|session|credential|hash/i.test(key) ? "••••••" : redactValue(item)]));
}

export function safeJson(value: unknown) {
  return JSON.stringify(redactValue(value), null, 2);
}

export function totalQueueCount(counts: Record<string, number> = {}) {
  return Object.values(counts).reduce((sum, item) => sum + Number(item || 0), 0);
}
