import { describe, expect, it } from "vitest";
import { updateSelectedSources } from "./admin-sources-operations";

describe("source bulk operations", () => {
  it("keeps successful results and continues after an individual failure", async () => {
    const calls: string[] = [];
    const results = await updateSelectedSources(["saved", "failed", "remaining", "saved"], false, async (id, body) => {
      calls.push(id);
      expect(body.enabled).toBe(false);
      if (id === "failed") throw new Error("No permission");
    });
    expect(calls).toEqual(["saved", "failed", "remaining"]);
    expect(results.map(({ id, error }) => [id, error?.message ?? null])).toEqual([
      ["saved", null], ["failed", "No permission"], ["remaining", null],
    ]);
  });
  it("does not issue mutations for an empty selection", async () => {
    let calls = 0;
    expect(await updateSelectedSources([], true, async () => { calls += 1; })).toEqual([]);
    expect(calls).toBe(0);
  });
});
