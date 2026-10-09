import { describe, expect, it } from "vitest";
import type { ResumeDocumentJson, ResumeSuggestion } from "../contracts";
import { buildReorderUndoReceipt, canUndoReorder, createReorderUndoStore, reorderUndoStorageKey } from "./reorder-undo";

function suggestion(input: Partial<ResumeSuggestion> = {}): ResumeSuggestion {
  return {
    id: "suggestion-1",
    type: "reorder",
    title: "Move project",
    proposed: { action: "reorder", sectionId: "projects", itemId: "b", toIndex: 0 },
    status: "pending",
    ...input
  };
}

function document(order: string[], texts: Record<string, string> = {}): ResumeDocumentJson {
  return {
    headline: "Engineer",
    summary: "Summary",
    skills: [{ id: "skill-1", text: "TypeScript" }],
    experience: [],
    projects: order.map((id) => ({ id, text: texts[id] ?? `Project ${id}` })),
    education: [],
    languages: [],
    links: []
  };
}

function storage() {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); }
  } satisfies Storage;
}

describe("resume reorder undo receipts", () => {
  it("captures accepted reorder order and returns the original order only while current order still matches", () => {
    const source = storage();
    const store = createReorderUndoStore({ ownerId: "owner-1", adaptationId: "adaptation-1", storage: source });
    const before = document(["a", "b", "c"]);
    const after = document(["b", "a", "c"]);
    const receipt = store.capture(suggestion(), before, after);

    expect(receipt).toMatchObject({ sectionId: "projects", beforeOrder: ["a", "b", "c"], afterOrder: ["b", "a", "c"] });
    expect(store.canUndo(suggestion({ status: "accepted" }), after)).toBe(true);
    expect(store.getOrder(suggestion({ status: "accepted" }), after)).toEqual(["a", "b", "c"]);
    expect(store.getOrder(suggestion({ status: "pending" }), after)).toBeNull();
    expect(store.getOrder(suggestion({ status: "accepted" }), document(["a", "b", "c"]))).toBeNull();
  });

  it("keeps undo eligible through text edits but invalidates added deleted or reordered items", () => {
    const source = storage();
    const store = createReorderUndoStore({ ownerId: "owner-1", adaptationId: "adaptation-1", storage: source });
    store.capture(suggestion(), document(["a", "b", "c"]), document(["b", "a", "c"]));

    expect(store.getOrder(suggestion({ status: "accepted" }), document(["b", "a", "c"], { a: "Edited A", b: "Edited B", c: "Edited C" }))).toEqual(["a", "b", "c"]);
    expect(store.getOrder(suggestion({ status: "accepted" }), document(["b", "a", "c", "d"]))).toBeNull();
    expect(store.getOrder(suggestion({ status: "accepted" }), document(["b", "c"]))).toBeNull();
    expect(store.getOrder(suggestion({ status: "accepted" }), document(["a", "b", "c"]))).toBeNull();
  });

  it("restores receipts from session storage within the same owner and adaptation only", () => {
    const source = storage();
    createReorderUndoStore({ ownerId: "owner-1", adaptationId: "adaptation-1", storage: source }).capture(suggestion(), document(["a", "b"]), document(["b", "a"]));

    const restored = createReorderUndoStore({ ownerId: "owner-1", adaptationId: "adaptation-1", storage: source });
    const foreignOwner = createReorderUndoStore({ ownerId: "owner-2", adaptationId: "adaptation-1", storage: source });
    const foreignAdaptation = createReorderUndoStore({ ownerId: "owner-1", adaptationId: "adaptation-2", storage: source });

    expect(restored.getOrder(suggestion({ status: "accepted" }), document(["b", "a"]))).toEqual(["a", "b"]);
    expect(foreignOwner.getOrder(suggestion({ status: "accepted" }), document(["b", "a"]))).toBeNull();
    expect(foreignAdaptation.getOrder(suggestion({ status: "accepted" }), document(["b", "a"]))).toBeNull();
  });

  it("rejects non reorder document override unsupported section and unstable item ids", () => {
    expect(buildReorderUndoReceipt({ ownerId: "owner", adaptationId: "adaptation", suggestion: suggestion({ proposed: { action: "rewrite", sectionId: "projects" } }), beforeDocument: document(["a", "b"]), afterDocument: document(["b", "a"]) })).toBeNull();
    expect(buildReorderUndoReceipt({ ownerId: "owner", adaptationId: "adaptation", suggestion: suggestion({ proposed: { action: "reorder", sectionId: "projects", document: {} } }), beforeDocument: document(["a", "b"]), afterDocument: document(["b", "a"]) })).toBeNull();
    expect(buildReorderUndoReceipt({ ownerId: "owner", adaptationId: "adaptation", suggestion: suggestion({ proposed: { operation: "reorder", targetSection: "summary" } }), beforeDocument: document(["a", "b"]), afterDocument: document(["b", "a"]) })).toBeNull();
    expect(buildReorderUndoReceipt({ ownerId: "owner", adaptationId: "adaptation", suggestion: suggestion({ proposed: { kind: "reorder", section: "projects" } }), beforeDocument: { projects: ["a", "b"] }, afterDocument: document(["b", "a"]) })).toBeNull();
    expect(buildReorderUndoReceipt({ ownerId: "owner", adaptationId: "adaptation", suggestion: suggestion(), beforeDocument: { projects: [{ id: "a" }, { id: "a" }] }, afterDocument: document(["a", "b"]) })).toBeNull();
  });

  it("ignores malformed oversized and foreign stored receipts", () => {
    const source = storage();
    const key = reorderUndoStorageKey("owner-1", "adaptation-1");
    source.setItem(key, "{");
    expect(createReorderUndoStore({ ownerId: "owner-1", adaptationId: "adaptation-1", storage: source }).getOrder(suggestion({ status: "accepted" }), document(["b", "a"]))).toBeNull();

    source.setItem(key, "x".repeat(70 * 1024));
    expect(createReorderUndoStore({ ownerId: "owner-1", adaptationId: "adaptation-1", storage: source }).getOrder(suggestion({ status: "accepted" }), document(["b", "a"]))).toBeNull();

    source.setItem(key, JSON.stringify([{ ownerId: "owner-2", adaptationId: "adaptation-1", suggestionId: "suggestion-1", sectionId: "projects", beforeOrder: ["a", "b"], afterOrder: ["b", "a"], createdAt: 1 }]));
    expect(createReorderUndoStore({ ownerId: "owner-1", adaptationId: "adaptation-1", storage: source }).getOrder(suggestion({ status: "accepted" }), document(["b", "a"]))).toBeNull();
  });

  it("falls back to in-memory tab storage when session storage later rejects writes", () => {
    const source = storage();
    let writes = 0;
    const flaky = {
      getItem: source.getItem,
      removeItem: source.removeItem,
      setItem(key: string, value: string) {
        writes += 1;
        if (writes > 1) throw new Error("quota");
        source.setItem(key, value);
      }
    };
    const store = createReorderUndoStore({ ownerId: "owner-fallback", adaptationId: "adaptation-1", storage: flaky });
    store.capture(suggestion(), document(["a", "b"]), document(["b", "a"]));

    const restored = createReorderUndoStore({ ownerId: "owner-fallback", adaptationId: "adaptation-1", storage: flaky });
    expect(restored.getOrder(suggestion({ status: "accepted" }), document(["b", "a"]))).toEqual(["a", "b"]);
  });

  it("prefers fallback writes and tombstones over stale persisted storage after quota failures", () => {
    const source = storage();
    const key = reorderUndoStorageKey("owner-late-fallback", "adaptation-1");
    let rejectSet = false;
    let rejectRemove = false;
    const flaky = {
      getItem: source.getItem,
      setItem(key: string, value: string) {
        if (rejectSet) throw new Error("quota");
        source.setItem(key, value);
      },
      removeItem(key: string) {
        if (rejectRemove) throw new Error("remove denied");
        source.removeItem(key);
      }
    };

    const initial = createReorderUndoStore({ ownerId: "owner-late-fallback", adaptationId: "adaptation-1", storage: flaky });
    initial.capture(suggestion(), document(["a", "b"]), document(["b", "a"]));
    expect(source.getItem(key)).not.toBeNull();

    rejectSet = true;
    const newer = createReorderUndoStore({ ownerId: "owner-late-fallback", adaptationId: "adaptation-1", storage: flaky });
    newer.capture(suggestion({ id: "suggestion-2", proposed: { action: "reorder", sectionId: "projects", itemId: "c", toIndex: 0 } }), document(["a", "b", "c"]), document(["c", "a", "b"]));
    const restored = createReorderUndoStore({ ownerId: "owner-late-fallback", adaptationId: "adaptation-1", storage: flaky });
    expect(restored.getOrder(suggestion({ id: "suggestion-2", proposed: { action: "reorder", sectionId: "projects", itemId: "c", toIndex: 0 }, status: "accepted" }), document(["c", "a", "b"]))).toEqual(["a", "b", "c"]);

    rejectRemove = true;
    restored.remove("suggestion-2");
    const afterRemove = createReorderUndoStore({ ownerId: "owner-late-fallback", adaptationId: "adaptation-1", storage: flaky });
    expect(afterRemove.getOrder(suggestion({ id: "suggestion-2", proposed: { action: "reorder", sectionId: "projects", itemId: "c", toIndex: 0 }, status: "accepted" }), document(["c", "a", "b"]))).toBeNull();
    expect(afterRemove.getOrder(suggestion({ status: "accepted" }), document(["b", "a"]))).toBeNull();
  });

  it("removes a receipt after successful undo", () => {
    const source = storage();
    const store = createReorderUndoStore({ ownerId: "owner-1", adaptationId: "adaptation-1", storage: source });
    const receipt = store.capture(suggestion(), document(["a", "b"]), document(["b", "a"]));
    expect(receipt && canUndoReorder(receipt, suggestion({ status: "accepted" }), document(["b", "a"]))).toBe(true);

    store.remove("suggestion-1");

    expect(store.canUndo(suggestion({ status: "accepted" }), document(["b", "a"]))).toBe(false);
  });
});
