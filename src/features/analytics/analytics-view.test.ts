import { describe, expect, it } from "vitest";
import { analyticsDrilldownFilters, analyticsExportName, buildActivityTimeseriesDrilldown, buildAnalyticsQuery, buildPersonalEventDrilldown, buildOpportunityDrilldown, buildTimeseriesDrilldown, chartRows, columnLabel, formatMetric, kpiLabel, mergeMoneyDimensionOptions, moneyDimensionFilterValue, moneyDimensionOptions, periodLabels, typeLabels } from "./view-model";

describe("analytics view model", () => {
  it("serializes period profile type and source filters for backend analytics", () => {
    expect(buildAnalyticsQuery({ period: "30d", profileId: "profile-1", type: "vacancy", sourceIds: ["hh", "habr"] })).toBe("?period=30d&profileId=profile-1&type=vacancy&sourceIds=hh%2Chabr");
  });

  it("sends custom date-only upper bound as inclusive end of day", () => {
    expect(buildAnalyticsQuery({ period: "custom", from: "2026-10-01", to: "2026-10-03", type: "all" })).toBe("?period=custom&from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-03T23%3A59%3A59.999Z");
  });

  it("keeps chart rows typed and formats percentage metrics", () => {
    expect(chartRows([{ sourceName: "HH", sampleCount: 6 }, { sourceName: "Empty", sampleCount: 0 }], ["sourceName"], "sampleCount")).toEqual([{ sourceName: "HH", sampleCount: 6, name: "HH", count: 6 }]);
    expect(formatMetric("conversionRate", 12.5)).toBe("12.5%");
    expect(analyticsExportName("market")).toBe("market-analytics.csv");
    expect(columnLabel("sourceName")).toBe("Источник");
    expect(chartRows([{ status: "Reviewed", count: 1 }, { status: "Applied", count: 0 }], ["status"], "count", "ru", true).map((row) => row.count)).toEqual([1, 0]);
  });

  it("switches analytics labels and metric formatting for English locale", () => {
    expect(periodLabels("en")["30d"]).toBe("30 days");
    expect(typeLabels("en").vacancy).toBe("Vacancies");
    expect(kpiLabel("responsesSent", "en")).toBe("Responses sent");
    expect(columnLabel("sourceName", "en")).toBe("Source");
    expect(formatMetric("found", 1200.5, "en")).toBe("1,200.5");
    expect(chartRows([{ type: "tender", count: 2 }], ["type"], "count", "en")).toEqual([{ type: "tender", count: 2, name: "Tenders" }]);
  });

  it("builds real opportunity drilldown URLs from analytics rows", () => {
    expect(buildOpportunityDrilldown({ period: "custom", from: "2026-10-01", to: "2026-10-03", profileId: "profile-1", type: "all", sourceIds: ["hh"] }, { technology: "Python" })).toBe("/opportunities?profileId=profile-1&sourceIds=hh&firstSeenFrom=2026-10-01T00%3A00%3A00.000Z&firstSeenTo=2026-10-03T23%3A59%3A59.999Z&technologies=Python");
    expect(buildOpportunityDrilldown({ period: "30d", type: "all", sourceIds: [] }, { type: "tender" })).toBe("/tenders?type=tender");
    expect(buildTimeseriesDrilldown({ period: "30d", type: "vacancy", sourceIds: ["hh"] }, "2026-10-03")).toBe("/vacancies?type=vacancy&sourceIds=hh&firstSeenFrom=2026-10-03T00%3A00%3A00.000Z&firstSeenTo=2026-10-03T23%3A59%3A59.999Z");
  });

  it("uses the exact server-resolved rolling range and separates pipeline from source status", () => {
    const filters = analyticsDrilldownFilters({ period: "30d", profileId: "profile-1", sourceIds: ["hh"] }, { from: "2026-09-03T12:30:00.000Z", to: "2026-10-03T12:30:00.000Z" });
    const url = new URL(buildOpportunityDrilldown(filters, { status: "Reviewed" }), "http://localhost");
    expect(url.searchParams.get("firstSeenFrom")).toBe("2026-09-03T12:30:00.000Z");
    expect(url.searchParams.get("firstSeenTo")).toBe("2026-10-03T12:30:00.000Z");
    expect(url.searchParams.get("pipelineStatuses")).toBe("Reviewed");
    expect(url.searchParams.has("status")).toBe(false);
    expect(url.searchParams.get("profileId")).toBe("profile-1");
    expect(url.searchParams.get("sourceIds")).toBe("hh");
  });

  it("retains closed market records and clips a month bucket to the actual analytics range", () => {
    const filters = analyticsDrilldownFilters({ period: "30d", includeClosed: true }, { from: "2026-09-03T12:30:00.000Z", to: "2026-10-03T12:30:00.000Z" });
    const sourceUrl = new URL(buildOpportunityDrilldown(filters, { status: "Closed" }), "http://localhost");
    expect(sourceUrl.searchParams.has("archive")).toBe(false);
    expect(sourceUrl.searchParams.get("status")).toBe("Closed");
    const monthUrl = new URL(buildTimeseriesDrilldown(filters, "2026-09"), "http://localhost");
    expect(monthUrl.searchParams.get("firstSeenFrom")).toBe("2026-09-03T12:30:00.000Z");
    expect(monthUrl.searchParams.get("firstSeenTo")).toBe("2026-09-30T23:59:59.999Z");
    expect(monthUrl.searchParams.get("status")).toBe("Active,Closed,Expired,Removed,Unknown");
  });

  it("preserves market dimensions and explicit exclusion of closed records", () => {
    const query = new URLSearchParams(buildAnalyticsQuery({ period: "30d", includeClosed: false, technologies: ["Python"], sourceGroups: ["ats"], locations: ["Berlin"], countriesAllowed: ["DE"], seniority: "senior", role: "Backend Engineer", currency: "USD", moneyPeriod: "YEAR", moneyKind: "gross", comparePrevious: true }));
    expect(query.get("includeClosed")).toBe("false");
    expect(query.get("sourceGroups")).toBe("ats");
    expect(query.get("technologies")).toBe("Python");
    expect(query.get("role")).toBe("Backend Engineer");
    expect(query.get("currency")).toBe("USD");
    expect(query.get("moneyPeriod")).toBe("year");
    expect(query.get("moneyKind")).toBe("gross");
    const drilldown = new URL(buildOpportunityDrilldown({ period: "30d", technologies: ["Python"], sourceGroups: ["ats"], currency: "USD", moneyPeriod: "YEAR", moneyKind: "gross" }, { type: "vacancy" }), "http://localhost");
    expect(drilldown.searchParams.get("currency")).toBe("USD");
    expect(drilldown.searchParams.get("moneyPeriod")).toBe("year");
    expect(drilldown.searchParams.get("moneyKind")).toBe("gross");
    expect(drilldown.searchParams.get("technologies")).toBe("Python");
    const rowOverride = new URL(buildOpportunityDrilldown({ period: "30d", technologies: ["Python"], sourceGroups: ["ats"] }, { type: "vacancy", currency: "RUB", period: "MONTH", kind: "net" }), "http://localhost");
    expect(rowOverride.searchParams.get("currency")).toBe("RUB");
    expect(rowOverride.searchParams.get("moneyPeriod")).toBe("month");
    expect(rowOverride.searchParams.get("moneyKind")).toBe("net");
    expect(rowOverride.searchParams.get("technologies")).toBe("Python");
  });

  it("groups recognized money dimension aliases while keeping custom values exact", () => {
    const observed = moneyDimensionOptions([
      { currency: "CHF", period: "YEAR", kind: "GROSS", count: 3 },
      { currency: "RUR", period: "year", kind: "gross", count: 2 },
      { currency: "KZT", period: "MONTH", kind: "NET", count: 1 },
      { currency: "RUB", period: "month", kind: "net", count: 1 },
      { currency: "GBP", period: "HOUR", kind: "SALARY", count: 1 },
      { currency: "EUR", period: "FORTNIGHT", kind: "desired-upper-bound", count: 1 }
    ], { currency: "JPY", moneyPeriod: "YEAR", moneyKind: "GROSS" });
    expect(observed.currencies).toEqual(expect.arrayContaining(["CHF", "RUR", "KZT", "RUB", "GBP", "EUR", "JPY", "USD"]));
    expect(observed.periods.filter((value) => value === "year")).toHaveLength(1);
    expect(observed.periods.filter((value) => value === "month")).toHaveLength(1);
    expect(observed.periods).toEqual(expect.arrayContaining(["year", "month", "FORTNIGHT"]));
    expect(observed.periods).not.toEqual(expect.arrayContaining(["YEAR", "MONTH"]));
    expect(observed.kinds.filter((value) => value === "gross")).toHaveLength(1);
    expect(observed.kinds.filter((value) => value === "net")).toHaveLength(1);
    expect(observed.kinds).toEqual(expect.arrayContaining(["gross", "net", "salary", "desired-upper-bound"]));
    expect(observed.kinds).not.toEqual(expect.arrayContaining(["budget", "rate"]));
    expect(formatMetric("period", "YEAR")).toBe("Год");
    expect(formatMetric("period", "HOURLY", "en")).toBe("Hour");
    expect(formatMetric("kind", "GROSS", "en")).toBe("Gross");
    expect(moneyDimensionFilterValue("period", "HOURLY")).toBe("hour");
    expect(moneyDimensionFilterValue("period", "FORTNIGHT")).toBe("FORTNIGHT");
    expect(moneyDimensionFilterValue("kind", "desired-upper-bound")).toBe("desired-upper-bound");
    const narrowed = moneyDimensionOptions([{ currency: "EUR", period: "PROJECT", kind: "net", count: 2 }]);
    expect(mergeMoneyDimensionOptions(observed, narrowed)).toEqual({
      currencies: expect.arrayContaining(["CHF", "JPY", "EUR"]),
      periods: expect.arrayContaining(["year", "FORTNIGHT", "project"]),
      kinds: expect.arrayContaining(["gross", "desired-upper-bound", "net"])
    });
  });

  it("drills down historical personal stages without requiring a current status or recent arrival", () => {
    const url = new URL(buildPersonalEventDrilldown({ period: "custom", from: "2026-10-01", to: "2026-10-03", includeClosed: true }, "Reviewed", { status: "Reviewed", type: "tender" }), "http://localhost");
    expect(url.pathname).toBe("/tenders");
    expect(url.searchParams.get("profileScope")).toBe("all");
    expect(url.searchParams.get("pipelineReachedStatuses")).toBe("Reviewed");
    expect(url.searchParams.get("pipelineReachedTo")).toBe("2026-10-03T23:59:59.999Z");
    expect(url.searchParams.has("firstSeenFrom")).toBe(false);
    expect(url.searchParams.has("pipelineStatuses")).toBe(false);
    expect(url.searchParams.get("status")).toBe("Active,Closed,Expired,Removed,Unknown");
    expect(url.searchParams.has("archive")).toBe(false);
  });

  it("uses the actual weekly activity interval and exact Applied response stage", () => {
    const filters = { period: "custom" as const, from: "2026-09-01T12:00:00.000Z", to: "2026-10-03T12:00:00.000Z", profileId: "profile-1" };
    const row = { date: "2026-09-28", from: "2026-09-28T00:00:00.000Z", to: "2026-10-03T12:00:00.000Z" };
    const activity = new URL(buildActivityTimeseriesDrilldown(filters, row, "responses"), "http://localhost");
    expect(activity.searchParams.get("pipelineReachedStatuses")).toBe("Applied");
    expect(activity.searchParams.get("pipelineReachedTo")).toBe(row.to);
    expect(activity.searchParams.get("profileId")).toBe("profile-1");
    const found = new URL(buildActivityTimeseriesDrilldown(filters, row, "found"), "http://localhost");
    expect(found.searchParams.get("firstSeenFrom")).toBe(row.from);
    expect(found.searchParams.get("firstSeenTo")).toBe(row.to);
  });

  it("keeps source identity independent of catalog grouping and preserves semantic facets", () => {
    const source = new URL(buildOpportunityDrilldown({ period: "30d" }, { sourceId: "manual", group: "Manual import" }), "http://localhost");
    expect(source.searchParams.get("sourceIds")).toBe("manual");
    expect(source.searchParams.has("sourceGroups")).toBe(false);
    const unknown = new URL(buildOpportunityDrilldown({ period: "30d" }, { sourceGroup: "unknown", country: "unknown", currency: "unknown" }), "http://localhost");
    expect(unknown.searchParams.get("sourceGroups")).toBe("unknown");
    expect(unknown.searchParams.get("countriesAllowed")).toBe("unknown");
    expect(unknown.searchParams.get("currency")).toBe("unknown");
    expect(formatMetric("country", "unknown")).toBe("Не указан");
    expect(formatMetric("period", "month", "en")).toBe("Month");
  });
});
