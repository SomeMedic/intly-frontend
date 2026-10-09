import { describe, expect, it } from "vitest";
import type { OpportunityRecord } from "./contracts";
import { formatOpportunityDate, formatOpportunityFieldDate } from "./opportunity-workspace-labels";

const baseOpportunity: Pick<OpportunityRecord, "publishedAt" | "deadline" | "dateMetadata"> = {
  publishedAt: "2026-10-05T09:30:00.000Z",
  deadline: "2026-10-08T12:45:00.000Z",
};

describe("opportunity date labels", () => {
  it("keeps exact Roseltorg-style timestamps on legacy formatting", () => {
    const label = formatOpportunityFieldDate(baseOpportunity, "publishedAt", "en");

    expect(label).toContain("10/5/2026");
    expect(label).toMatch(/\d{1,2}:\d{2}/);
  });

  it("renders day-precision metadata in Russian without adding time", () => {
    expect(formatOpportunityFieldDate({
      ...baseOpportunity,
      dateMetadata: { publishedAt: { precision: "day", calendarDate: "2026-10-05", originalText: "05.10.2026" } },
    }, "publishedAt", "ru")).toBe("05.10.2026");
  });

  it("renders day-precision metadata in English without adding time", () => {
    expect(formatOpportunityFieldDate({
      ...baseOpportunity,
      dateMetadata: { deadline: { precision: "day", calendarDate: "2026-10-08", originalText: "Oct 8, 2026" } },
    }, "deadline", "en")).toBe("10/8/2026");
  });

  it("keeps source calendar dates stable across UTC+14 and UTC-12 canonical timestamps", () => {
    const plusFourteen = formatOpportunityFieldDate({
      publishedAt: "2026-10-04T10:15:00.000Z",
      dateMetadata: { publishedAt: { precision: "day", calendarDate: "2026-10-05", timezone: "Pacific/Kiritimati" } },
    }, "publishedAt", "en", false);
    const minusTwelve = formatOpportunityFieldDate({
      deadline: "2026-10-06T11:30:00.000Z",
      dateMetadata: { deadline: { precision: "day", calendarDate: "2026-10-05", timezone: "Etc/GMT+12" } },
    }, "deadline", "en", false);

    expect(plusFourteen).toBe("10/5/2026");
    expect(minusTwelve).toBe("10/5/2026");
  });

  it("falls back to legacy timestamps for malformed sparse metadata", () => {
    expect(formatOpportunityFieldDate({
      ...baseOpportunity,
      dateMetadata: { publishedAt: { precision: "day", calendarDate: "2026-13-40" } },
    }, "publishedAt", "en", false)).toBe("10/5/2026");
  });

  it("does not print Invalid Date for malformed timestamps", () => {
    expect(formatOpportunityDate("not-a-date", "en")).toBeUndefined();
    expect(formatOpportunityFieldDate({ publishedAt: "not-a-date" }, "publishedAt", "en")).toBeUndefined();
  });
});
