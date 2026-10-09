export type AiDraft = { language: "ru" | "en"; userPreferences: string; customPrompt: string };
export type DraftHistoryRequest = { originHref: string; delta: number };

function storage(): Storage | undefined {
  try { return typeof window === "undefined" ? undefined : window.sessionStorage; } catch { return undefined; }
}

function key(ownerId: string, kind: string) { return `intly:settings:${ownerId}:${kind}`; }
function validDraft(value: unknown): value is AiDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as AiDraft;
  return ["ru", "en"].includes(draft.language) && typeof draft.userPreferences === "string" && draft.userPreferences.length <= 8000 && typeof draft.customPrompt === "string" && draft.customPrompt.length <= 8000;
}

export function readAiDraft(ownerId: string, source = storage()): { draft: AiDraft; baseline: AiDraft } | null {
  try {
    const value = JSON.parse(source?.getItem(key(ownerId, "ai-draft")) ?? "null");
    return validDraft(value?.draft) && validDraft(value?.baseline) ? value : null;
  } catch { return null; }
}

export function writeAiDraft(ownerId: string, draft: AiDraft, baseline: AiDraft, source = storage()) {
  try {
    if (JSON.stringify(draft) === JSON.stringify(baseline)) source?.removeItem(key(ownerId, "ai-draft"));
    else source?.setItem(key(ownerId, "ai-draft"), JSON.stringify({ draft, baseline }));
  } catch { /* The editor and beforeunload protection still work if storage is unavailable. */ }
}

export function clearAiDraft(ownerId: string, source = storage()) {
  try { source?.removeItem(key(ownerId, "ai-draft")); } catch { /* Unavailable session storage. */ }
}

export function writeDraftHistoryRequest(ownerId: string, request: DraftHistoryRequest, source = storage()) {
  try { source?.setItem(key(ownerId, "ai-history"), JSON.stringify(request)); } catch { /* In-document guard remains active. */ }
}

export function readDraftHistoryRequest(ownerId: string, source = storage()): DraftHistoryRequest | null {
  try {
    const request = JSON.parse(source?.getItem(key(ownerId, "ai-history")) ?? "null");
    return typeof request?.originHref === "string" && Number.isInteger(request.delta) && request.delta !== 0 ? request : null;
  } catch { return null; }
}

export function clearDraftHistoryRequest(ownerId: string, source = storage()) {
  try { source?.removeItem(key(ownerId, "ai-history")); } catch { /* Unavailable session storage. */ }
}
