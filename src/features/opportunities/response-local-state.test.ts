import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import { clearPendingResponseTransform, clearResponseRecovery, readPendingResponseTransform, readResponseRecovery, writePendingResponseTransform, writeResponseRecovery, type ResponsePendingTransform, type ResponseRecoverySnapshot } from "./response-local-state";

const document = {
  type: "doc",
  content: [
    { type: "paragraph", attrs: { id: "intro" }, content: [{ type: "text", text: "Unsynced text" }] },
  ],
};

function storage() {
  const data = new Map<string, string>();
  return { get length() { return data.size; }, clear: () => data.clear(), key: (index: number) => [...data.keys()][index] ?? null, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } } satisfies Storage;
}

describe("response local recovery", () => {
  it("recovers unsynced draft JSON by owner and draft", () => {
    const source = storage();
    const snapshot: ResponseRecoverySnapshot = { document, text: "Unsynced text", baseRevision: 7, updatedAt: 1000 };
    expect(writeResponseRecovery(source, "owner-a", "draft-a", snapshot)).toBe(true);
    expect(readResponseRecovery(source, "owner-a", "draft-a")).toEqual(snapshot);
    expect(readResponseRecovery(source, "owner-b", "draft-a")).toBeNull();
    expect(readResponseRecovery(source, "owner-a", "draft-b")).toBeNull();
  });

  it("does not let an older save clear a newer local snapshot", () => {
    const source = storage();
    writeResponseRecovery(source, "owner", "draft", { document, text: "first", baseRevision: 1, updatedAt: 10 });
    writeResponseRecovery(source, "owner", "draft", { document, text: "second", baseRevision: 1, updatedAt: 20 });
    expect(clearResponseRecovery(source, "owner", "draft", 10)).toBe(false);
    expect(readResponseRecovery(source, "owner", "draft")?.text).toBe("second");
    expect(clearResponseRecovery(source, "owner", "draft", 20)).toBe(true);
    expect(readResponseRecovery(source, "owner", "draft")).toBeNull();
  });

  it("rejects corrupt oversized and unbounded draft payloads without throwing", () => {
    const source = storage();
    source.setItem("intly:response:owner:draft:recovery", "{");
    expect(readResponseRecovery(source, "owner", "draft")).toBeNull();
    const oversized = { document, text: "x".repeat(1024 * 1024 + 1), baseRevision: 1, updatedAt: 1 };
    expect(writeResponseRecovery(source, "owner", "oversized", oversized)).toBe(false);
    const deepDocument: { type: string; content: unknown[] } = { type: "doc", content: [] };
    let cursor: { type: string; content: unknown[] } = deepDocument;
    for (let index = 0; index < 45; index += 1) {
      const next = { type: "paragraph", content: [] as unknown[] };
      cursor.content = [next];
      cursor = next;
    }
    expect(writeResponseRecovery(source, "owner", "deep", { document: deepDocument as JSONContent, text: "", baseRevision: 1, updatedAt: 1 })).toBe(false);
    const unavailable = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } } as unknown as Storage;
    expect(writeResponseRecovery(unavailable, "owner", "draft", { document, text: "x", baseRevision: 1, updatedAt: 1 })).toBe(false);
    expect(readResponseRecovery(unavailable, "owner", "draft")).toBeNull();
  });
});

describe("response pending transform recovery", () => {
  it("stores and clears the pending AI transform by owner and draft", () => {
    const source = storage();
    const job: ResponsePendingTransform = {
      runId: "run-1",
      baseRevision: 4,
      localVersion: 0,
      target: { kind: "block", blockId: "intro" },
      tool: "replaceBlock",
      instruction: "Make it sharper",
      selection: { from: 1, to: 5, text: "Old" },
    };
    expect(writePendingResponseTransform(source, "owner-a", "draft-a", job)).toBe(true);
    expect(readPendingResponseTransform(source, "owner-a", "draft-a")).toEqual(job);
    expect(readPendingResponseTransform(source, "owner-b", "draft-a")).toBeNull();
    expect(clearPendingResponseTransform(source, "owner-a", "draft-a")).toBe(true);
    expect(readPendingResponseTransform(source, "owner-a", "draft-a")).toBeNull();
  });

  it("rejects malformed transform jobs and handles unavailable storage", () => {
    const source = storage();
    const invalid = { runId: "run", baseRevision: 1, localVersion: 0, target: { kind: "block", blockId: "intro" }, tool: "unknown", instruction: "x" };
    expect(writePendingResponseTransform(source, "owner", "draft", invalid as ResponsePendingTransform)).toBe(false);
    expect(readPendingResponseTransform(source, "owner", "draft")).toBeNull();
    const unavailable = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } } as unknown as Storage;
    expect(writePendingResponseTransform(unavailable, "owner", "draft", { runId: "run", baseRevision: 1, localVersion: 0, target: { kind: "document" }, tool: "replaceDocument", instruction: "Regenerate" })).toBe(false);
    expect(readPendingResponseTransform(unavailable, "owner", "draft")).toBeNull();
  });
});
