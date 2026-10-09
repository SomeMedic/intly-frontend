import { describe, expect, it } from "vitest";
import { resolveRagProfileScope } from "./knowledge-rag-scope";

const labels = { allProfilesLabel: "Все профили", activeProfileLabel: "Активный профиль" };
const profiles = [
  { id: "profile-a", name: "Backend", isActive: true },
  { id: "profile-b", name: "Frontend" }
];

describe("knowledge RAG profile scope", () => {
  it("uses a valid shell active profile as the default request scope", () => {
    expect(resolveRagProfileScope({ selectedProfileId: "", activeProfileId: "profile-b", profiles, ...labels })).toMatchObject({
      requestProfileId: "profile-b",
      defaultProfileId: "profile-b",
      defaultOptionLabel: "Активный профиль: Frontend",
      showAllProfilesOption: true,
      scopeKey: "profile:profile-b"
    });
  });

  it("falls back to backend dashboard semantics after reload when store is empty", () => {
    expect(resolveRagProfileScope({ selectedProfileId: "", activeProfileId: null, profiles, ...labels })).toMatchObject({
      requestProfileId: "profile-a",
      defaultProfileId: "profile-a",
      defaultOptionLabel: "Активный профиль: Backend",
      scopeKey: "profile:profile-a"
    });
  });

  it("keeps explicit profile override and explicit all-profiles scope", () => {
    expect(resolveRagProfileScope({ selectedProfileId: "profile-b", activeProfileId: "profile-a", profiles, ...labels }).requestProfileId).toBe("profile-b");
    expect(resolveRagProfileScope({ selectedProfileId: "all", activeProfileId: "profile-a", profiles, ...labels })).toMatchObject({
      requestProfileId: undefined,
      defaultProfileId: "profile-a",
      scopeKey: "all"
    });
  });

  it("uses the first profile when no active flag is available", () => {
    const unmarked = [{ id: "first", name: "First" }, { id: "second", name: "Second" }];
    expect(resolveRagProfileScope({ selectedProfileId: "", activeProfileId: "missing", profiles: unmarked, ...labels })).toMatchObject({
      requestProfileId: "first",
      defaultProfileId: "first",
      defaultOptionLabel: "Активный профиль: First"
    });
  });

  it("is truthful for an empty loaded profile list", () => {
    expect(resolveRagProfileScope({ selectedProfileId: "", activeProfileId: null, profiles: [], ...labels })).toMatchObject({
      requestProfileId: undefined,
      defaultProfileId: undefined,
      defaultOptionLabel: "Все профили",
      showAllProfilesOption: false,
      scopeKey: "all"
    });
  });

  it("falls back from a stale explicit profile id to the default profile", () => {
    expect(resolveRagProfileScope({ selectedProfileId: "stale-profile", activeProfileId: null, profiles, ...labels })).toMatchObject({
      requestProfileId: "profile-a",
      defaultProfileId: "profile-a",
      scopeKey: "profile:profile-a"
    });
  });
});
