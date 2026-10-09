import { describe, expect, it, vi } from "vitest";
import { appearanceFromUserSettings, enqueueAppearanceMutation, mergeAppearance, noteCommittedAppearance, resetAppearanceSyncForTests, resolveEffectiveMode, resolveEffectiveReducedMotion, type AppearancePreferences } from "./use-appearance-preferences";

vi.mock("@/features/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/services/api", () => ({ api: { patch: vi.fn() } }));

const fallback: AppearancePreferences = {
  themePack: "intly-plum",
  mode: "system",
  density: "comfortable",
  reducedMotion: false
};

describe("appearance preferences", () => {
  it("resolves system mode from the current OS preference", () => {
    expect(resolveEffectiveMode("system", true)).toBe("dark");
    expect(resolveEffectiveMode("system", false)).toBe("light");
    expect(resolveEffectiveMode("dark", false)).toBe("dark");
  });

  it("treats the user reduced-motion toggle as stricter than the OS preference", () => {
    expect(resolveEffectiveReducedMotion(true, false)).toBe(true);
    expect(resolveEffectiveReducedMotion(false, true)).toBe(true);
    expect(resolveEffectiveReducedMotion(false, false)).toBe(false);
  });

  it("hydrates appearance from backend settings without inventing unrelated fields", () => {
    expect(appearanceFromUserSettings({ themePack: "forest-teal", density: "compact" }, fallback)).toEqual({
      themePack: "forest-teal",
      mode: "system",
      density: "compact",
      reducedMotion: false
    });
  });

  it("merges patches without dropping existing appearance choices", () => {
    expect(mergeAppearance(fallback, { mode: "dark" })).toEqual({
      ...fallback,
      mode: "dark"
    });
  });

  it("rolls back the latest failed queued mutation to the last confirmed server appearance", async () => {
    resetAppearanceSyncForTests();
    noteCommittedAppearance("user-1", fallback);
    const confirmedAfterFirst: AppearancePreferences = { ...fallback, themePack: "forest-teal" };
    let persistCalls = 0;
    const persist = vi.fn(async () => {
      persistCalls += 1;
      if (persistCalls === 1) return confirmedAfterFirst;
      throw new Error("network");
    });
    const saved: AppearancePreferences[] = [];
    const rollbacks: AppearancePreferences[] = [];

    const first = enqueueAppearanceMutation({
      userId: "user-1",
      patch: { themePack: "forest-teal" },
      optimistic: confirmedAfterFirst,
      persist,
      getCurrentUserId: () => "user-1",
      applySaved: (appearance) => saved.push(appearance),
      applyRollback: (appearance) => rollbacks.push(appearance)
    });
    const second = enqueueAppearanceMutation({
      userId: "user-1",
      patch: { mode: "dark" },
      optimistic: { ...confirmedAfterFirst, mode: "dark" },
      persist,
      getCurrentUserId: () => "user-1",
      applySaved: (appearance) => saved.push(appearance),
      applyRollback: (appearance) => rollbacks.push(appearance)
    });

    await expect(first).resolves.toEqual(confirmedAfterFirst);
    await expect(second).rejects.toThrow("network");
    expect(saved).toEqual([]);
    expect(rollbacks).toEqual([confirmedAfterFirst]);
  });

  it("ignores completion side effects after an account switch", async () => {
    resetAppearanceSyncForTests();
    let currentUserId: string | null = "user-1";
    const serverAppearance: AppearancePreferences = { ...fallback, mode: "dark" };
    const saved: AppearancePreferences[] = [];
    const rollbacks: AppearancePreferences[] = [];

    const task = enqueueAppearanceMutation({
      userId: "user-1",
      patch: { mode: "dark" },
      optimistic: serverAppearance,
      persist: async () => {
        currentUserId = "user-2";
        return serverAppearance;
      },
      getCurrentUserId: () => currentUserId,
      applySaved: (appearance) => saved.push(appearance),
      applyRollback: (appearance) => rollbacks.push(appearance)
    });

    await expect(task).resolves.toEqual(serverAppearance);
    expect(saved).toEqual([]);
    expect(rollbacks).toEqual([]);
  });

  it("does not start a queued old-account mutation after an account switch", async () => {
    resetAppearanceSyncForTests();
    const optimistic: AppearancePreferences = { ...fallback, mode: "dark" };
    const persist = vi.fn(async () => optimistic);

    const task = enqueueAppearanceMutation({
      userId: "user-1",
      patch: { mode: "dark" },
      optimistic,
      persist,
      getCurrentUserId: () => "user-2",
      applySaved: () => {
        throw new Error("old account save should not apply");
      },
      applyRollback: () => {
        throw new Error("old account rollback should not apply");
      }
    });

    await expect(task).resolves.toEqual(optimistic);
    expect(persist).not.toHaveBeenCalled();
  });
});
