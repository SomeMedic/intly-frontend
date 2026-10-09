import { describe, expect, it } from "vitest";
import {
  pinContextFact,
  readContextSectionState,
  readPinnedContextFacts,
  responseContextCollapseKey,
  responseContextPinsKey,
  responsePresetInstruction,
  unpinContextFact,
  writeContextSectionState,
  writePinnedContextFacts,
  type PinnedContextFact,
} from "./response-context-state";

describe("response context pins", () => {
  it("normalizes, deduplicates, limits, and keeps newest pins first", () => {
    const facts: PinnedContextFact[] = Array.from({ length: 25 }, (_, index) => ({
      id: `fact-${index}`,
      label: `Label ${index}`,
      text: `Text ${index}`,
      source: "opportunity",
    }));
    const pinned = pinContextFact(facts, { id: "fact-2", label: " Updated label ", text: " Updated text ", source: "opportunity" });

    expect(pinned).toHaveLength(20);
    expect(pinned[0]).toEqual({ id: "fact-2", label: "Updated label", text: "Updated text", source: "opportunity" });
    expect(pinned.filter((fact) => fact.id === "fact-2")).toHaveLength(1);
  });

  it("unpins only the matching source and id", () => {
    const current: PinnedContextFact[] = [
      { id: "same", label: "Requirement", text: "One", source: "opportunity" },
      { id: "same", label: "Profile", text: "Two", source: "profile" },
    ];

    expect(unpinContextFact(current, { id: "same", source: "profile" })).toEqual([
      { id: "same", label: "Requirement", text: "One", source: "opportunity" },
    ]);
  });

  it("isolates storage by owner profile draft and opportunity", () => {
    const storage = new MemoryStorage();
    const left = { ownerId: "user-1", profileId: "profile-1", draftId: "draft-1", opportunityId: "opp-1" };
    const right = { ownerId: "user-1", profileId: "profile-1", draftId: "draft-2", opportunityId: "opp-1" };
    const fact: PinnedContextFact = { id: "r-1", label: "Requirement", text: "Need TypeScript", source: "opportunity" };

    writePinnedContextFacts(storage, left, [fact]);

    expect(responseContextPinsKey(left)).not.toBe(responseContextPinsKey(right));
    expect(readPinnedContextFacts(storage, left)).toEqual([fact]);
    expect(readPinnedContextFacts(storage, right)).toEqual([]);
  });
});

describe("response context section state and presets", () => {
  it("stores only known collapsible sections", () => {
    const storage = new MemoryStorage();
    const scope = { ownerId: "user-1", profileId: "profile-1", opportunityId: "opp-1" };

    writeContextSectionState(storage, scope, { opportunity: true, requirements: false, profile: true, insights: false });

    expect(responseContextCollapseKey(scope)).toContain("user-1:profile-1:no-draft:opp-1");
    expect(readContextSectionState(storage, scope)).toEqual({ opportunity: true, requirements: false, profile: true, insights: false });
  });

  it("localizes preset instructions and exposes tool hints", () => {
    expect(responsePresetInstruction("technical", "en")).toMatchObject({ label: "Technical", toolHint: "changeTone" });
    expect(responsePresetInstruction("experience", "ru").instruction).toContain("профиля");
  });
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
