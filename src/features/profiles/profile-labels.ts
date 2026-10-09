import { DEFAULT_WEIGHTS } from "./contracts";

export type ProfileLocale = "ru" | "en";

export function resolveProfileLocale(locale?: string | null): ProfileLocale {
  return locale === "en" ? "en" : "ru";
}

export const profileKindLabels: Record<ProfileLocale, Record<string, string>> = {
  ru: { career: "Карьера", freelance: "Фриланс", mixed: "Смешанный" },
  en: { career: "Career", freelance: "Freelance", mixed: "Mixed" }
};

export const profileWeightLabels: Record<ProfileLocale, Record<keyof typeof DEFAULT_WEIGHTS, string>> = {
  ru: { skills: "Навыки", seniority: "Уровень", money: "Доход", remoteLocation: "Формат и география", employment: "Занятость", freshness: "Свежесть", source: "Источники" },
  en: { skills: "Skills", seniority: "Seniority", money: "Compensation", remoteLocation: "Format and geography", employment: "Employment", freshness: "Freshness", source: "Sources" }
};

export const profileSourceHealthLabels: Record<ProfileLocale, Record<string, string>> = {
  ru: { Healthy: "здоров", Degraded: "нестабилен", Failed: "ошибка", Disabled: "отключён" },
  en: { Healthy: "healthy", Degraded: "degraded", Failed: "failed", Disabled: "disabled" }
};

export const profileSeniorityLabels: Record<ProfileLocale, Record<string, string>> = {
  ru: { intern: "Стажёр", junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead", principal: "Principal" },
  en: { intern: "Intern", junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead", principal: "Principal" }
};

export const profileRemoteLabels: Record<ProfileLocale, Record<string, string>> = {
  ru: { remote: "Удалённо", hybrid: "Гибрид", office: "Офис" },
  en: { remote: "Remote", hybrid: "Hybrid", office: "Office" }
};

export const profilePeriodLabels: Record<ProfileLocale, Record<string, string>> = {
  ru: { month: "месяц", hour: "час", project: "проект" },
  en: { month: "month", hour: "hour", project: "project" }
};

export function selectedSourcesLabel(selected: number, total: number | undefined, locale: ProfileLocale) {
  const formatter = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US");
  const totalLabel = total === undefined ? "…" : formatter.format(total);
  if (locale === "en") return `${formatter.format(selected)} selected out of ${totalLabel}. If none are selected, the whole shared corpus is used.`;
  return `Выбрано ${formatter.format(selected)} из ${totalLabel}. Без выбора используется весь общий корпус.`;
}

