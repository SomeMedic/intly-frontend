export type PinnedContextFact = {
  id: string;
  label: string;
  text: string;
  source: "opportunity" | "profile" | "analysis";
};

export type ResponseContextScope = {
  ownerId?: string | null;
  opportunityId: string;
  profileId?: string | null;
  draftId?: string | null;
};

export type ContextRailSectionId = "opportunity" | "requirements" | "profile" | "insights";

const PIN_STORAGE_PREFIX = "intly:response-context:pins";
const COLLAPSE_STORAGE_PREFIX = "intly:response-context:collapse";
const MAX_PINNED_FACTS = 20;
const MAX_ID_LENGTH = 160;
const MAX_LABEL_LENGTH = 120;
const MAX_TEXT_LENGTH = 1200;
const SECTION_IDS: ContextRailSectionId[] = ["opportunity", "requirements", "profile", "insights"];

export const DEFAULT_CONTEXT_SECTION_STATE: Record<ContextRailSectionId, boolean> = {
  opportunity: true,
  requirements: true,
  profile: true,
  insights: true,
};

export function responseContextPinsKey(scope: ResponseContextScope) {
  return [
    PIN_STORAGE_PREFIX,
    safeKeyPart(scope.ownerId || "anonymous"),
    safeKeyPart(scope.profileId || "no-profile"),
    safeKeyPart(scope.draftId || "no-draft"),
    safeKeyPart(scope.opportunityId),
  ].join(":");
}

export function responseContextCollapseKey(scope: ResponseContextScope) {
  return [
    COLLAPSE_STORAGE_PREFIX,
    safeKeyPart(scope.ownerId || "anonymous"),
    safeKeyPart(scope.profileId || "no-profile"),
    safeKeyPart(scope.draftId || "no-draft"),
    safeKeyPart(scope.opportunityId),
  ].join(":");
}

export function normalizePinnedContextFacts(value: unknown): PinnedContextFact[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const facts: PinnedContextFact[] = [];
  for (const item of value) {
    const fact = normalizePinnedContextFact(item);
    if (!fact) continue;
    const key = `${fact.source}:${fact.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    facts.push(fact);
    if (facts.length >= MAX_PINNED_FACTS) break;
  }
  return facts;
}

export function pinContextFact(current: unknown, fact: PinnedContextFact): PinnedContextFact[] {
  const normalized = normalizePinnedContextFact(fact);
  if (!normalized) return normalizePinnedContextFacts(current);
  const rest = normalizePinnedContextFacts(current).filter(
    (item) => item.id !== normalized.id || item.source !== normalized.source
  );
  return [normalized, ...rest].slice(0, MAX_PINNED_FACTS);
}

export function unpinContextFact(current: unknown, fact: Pick<PinnedContextFact, "id" | "source">): PinnedContextFact[] {
  return normalizePinnedContextFacts(current).filter((item) => item.id !== fact.id || item.source !== fact.source);
}

export function readPinnedContextFacts(storage: Storage | undefined | null, scope: ResponseContextScope): PinnedContextFact[] {
  if (!storage) return [];
  try {
    return normalizePinnedContextFacts(JSON.parse(storage.getItem(responseContextPinsKey(scope)) || "[]"));
  } catch {
    return [];
  }
}

export function writePinnedContextFacts(storage: Storage | undefined | null, scope: ResponseContextScope, facts: unknown) {
  if (!storage) return;
  try {
    storage.setItem(responseContextPinsKey(scope), JSON.stringify(normalizePinnedContextFacts(facts)));
  } catch {
    // Storage can be disabled or full; pins are non-critical editor-session state.
  }
}

export function readContextSectionState(storage: Storage | undefined | null, scope: ResponseContextScope) {
  if (!storage) return DEFAULT_CONTEXT_SECTION_STATE;
  try {
    const parsed = JSON.parse(storage.getItem(responseContextCollapseKey(scope)) || "{}");
    return normalizeContextSectionState(parsed);
  } catch {
    return DEFAULT_CONTEXT_SECTION_STATE;
  }
}

export function writeContextSectionState(
  storage: Storage | undefined | null,
  scope: ResponseContextScope,
  state: Record<ContextRailSectionId, boolean>
) {
  if (!storage) return;
  try {
    storage.setItem(responseContextCollapseKey(scope), JSON.stringify(normalizeContextSectionState(state)));
  } catch {
    // Collapse state is session convenience only.
  }
}

export function normalizeContextSectionState(value: unknown): Record<ContextRailSectionId, boolean> {
  const result = { ...DEFAULT_CONTEXT_SECTION_STATE };
  if (!value || typeof value !== "object") return result;
  const record = value as Record<string, unknown>;
  for (const id of SECTION_IDS) {
    if (typeof record[id] === "boolean") result[id] = record[id];
  }
  return result;
}

export function responsePresetInstruction(
  preset: ResponsePresetId,
  locale: "ru" | "en" = "ru"
): { label: string; instruction: string; toolHint: string } {
  return PRESETS[locale][preset] ?? PRESETS.ru[preset];
}

export const RESPONSE_PRESET_IDS = [
  "shorter",
  "technical",
  "formal",
  "confident",
  "removeFluff",
  "experience",
  "opening",
  "closing",
  "chat",
] as const;

export type ResponsePresetId = (typeof RESPONSE_PRESET_IDS)[number];

const PRESETS: Record<"ru" | "en", Record<ResponsePresetId, { label: string; instruction: string; toolHint: string }>> = {
  ru: {
    shorter: { label: "Короче", instruction: "Сделай текст короче, сохранив конкретику и важные факты.", toolHint: "shortenBlock" },
    technical: { label: "Технически", instruction: "Сделай формулировку более технической и точной без выдуманных технологий.", toolHint: "changeTone" },
    formal: { label: "Формальнее", instruction: "Перепиши в более формальном деловом тоне.", toolHint: "changeTone" },
    confident: { label: "Увереннее", instruction: "Сделай тон увереннее, не добавляя неподтверждённых обещаний.", toolHint: "changeTone" },
    removeFluff: { label: "Без воды", instruction: "Убери общие фразы и оставь проверяемую пользу для заказчика или работодателя.", toolHint: "rewriteSelection" },
    experience: { label: "Опыт", instruction: "Усиль текст релевантным опытом из профиля и закреплённых фактов.", toolHint: "emphasizeFact" },
    opening: { label: "Вступление", instruction: "Усиль вступление: сразу покажи релевантность и причину отклика.", toolHint: "replaceBlock" },
    closing: { label: "Финал", instruction: "Усиль финальный абзац: добавь ясный следующий шаг без давления.", toolHint: "replaceBlock" },
    chat: { label: "Для чата", instruction: "Сделай текст компактным и естественным для сообщения в чате.", toolHint: "rewriteSelection" },
  },
  en: {
    shorter: { label: "Shorter", instruction: "Make the text shorter while preserving concrete facts and important details.", toolHint: "shortenBlock" },
    technical: { label: "Technical", instruction: "Make the wording more technical and precise without inventing technologies.", toolHint: "changeTone" },
    formal: { label: "Formal", instruction: "Rewrite in a more formal business tone.", toolHint: "changeTone" },
    confident: { label: "Confident", instruction: "Make the tone more confident without adding unsupported promises.", toolHint: "changeTone" },
    removeFluff: { label: "No fluff", instruction: "Remove generic phrasing and keep verifiable value for the client or employer.", toolHint: "rewriteSelection" },
    experience: { label: "Experience", instruction: "Strengthen the text with relevant experience from the profile and pinned facts.", toolHint: "emphasizeFact" },
    opening: { label: "Opening", instruction: "Strengthen the opening: show relevance and the reason for responding immediately.", toolHint: "replaceBlock" },
    closing: { label: "Closing", instruction: "Strengthen the final paragraph: add a clear next step without pressure.", toolHint: "replaceBlock" },
    chat: { label: "For chat", instruction: "Make the text compact and natural for a chat message.", toolHint: "rewriteSelection" },
  },
};

function normalizePinnedContextFact(value: unknown): PinnedContextFact | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const source = record.source;
  if (source !== "opportunity" && source !== "profile" && source !== "analysis") return null;
  const id = cleanText(record.id, MAX_ID_LENGTH);
  const label = cleanText(record.label, MAX_LABEL_LENGTH);
  const text = cleanText(record.text, MAX_TEXT_LENGTH);
  if (!id || !label || !text) return null;
  return { id, label, text, source };
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function safeKeyPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "empty";
}
