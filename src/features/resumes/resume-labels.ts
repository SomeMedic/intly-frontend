import type { ResumeAdaptationStatus, ResumeKind, ResumeStatus, SuggestionStatus } from "./contracts";

export type ResumeLocale = "ru" | "en";

export function resolveResumeLocale(locale?: string | null): ResumeLocale {
  return locale === "en" ? "en" : "ru";
}

export const adaptationStatusLabels: Record<ResumeLocale, Record<ResumeAdaptationStatus, string>> = {
  ru: {
    generating: "Генерация",
    review: "Проверка",
    editing: "Редактирование",
    ready: "Готово",
    exported: "Экспортировано",
    failed: "Ошибка"
  },
  en: {
    generating: "Generating",
    review: "Review",
    editing: "Editing",
    ready: "Ready",
    exported: "Exported",
    failed: "Failed"
  }
};

export const resumeStatusLabels: Record<ResumeLocale, Record<ResumeStatus, string>> = {
  ru: {
    draft: "Черновик",
    ready: "Готово",
    archived: "Архив"
  },
  en: {
    draft: "Draft",
    ready: "Ready",
    archived: "Archived"
  }
};

export const resumeKindLabels: Record<ResumeLocale, Record<ResumeKind, string>> = {
  ru: {
    base: "Базовое",
    adapted: "Адаптация"
  },
  en: {
    base: "Base",
    adapted: "Adaptation"
  }
};

export const suggestionStatusLabels: Record<ResumeLocale, Record<SuggestionStatus, string>> = {
  ru: {
    pending: "На проверке",
    accepted: "Принято",
    rejected: "Отклонено"
  },
  en: {
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected"
  }
};

export function pendingSuggestionLabel(count: number, locale: ResumeLocale = "ru") {
  if (locale === "en") return `${formatResumeNumber(count, locale)} ${count === 1 ? "pending suggestion" : "pending suggestions"}`;
  const lastTwo = count % 100;
  const last = count % 10;
  const form = lastTwo >= 11 && lastTwo <= 14 ? "предложений на проверке" : last === 1 ? "предложение на проверке" : last >= 2 && last <= 4 ? "предложения на проверке" : "предложений на проверке";
  return `${formatResumeNumber(count, locale)} ${form}`;
}

export function formatResumeNumber(value: number, locale: ResumeLocale = "ru") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", { maximumFractionDigits: 1 }).format(value);
}

export function adaptationFailureLabel(errorSummary: unknown, locale: ResumeLocale = "ru"): string {
  const summary = typeof errorSummary === "string" ? errorSummary.toLowerCase() : "";
  if (/no ai route configured|not configured|missing.*(key|credential)|api.?key.*(missing|required)/.test(summary)) {
    return locale === "en"
      ? "AI for resume adaptation is not connected yet. Ask an administrator to set it up, then try again."
      : "AI для адаптации резюме пока не подключён. Попросите администратора настроить его и попробуйте снова.";
  }
  if (/rate.?limit|quota|too many requests/.test(summary)) {
    return locale === "en"
      ? "The AI provider's request limit has been reached. Try creating an adaptation later."
      : "Достигнут лимит запросов AI-провайдера. Попробуйте создать адаптацию позже.";
  }
  if (/timeout|timed out|unavailable|connection|fetch failed/.test(summary)) {
    return locale === "en"
      ? "The AI provider did not respond. Try creating an adaptation again later."
      : "AI-провайдер не ответил. Попробуйте создать адаптацию ещё раз позже.";
  }
  return locale === "en"
    ? "AI could not prepare this adaptation. You can edit the copy manually or create a new adaptation later."
    : "AI не смог подготовить адаптацию. Можно отредактировать копию вручную или создать новую адаптацию позже.";
}
