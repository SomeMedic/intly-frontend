"use client";

import { useAuth } from "@/features/auth";

export type AdminLocale = "ru" | "en";
export type Localized<T> = Record<AdminLocale, T>;

export function resolveAdminLocale(value?: string | null): AdminLocale {
  return value === "en" ? "en" : "ru";
}

export function useAdminLocale(): AdminLocale {
  const { user } = useAuth();
  return resolveAdminLocale(user?.settings.locale);
}

export function localized<T>(values: Localized<T>, locale: AdminLocale): T {
  return values[locale];
}

export const adminNavCopy: Localized<Record<"dashboard" | "users" | "sources" | "ai" | "jobs" | "infrastructure" | "issues", string>> = {
  ru: {
    dashboard: "Админка",
    users: "Пользователи",
    sources: "Источники",
    ai: "AI",
    jobs: "Очереди",
    infrastructure: "Инфраструктура",
    issues: "Обращения",
  },
  en: {
    dashboard: "Admin",
    users: "Users",
    sources: "Sources",
    ai: "AI",
    jobs: "Jobs",
    infrastructure: "Infrastructure",
    issues: "Reports",
  },
};

export const commonAdminCopy: Localized<Record<"loadingError" | "retry" | "never" | "yes" | "no" | "notTracked" | "enabled" | "off" | "created" | "lastActive", string>> = {
  ru: {
    loadingError: "Админский раздел вернул ошибку. Экран показывает только реальные данные API.",
    retry: "Повторить",
    never: "Никогда",
    yes: "Да",
    no: "Нет",
    notTracked: "Не отслеживается",
    enabled: "Включено",
    off: "Выключено",
    created: "Создан",
    lastActive: "Последняя активность",
  },
  en: {
    loadingError: "The admin endpoint returned an error. This screen only uses real API data.",
    retry: "Retry",
    never: "Never",
    yes: "Yes",
    no: "No",
    notTracked: "Not tracked",
    enabled: "Enabled",
    off: "Off",
    created: "Created",
    lastActive: "Last active",
  },
};
