import { describe, expect, it } from "vitest";
import { clearAiDraft, clearDraftHistoryRequest, readAiDraft, readDraftHistoryRequest, writeAiDraft, writeDraftHistoryRequest, type AiDraft } from "./settings-drafts";

const baseline: AiDraft = { language: "ru", userPreferences: "", customPrompt: "" };
function storage() {
  const data = new Map<string, string>();
  return { get length() { return data.size; }, clear: () => data.clear(), key: (index: number) => [...data.keys()][index] ?? null, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } } satisfies Storage;
}

describe("recoverable AI preferences", () => {
  it("recovers edits after editor recreation and keeps another account isolated", () => {
    const source = storage();
    const draft = { ...baseline, customPrompt: "Consider {{profile}}" };
    writeAiDraft("owner-a", draft, baseline, source);
    expect(readAiDraft("owner-a", source)).toEqual({ draft, baseline });
    expect(readAiDraft("owner-b", source)).toBeNull();
    writeAiDraft("owner-b", { ...baseline, userPreferences: "Other user" }, baseline, source);
    clearAiDraft("owner-a", source);
    expect(readAiDraft("owner-a", source)).toBeNull();
    expect(readAiDraft("owner-b", source)?.draft.userPreferences).toBe("Other user");
  });

  it("clears a reverted draft and explicit discard without affecting the saved baseline", () => {
    const source = storage();
    writeAiDraft("owner", { ...baseline, customPrompt: "Edited" }, baseline, source);
    writeAiDraft("owner", baseline, baseline, source);
    expect(readAiDraft("owner", source)).toBeNull();
    writeAiDraft("owner", { ...baseline, customPrompt: "Edited again" }, baseline, source);
    writeDraftHistoryRequest("owner", { originHref: "http://localhost:3000/settings?tab=ai", delta: -2 }, source);
    expect(readDraftHistoryRequest("owner", source)?.delta).toBe(-2);
    clearAiDraft("owner", source);
    clearDraftHistoryRequest("owner", source);
    expect(readAiDraft("owner", source)).toBeNull();
    expect(readDraftHistoryRequest("owner", source)).toBeNull();
  });

  it("retains the original baseline for detecting conflicting remote updates", () => {
    const source = storage();
    writeAiDraft("owner", { ...baseline, customPrompt: "Local edit" }, baseline, source);
    const recovered = readAiDraft("owner", source)!;
    const remotelySaved = { ...baseline, customPrompt: "Saved on another device" };
    expect(recovered.baseline).not.toEqual(remotelySaved);
    expect(recovered.draft.customPrompt).toBe("Local edit");
  });

  it("ignores corrupt or oversized drafts and works when session storage is unavailable", () => {
    const source = storage();
    source.setItem("intly:settings:owner:ai-draft", "{");
    expect(readAiDraft("owner", source)).toBeNull();
    source.setItem("intly:settings:owner:ai-draft", JSON.stringify({ draft: { ...baseline, customPrompt: "x".repeat(8001) }, baseline }));
    expect(readAiDraft("owner", source)).toBeNull();
    const unavailable = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } } as unknown as Storage;
    expect(() => writeAiDraft("owner", baseline, baseline, unavailable)).not.toThrow();
    expect(readAiDraft("owner", unavailable)).toBeNull();
  });
});
