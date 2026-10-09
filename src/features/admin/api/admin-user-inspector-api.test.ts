import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
import {
  adminUserInspectorBatchOverviewPath,
  adminUserInspectorContentPath,
  adminUserInspectorOverviewPath,
  adminUserInspectorSectionPath,
  aiUsageCostState,
  extractAiUsageSummary,
  pickInspectorTitle,
  redactInspectorValue,
} from "./admin-user-inspector-api";

describe("admin user inspector api helpers", () => {
  it("builds the agreed read-only admin inspector paths", () => {
    expect(adminUserInspectorOverviewPath("user 1")).toBe("/admin/users/user%201/inspector/overview");
    expect(adminUserInspectorSectionPath("u1", "aiRuns", { limit: 50, cursor: "c1" })).toBe("/admin/users/u1/inspector/aiRuns?limit=50&cursor=c1");
    expect(adminUserInspectorContentPath("u1", "responses", "r 1")).toBe("/admin/users/u1/inspector/responses/r%201/content");
    expect(adminUserInspectorBatchOverviewPath()).toBe("/admin/users/inspector/overview-batch");
  });

  it("redacts sensitive values recursively before display", () => {
    expect(redactInspectorValue({ apiToken: "abc", nested: { passwordHash: "hash", title: "safe" }, list: [{ sessionId: "s1" }], usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } })).toEqual({
      apiToken: "[redacted]",
      nested: { passwordHash: "[redacted]", title: "safe" },
      list: [{ sessionId: "[redacted]" }],
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });
  });

  it("reads current-month AI summary and keeps unknown cost distinct from real zero", () => {
    const usage = { summary: { runs: 3, inputTokens: 10, outputTokens: 5, totalTokens: 15, estimatedCost: 0, costKnownRuns: 3, costUnknownRuns: 0 } };
    expect(extractAiUsageSummary(usage)).toMatchObject({ runs: 3, totalTokens: 15, estimatedCost: 0 });
    expect(aiUsageCostState(usage)).toEqual({ label: "$0.00", known: true, costKnownRuns: 3, costUnknownRuns: 0 });
    expect(aiUsageCostState({ summary: { runs: 3, estimatedCost: null, totalTokens: 12, costKnownRuns: 0, costUnknownRuns: 3 } })).toEqual({ label: "unknown", known: false, costKnownRuns: 0, costUnknownRuns: 3 });
  });

  it("selects a readable inspector card title", () => {
    expect(pickInspectorTitle({ title: "Senior backend response" }, "responses")).toBe("Senior backend response");
    expect(pickInspectorTitle({ taskType: "opportunity_analysis" }, "aiRuns")).toBe("opportunity_analysis");
  });
});
