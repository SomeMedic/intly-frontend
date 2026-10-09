import { describe, expect, it } from "vitest";
import type { Watchlist } from "@/types";
import { watchlistDraft, watchlistPatch } from "./watchlist-editor";

describe("watchlist editor contracts", () => {
  it("keeps automatic AI and material reruns opt-in without imposing a daily cap", () => {
    const patch = watchlistPatch(watchlistDraft());
    expect(patch.autoAiRules).toEqual({ enabled: false, rerunOnMaterialChange: false });
    expect(patch.active).toBe(true);
  });

  it("exposes query and remote filters and preserves other rules when editing", () => {
    const item: Watchlist = { id: "rule", name: "Python", profileId: "profile", filters: { query: "Python", remoteType: "remote", sourceIds: ["hh"], technologies: ["Django"] }, exclusions: { sourceIds: ["builtin"], keywords: ["intern"] }, notificationPolicy: { inApp: false, mode: "weekly", quietHours: { from: "22:00" } }, autoAiRules: { enabled: false, dailyMax: 3, rerunOnMaterialChange: true }, matchMin: 70 };
    const draft = watchlistDraft(item);
    expect(draft.query).toBe("Python");
    expect(draft.remoteType).toBe("remote");
    expect(watchlistPatch({ ...draft, query: "Django", remoteType: "", aiMin: "85" }, item)).toMatchObject({ filters: { query: "Django", sourceIds: ["hh"], technologies: ["Django"] }, exclusions: { sourceIds: ["builtin"], keywords: ["intern"] }, notificationPolicy: { inApp: false, mode: "weekly", quietHours: { from: "22:00" } }, autoAiRules: { dailyMax: 3, rerunOnMaterialChange: true }, matchMin: 70, aiMin: 85 });
    expect(watchlistPatch({ ...draft, remoteType: "" }, item).filters).not.toHaveProperty("remoteType");
  });

  it("clears thresholds, removes an optional cap, and normalizes exclusions", () => {
    const item: Watchlist = { id: "rule", name: "Old", profileId: "profile", filters: {}, matchMin: 80, aiMin: 90, autoAiRules: { enabled: true, dailyMax: 3 } };
    const patch = watchlistPatch({ ...watchlistDraft(item), name: "  New  ", dailyMax: "", matchMin: "", aiMin: "", companies: " ACME, ACME, ", keywords: "intern, junior" }, item);
    expect(patch).toMatchObject({ name: "New", matchMin: null, aiMin: null, exclusions: { companies: ["ACME"], keywords: ["intern", "junior"] } });
    expect(patch.autoAiRules?.dailyMax).toBeNull();
  });
});
