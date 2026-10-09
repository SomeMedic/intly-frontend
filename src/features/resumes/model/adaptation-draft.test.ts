import { describe, expect, it, vi } from "vitest";
import type { ResumeAdaptation, ResumeDocumentJson } from "../contracts";
import { AdaptationDraftController, adaptationDraftStorageKey, clearAdaptationDraftRecovery, readAdaptationDraftRecovery, writeAdaptationDraftRecovery, type AdaptationDraftPersisted, type AdaptationDraftSaveInput } from "./adaptation-draft";

function adaptation(input: Partial<ResumeAdaptation> = {}): ResumeAdaptation {
  return {
    id: "adaptation-1",
    userId: "owner-1",
    profileId: "profile-1",
    opportunityId: "opportunity-1",
    baseResumeId: "resume-1",
    documentJson: { headline: "Backend engineer", summary: "Original", skills: [], experience: [], projects: [], education: [], languages: [], links: [] },
    markdownCache: "Original",
    suggestions: [],
    status: "editing",
    revision: 3,
    ...input
  };
}

function savedFrom(input: AdaptationDraftSaveInput, revision = input.revision + 1): ResumeAdaptation {
  return adaptation({ documentJson: input.documentJson, markdownCache: input.markdownCache, status: input.status, revision });
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("resume adaptation durable draft", () => {
  it("acknowledges the exact in-flight snapshot without overwriting newer typing", async () => {
    const source = storage();
    const controller = new AdaptationDraftController({ adaptation: adaptation(), ownerId: "owner-1", storage: source });
    const firstDocument: ResumeDocumentJson = { headline: "First local edit" };
    const secondDocument: ResumeDocumentJson = { headline: "Second local edit" };
    const request = deferred<ResumeAdaptation>();
    const update = vi.fn((input: AdaptationDraftSaveInput) => request.promise.then(() => savedFrom(input, 4)));

    controller.setDocument(firstDocument);
    const save = controller.save(update);
    controller.setDocument(secondDocument);
    request.resolve(adaptation());
    await save;

    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0][0].revision).toBe(3);
    expect(update.mock.calls[0][0].documentJson.headline).toBe("First local edit");
    expect(controller.state.revision).toBe(4);
    expect(controller.state.documentJson.headline).toBe("Second local edit");
    expect(controller.state.dirty).toBe(true);
    await controller.save(update);
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1][0].revision).toBe(4);
  });

  it("rebases persisted newer typing after an in-flight save is acknowledged", async () => {
    const source = storage();
    const controller = new AdaptationDraftController({ adaptation: adaptation(), ownerId: "owner-1", storage: source });
    const request = deferred<ResumeAdaptation>();
    const update = vi.fn((input: AdaptationDraftSaveInput) => request.promise.then(() => savedFrom(input, 4)));

    controller.setMarkdown("first");
    const save = controller.save(update);
    controller.setMarkdown("second");
    request.resolve(adaptation());
    await save;

    const reopened = new AdaptationDraftController({ adaptation: adaptation({ revision: 4, markdownCache: "first" }), ownerId: "owner-1", storage: source });
    expect(reopened.state.markdownCache).toBe("second");
    expect(reopened.state.recovered).toMatchObject({ baseRevision: 4, stale: false });
    expect(reopened.state.conflict).toBeNull();
  });

  it("uses one synchronized save lane for manual and autosave calls", async () => {
    const controller = new AdaptationDraftController({ adaptation: adaptation(), ownerId: "owner-1", storage: storage() });
    const request = deferred<ResumeAdaptation>();
    const update = vi.fn((input: AdaptationDraftSaveInput) => request.promise.then(() => savedFrom(input, 4)));

    controller.setMarkdown("changed");
    const manual = controller.save(update);
    const automatic = controller.save(update, undefined, { automatic: true });
    request.resolve(adaptation());
    const [manualResult, automaticResult] = await Promise.all([manual, automatic]);

    expect(update).toHaveBeenCalledOnce();
    expect(manualResult?.revision).toBe(4);
    expect(automaticResult?.revision).toBe(4);
    expect(controller.state.dirty).toBe(false);
  });

  it("does not let a late lower save acknowledgement clear a newer remote conflict", async () => {
    const controller = new AdaptationDraftController({ adaptation: adaptation(), ownerId: "owner-1", storage: storage() });
    const request = deferred<ResumeAdaptation>();
    const update = vi.fn((input: AdaptationDraftSaveInput) => request.promise.then(() => savedFrom(input, 4)));
    const onSaved = vi.fn();

    controller.setMarkdown("local");
    const save = controller.save(update, onSaved);
    expect(controller.acceptServer(adaptation({ revision: 5, markdownCache: "remote" }))).toBe(false);
    request.resolve(adaptation());
    await save;

    expect(controller.state.revision).toBe(5);
    expect(controller.state.markdownCache).toBe("local");
    expect(controller.state.dirty).toBe(true);
    expect(controller.state.saving).toBe(false);
    expect(controller.state.conflict?.serverRevision).toBe(5);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("stops automatic retries after transient failure but allows explicit retry", async () => {
    const controller = new AdaptationDraftController({ adaptation: adaptation(), ownerId: "owner-1", storage: storage() });
    const update = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("offline"), { status: 0 }))
      .mockImplementationOnce((input: AdaptationDraftSaveInput) => Promise.resolve(savedFrom(input, 4)));

    controller.setMarkdown("changed");
    expect(await controller.save(update, undefined, { automatic: true })).toBeNull();
    expect(controller.state.error?.message).toBe("offline");
    expect(await controller.save(update, undefined, { automatic: true })).toBeNull();
    expect(update).toHaveBeenCalledOnce();
    expect(await controller.save(update)).not.toBeNull();
    expect(update).toHaveBeenCalledTimes(2);
    expect(controller.state.error).toBeNull();
  });

  it("preserves local content and blocks saves after a revision conflict", async () => {
    const controller = new AdaptationDraftController({ adaptation: adaptation(), ownerId: "owner-1", storage: storage() });
    const conflict = Object.assign(new Error("conflict"), { status: 409, code: "REVISION_CONFLICT" });
    const update = vi.fn().mockRejectedValue(conflict);

    controller.setDocument({ headline: "Local" });
    expect(await controller.save(update)).toBeNull();
    expect(controller.state.conflict?.kind).toBe("revision");
    expect(controller.state.documentJson.headline).toBe("Local");
    expect(await controller.save(update)).toBeNull();
    expect(update).toHaveBeenCalledOnce();
  });

  it("applies remote generation updates only while clean", () => {
    const controller = new AdaptationDraftController({ adaptation: adaptation(), ownerId: "owner-1", storage: storage() });
    expect(controller.acceptServer(adaptation({ revision: 4, documentJson: { headline: "Generated" } }))).toBe(true);
    expect(controller.state.documentJson.headline).toBe("Generated");
    controller.setMarkdown("local unsaved");
    expect(controller.acceptServer(adaptation({ revision: 5, documentJson: { headline: "New generated" } }))).toBe(false);
    expect(controller.state.markdownCache).toBe("local unsaved");
    expect(controller.state.conflict?.serverRevision).toBe(5);
  });

  it("ignores delayed or foreign server records without regressing revision", () => {
    const controller = new AdaptationDraftController({ adaptation: adaptation({ revision: 5 }), ownerId: "owner-1", storage: storage() });

    expect(controller.acceptServer(adaptation({ revision: 4, documentJson: { headline: "Old" } }))).toBe(false);
    expect(controller.reloadServer(adaptation({ userId: "owner-2", revision: 6, documentJson: { headline: "Foreign" } }))).toBe(false);
    expect(controller.state.revision).toBe(5);
    expect(controller.state.documentJson.headline).toBe("Backend engineer");
  });

  it("isolates local recovery by owner and adaptation and marks stale drafts as conflict", () => {
    const source = storage();
    const draft: AdaptationDraftPersisted = {
      ownerId: "owner-1",
      adaptationId: "adaptation-1",
      baseRevision: 2,
      updatedAt: 100,
      token: "token-1",
      documentJson: { headline: "Recovered" },
      markdownCache: "Recovered",
      status: "editing"
    };
    expect(writeAdaptationDraftRecovery(source, draft)).toBe(true);
    expect(readAdaptationDraftRecovery(source, "owner-1", "adaptation-1")?.markdownCache).toBe("Recovered");
    expect(readAdaptationDraftRecovery(source, "owner-2", "adaptation-1")).toBeNull();
    expect(readAdaptationDraftRecovery(source, "owner-1", "adaptation-2")).toBeNull();

    const controller = new AdaptationDraftController({ adaptation: adaptation({ revision: 3 }), ownerId: "owner-1", storage: source });
    expect(controller.state.storageAvailable).toBe(true);
    expect(controller.state.localPersisted).toBe(true);
    expect(controller.state.recovered).toEqual({
      storageKey: adaptationDraftStorageKey("owner-1", "adaptation-1"),
      baseRevision: 2,
      updatedAt: 100,
      stale: true
    });
    expect(controller.state.conflict?.serverRevision).toBe(3);
    expect(controller.state.documentJson.headline).toBe("Recovered");
  });

  it("keeps storage failures and stale clear attempts benign", () => {
    const unavailable = {
      getItem() { throw new Error("denied"); },
      setItem() { throw new Error("denied"); },
      removeItem() { throw new Error("denied"); }
    } as unknown as Storage;
    const draft: AdaptationDraftPersisted = {
      ownerId: "owner",
      adaptationId: "draft",
      baseRevision: 1,
      updatedAt: 10,
      token: "token-1",
      documentJson: { headline: "x" },
      markdownCache: "x",
      status: "editing"
    };
    expect(writeAdaptationDraftRecovery(unavailable, draft)).toBe(false);
    expect(readAdaptationDraftRecovery(unavailable, "owner", "draft")).toBeNull();
    expect(clearAdaptationDraftRecovery(unavailable, "owner", "draft", 10, "token-1")).toBe(false);

    const source = storage();
    expect(writeAdaptationDraftRecovery(source, draft)).toBe(true);
    expect(clearAdaptationDraftRecovery(source, "owner", "draft", 10, "token-2")).toBe(false);
    expect(clearAdaptationDraftRecovery(source, "owner", "draft", 11, "token-1")).toBe(false);
    expect(readAdaptationDraftRecovery(source, "owner", "draft")).not.toBeNull();
    expect(clearAdaptationDraftRecovery(source, "owner", "draft", 10, "token-1")).toBe(true);
  });

  it("reports whether local edits were persisted for recovery", () => {
    const source = storage();
    const controller = new AdaptationDraftController({ adaptation: adaptation(), ownerId: "owner-1", storage: source });
    expect(controller.state.storageAvailable).toBe(true);
    expect(controller.state.localPersisted).toBe(false);
    controller.setMarkdown("local");
    expect(controller.state.localPersisted).toBe(true);
    controller.setMarkdown("Original");
    expect(controller.state.localPersisted).toBe(false);
  });

  it("attaches browser storage without recreating or losing a typed draft", () => {
    const source = storage();
    const controller = new AdaptationDraftController({ adaptation: adaptation(), ownerId: "owner-1", storage: null });
    controller.setMarkdown("typed before storage");
    expect(controller.state.storageAvailable).toBe(false);
    expect(controller.state.localPersisted).toBe(false);

    controller.attachStorage(source);

    expect(controller.state.markdownCache).toBe("typed before storage");
    expect(controller.state.dirty).toBe(true);
    expect(controller.state.storageAvailable).toBe(true);
    expect(controller.state.localPersisted).toBe(true);
    expect(readAdaptationDraftRecovery(source, "owner-1", "adaptation-1")?.markdownCache).toBe("typed before storage");
  });
});
