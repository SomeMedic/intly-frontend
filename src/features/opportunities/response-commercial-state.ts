import type { OpportunityLocale } from "./opportunity-workspace-labels";

export type CommercialMode = "fixed" | "hourly";

export type ResponseCommercialFieldsValue = {
  mode?: CommercialMode;
  price?: string;
  rate?: string;
  hours?: string;
  duration?: string;
};

export type ResponseCommercialDraft = Required<ResponseCommercialFieldsValue> & { mode: CommercialMode };
export type ResponseCommercialInsertValue = ResponseCommercialDraft & { text: string };

export function commercialDraftFromInitial(initial: ResponseCommercialFieldsValue | null | undefined): ResponseCommercialDraft {
  const price = clean(initial?.price);
  const rate = clean(initial?.rate);
  return {
    mode: resolveCommercialMode(initial?.mode, price, rate),
    price,
    rate,
    hours: clean(initial?.hours),
    duration: clean(initial?.duration),
  };
}

export function updateCommercialDraft(base: ResponseCommercialDraft, patch: Partial<ResponseCommercialFieldsValue>): ResponseCommercialDraft {
  return {
    ...base,
    ...patch,
    mode: patch.mode === "hourly" ? "hourly" : patch.mode === "fixed" ? "fixed" : base.mode,
    price: patch.price === undefined ? base.price : patch.price,
    rate: patch.rate === undefined ? base.rate : patch.rate,
    hours: patch.hours === undefined ? base.hours : patch.hours,
    duration: patch.duration === undefined ? base.duration : patch.duration,
  };
}

export function commercialInsertValue(value: ResponseCommercialFieldsValue, locale: OpportunityLocale): ResponseCommercialInsertValue | null {
  const draft = commercialDraftFromInitial(value);
  const text = commercialText(draft, locale);
  return text ? { ...draft, text } : null;
}

export function commercialText(value: ResponseCommercialFieldsValue, locale: OpportunityLocale) {
  const draft = commercialDraftFromInitial(value);
  const activePayment = draft.mode === "hourly" ? draft.rate : draft.price;
  const activeValues = [activePayment, draft.hours, draft.duration].filter(Boolean);
  if (!activeValues.length) return "";
  const estimatedHours = formatEstimatedHours(draft.hours, locale);

  const lines = [
    locale === "en" ? `Pricing model: ${draft.mode === "hourly" ? "hourly" : "fixed"}.` : `Модель оплаты: ${draft.mode === "hourly" ? "почасовая" : "фиксированная"}.`,
    draft.mode === "fixed" && draft.price ? (locale === "en" ? `Project price: ${draft.price}.` : `Стоимость проекта: ${draft.price}.`) : "",
    draft.mode === "hourly" && draft.rate ? (locale === "en" ? `Rate: ${draft.rate}.` : `Ставка: ${draft.rate}.`) : "",
    estimatedHours ? (locale === "en" ? `Estimated effort: ${estimatedHours}.` : `Оценка трудозатрат: ${estimatedHours}.`) : "",
    draft.duration ? (locale === "en" ? `Timeline: ${draft.duration}.` : `Срок: ${draft.duration}.`) : "",
  ].filter(Boolean);
  return lines.join(" ");
}

export function commercialFieldsFromAnalysis(output: Record<string, unknown> | undefined): ResponseCommercialFieldsValue | null {
  if (!output) return null;
  const typeSpecific = recordValue(output.typeSpecific);
  const commercial = recordValue(typeSpecific?.commercial) ?? recordValue(output.commercial) ?? recordValue(output.commercialTerms);
  if (!commercial) return null;

  const modeValue = stringValue(commercial.pricingModel ?? commercial.fixedVsHourly ?? commercial.mode).toLowerCase();
  const mode: ResponseCommercialFieldsValue["mode"] = modeValue.includes("hour") || modeValue.includes("почас") ? "hourly" : modeValue.includes("fixed") || modeValue.includes("фикс") ? "fixed" : undefined;
  const price = stringValue(commercial.recommendedPrice ?? commercial.price ?? commercial.fixedPrice ?? commercial.projectPrice ?? commercial.totalPrice ?? commercial.budget);
  const rate = stringValue(commercial.recommendedRate ?? commercial.rate ?? commercial.hourlyRate);
  const hours = stringValue(commercial.estimatedHours ?? commercial.hours);
  const duration = stringValue(commercial.estimatedDuration ?? commercial.duration ?? commercial.timeline);
  const hasCommercialDetails = Boolean(mode || price || rate || hours || duration);
  const value = {
    mode: hasCommercialDetails ? resolveCommercialMode(mode, price, rate) : undefined,
    price,
    rate,
    hours,
    duration,
  };
  return value.mode || value.price || value.rate || value.hours || value.duration ? value : null;
}

function clean(value: string | undefined) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function resolveCommercialMode(mode: ResponseCommercialFieldsValue["mode"], price: string, rate: string): CommercialMode {
  if (mode === "hourly") return "hourly";
  if (mode === "fixed") return "fixed";
  return rate && !price ? "hourly" : "fixed";
}

function formatEstimatedHours(hours: string, locale: OpportunityLocale) {
  return /^\d+(?:[.,]\d+)?$/.test(hours) ? `${hours} ${locale === "en" ? "h" : "ч"}` : hours;
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return stringValue(record.title ?? record.text ?? record.label ?? record.value ?? record.summary ?? record.evidence);
  }
  return "";
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
