import { describe, expect, it } from "vitest";
import type { AdminBulkReportResult, AdminReport } from "@/types";
import { canBulkTriage, failedBulkIds, reportAssigneePayload, selectedReportTypes, selectedReports, summarizeBulkResult } from "./admin-reports-helpers";

const reports = [
  { id: "r1", type: "money", status: "Open", userId: "u1", opportunityId: "o1" },
  { id: "r2", type: "money", status: "Open", userId: "u2", opportunityId: "o2" },
  { id: "r3", type: "closed", status: "Open", userId: "u3", opportunityId: "o3" },
] satisfies AdminReport[];

describe("admin report helpers", () => {
  it("keeps selected report categories deterministic", () => {
    const selected = selectedReports(reports, ["r3", "r1"]);
    expect(selected.map((item) => item.id)).toEqual(["r1", "r3"]);
    expect(selectedReportTypes(selected)).toEqual(["closed", "money"]);
    expect(canBulkTriage(selected)).toBe(false);
    expect(canBulkTriage(selectedReports(reports, ["r1", "r2"]))).toBe(true);
  });

  it("preserves failed bulk IDs for retry after a partial result", () => {
    const result = [
      { id: "r1", success: true },
      { id: "r2", success: false, error: "Locked" },
      { id: "r3", success: false, error: "Wrong category" },
    ] satisfies AdminBulkReportResult[];
    expect(failedBulkIds(result)).toEqual(["r2", "r3"]);
    expect(summarizeBulkResult(result)).toEqual({ total: 3, succeeded: 1, failed: 2 });
  });

  it("serializes assignee clearing as null for the backend contract", () => {
    expect(reportAssigneePayload("admin-1")).toBe("admin-1");
    expect(reportAssigneePayload("")).toBeNull();
  });
});
