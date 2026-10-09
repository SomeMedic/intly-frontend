import type { ApiTokenScope, WebhookEvent } from "@/types";

export type SettingsLocale = "ru" | "en";

export function resolveSettingsLocale(locale?: string | null): SettingsLocale {
  return locale === "en" ? "en" : "ru";
}

export const notificationChannelLabels: Record<SettingsLocale, Record<"inApp" | "email" | "telegram", string>> = {
  ru: { inApp: "В приложении", email: "Email", telegram: "Telegram" },
  en: { inApp: "In app", email: "Email", telegram: "Telegram" }
};

export const digestModeLabels: Record<SettingsLocale, Record<"instant" | "daily" | "weekly", string>> = {
  ru: { instant: "Сразу", daily: "Ежедневно", weekly: "Еженедельно" },
  en: { instant: "Instant", daily: "Daily", weekly: "Weekly" }
};

export const densityLabels: Record<SettingsLocale, Record<"compact" | "comfortable", string>> = {
  ru: { compact: "Компактная", comfortable: "Свободная" },
  en: { compact: "Compact", comfortable: "Comfortable" }
};

export const booleanStatusLabels: Record<SettingsLocale, Record<"enabled" | "disabled" | "linked" | "notLinked", string>> = {
  ru: { enabled: "Включено", disabled: "Выключено", linked: "Подключён", notLinked: "Не подключён" },
  en: { enabled: "Enabled", disabled: "Disabled", linked: "Linked", notLinked: "Not linked" }
};

export const deliveryStatusLabels: Record<SettingsLocale, Record<string, string>> = {
  ru: { sent: "Отправлено", failed: "Ошибка", pending: "В очереди", queued: "В очереди" },
  en: { sent: "Sent", failed: "Failed", pending: "Queued", queued: "Queued" }
};

export const webhookEventLabels: Record<SettingsLocale, Record<WebhookEvent, string>> = {
  ru: {
    "opportunity.created": "Возможность создана",
    "opportunity.updated": "Возможность обновлена",
    "response.submitted": "Отклик отправлен",
    "resume.ready": "Резюме готово",
    "notification.created": "Уведомление создано",
    test: "Тестовое событие"
  },
  en: {
    "opportunity.created": "Opportunity created",
    "opportunity.updated": "Opportunity updated",
    "response.submitted": "Response submitted",
    "resume.ready": "Resume ready",
    "notification.created": "Notification created",
    test: "Test event"
  }
};

export const apiTokenScopeLabels: Record<SettingsLocale, Record<ApiTokenScope, string>> = {
  ru: {
    "read:opportunities": "Читать возможности",
    "read:profiles": "Читать профили",
    "read:responses": "Читать отклики",
    "read:resumes": "Читать резюме",
    "write:responses": "Создавать и менять отклики",
    "write:resumes": "Создавать и менять резюме"
  },
  en: {
    "read:opportunities": "Read opportunities",
    "read:profiles": "Read profiles",
    "read:responses": "Read responses",
    "read:resumes": "Read resumes",
    "write:responses": "Create and update responses",
    "write:resumes": "Create and update resumes"
  }
};

export function formatSettingsDate(value: string | undefined, locale: SettingsLocale, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US").format(new Date(value));
}

export function webhookEventLabel(event: string, locale: SettingsLocale) {
  return webhookEventLabels[locale][event as WebhookEvent] ?? event;
}

export function apiTokenScopeLabel(scope: string, locale: SettingsLocale) {
  return apiTokenScopeLabels[locale][scope as ApiTokenScope] ?? scope;
}
