import type { AdminLocale } from "./admin-locale";

export function durationLabel(milliseconds: unknown, locale: AdminLocale): string {
  if (typeof milliseconds !== "number" || !Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) return `${seconds} ${locale === "ru" ? "с" : "s"}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${locale === "ru" ? "мин" : "min"} ${seconds % 60} ${locale === "ru" ? "с" : "s"}`;
  return `${Math.floor(minutes / 60)} ${locale === "ru" ? "ч" : "h"} ${minutes % 60} ${locale === "ru" ? "мин" : "min"}`;
}

export function storageLabel(bytes: unknown, locale: AdminLocale): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return "—";
  const units = locale === "ru" ? ["Б", "КиБ", "МиБ", "ГиБ", "ТиБ"] : ["B", "KiB", "MiB", "GiB", "TiB"];
  const unit = bytes === 0 ? 0 : Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** unit).toLocaleString(locale, { maximumFractionDigits: 1 })} ${units[unit]}`;
}

export function infrastructureState(value: string | undefined, locale: AdminLocale): string {
  const states: Record<string, [string, string]> = {
    operational: ["Сервисы доступны", "Services available"], healthy: ["Доступен", "Available"],
    degraded: ["Есть проблемы", "Degraded"], issue: ["Сбой", "Incident"], unavailable: ["Недоступен", "Unavailable"],
    unconfigured: ["Не настроено", "Not configured"], configured: ["Настроено", "Configured"],
    unknown: ["Не проверено", "Not verified"], available: ["Доступно", "Available"],
    Running: ["В работе", "Running"], Succeeded: ["Готово", "Succeeded"], Failed: ["Ошибка", "Failed"],
    active: ["В работе", "Running"], waiting: ["В очереди", "Waiting"], delayed: ["Ожидает повтора", "Retry scheduled"],
    completed: ["Готово", "Completed"], failed: ["Ошибка", "Failed"], paused: ["На паузе", "Paused"],
    queued: ["В очереди", "Waiting"], running: ["В работе", "Running"], succeeded: ["Готово", "Completed"],
  };
  const pair = states[value ?? "unknown"];
  return pair ? pair[locale === "ru" ? 0 : 1] : value ?? "—";
}

export function progressRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function progressPercentage(value: unknown): number | undefined {
  const record = progressRecord(value);
  const percent = typeof value === "number" ? value : record.percent ?? record.percentage;
  if (typeof percent === "number" && Number.isFinite(percent)) return Math.max(0, Math.min(100, percent));
  return typeof record.processed === "number" && Number.isFinite(record.processed) && record.processed >= 0 && typeof record.total === "number" && Number.isFinite(record.total) && record.total > 0 ? Math.min(100, record.processed / record.total * 100) : undefined;
}

export function rebuildStageLabel(value: unknown, locale: AdminLocale): string {
  const labels: Record<string, [string, string]> = {
    queued: ["Ожидает запуска", "Waiting to start"], running: ["Подготовка", "Preparing"],
    preparing: ["Подготовка индекса", "Preparing index"], indexing: ["Индексирование документов", "Indexing documents"],
    replaying: ["Синхронизация изменений", "Synchronizing changes"],
    "replaying-journal": ["Синхронизация изменений", "Synchronizing changes"],
    indexed: ["Индекс подготовлен", "Index ready"],
    "ensuring-live-indexes": ["Проверка рабочих индексов", "Checking live indexes"],
    "draining-search-writers": ["Завершение текущих обновлений", "Finishing current updates"],
    "reconciling-swap": ["Проверка переключения индексов", "Checking index switch"],
    "submitting-swap": ["Запуск переключения индексов", "Submitting index switch"],
    "waiting-swap": ["Ожидание переключения индексов", "Waiting for index switch"],
    "waiting-recorded-swap": ["Проверка начатого переключения", "Checking recorded index switch"],
    "swap-resolution-failed": ["Ошибка проверки переключения", "Index switch check failed"],
    "swap-submit-unknown": ["Результат переключения требует проверки", "Index switch requires verification"],
    swapping: ["Переключение индексов", "Switching indexes"], cleanup: ["Завершение операции", "Finishing operation"],
    completed: ["Пересборка завершена", "Rebuild completed"], failed: ["Пересборка остановлена с ошибкой", "Rebuild failed"],
  };
  if (typeof value !== "string") return "—";
  const pair = labels[value.split(":")[0]];
  return pair ? pair[locale === "ru" ? 0 : 1] : value;
}
