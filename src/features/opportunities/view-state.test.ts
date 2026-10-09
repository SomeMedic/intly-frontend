import { describe, expect, it } from "vitest";
import { buildOpportunityQuery, defaultSavedViewUrl, filterLabel, filterValueLabel, savedViewPayload, savedViewUrl } from "./view-state";
import type { SavedView } from "@/types";

describe("Opportunity view criteria persistence", () => {
  it("labels the archive filter as closed records instead of an include-closed toggle", () => {
    expect(filterLabel("archive", "ru")).toBe("Закрытые записи");
    expect(filterLabel("archive", "en")).toBe("Closed records");
  });

  it("formats money and date filter chip values without changing the stored query values", () => {
    expect(filterValueLabel("moneyPeriod", "year", {}, "ru")).toBe("Год");
    expect(filterValueLabel("moneyPeriod", "YEAR", {}, "en")).toBe("Year");
    expect(filterValueLabel("moneyKind", "gross", {}, "ru")).toBe("До вычетов");
    expect(filterValueLabel("moneyKind", "FORTNIGHT", {}, "ru")).toBe("FORTNIGHT");
    expect(filterValueLabel("currency", "XTS", {}, "ru")).toBe("XTS");
    expect(filterValueLabel("firstSeenFrom", "2026-09-06T13:14:30.138Z", {}, "ru")).not.toContain(".138");
  });

  it("opens the default view for its own bare feed without replacing explicit navigation", () => {
    const views: SavedView[] = [
      { id: "all-default", name: "All", scope: "opportunities", isDefault: true, filters: { favorite: true } },
      { id: "jobs-default", name: "Jobs", scope: "vacancies", isDefault: true, query: { profileId: "profile-a" }, filters: { remoteType: "remote" } },
    ];
    const restored = new URL(defaultSavedViewUrl(views, "/vacancies", new URLSearchParams())!, "http://intly.local");
    expect(restored.searchParams.get("view")).toBe("jobs-default");
    expect(restored.searchParams.get("profileId")).toBe("profile-a");
    expect(defaultSavedViewUrl(views, "/tenders", new URLSearchParams())).toBeNull();
    const explicitCriteria: Record<string, string>[] = [{ q: "Python" }, { view: "another" }, { add: "true" }, { minMatch: "75" }, { mode: "table" }];
    for (const params of explicitCriteria) {
      expect(defaultSavedViewUrl(views, "/vacancies", new URLSearchParams(params))).toBeNull();
    }
  });
  it("round-trips private false flags, multi-selects, profile and ordered sort without API/UI-only parameters", () => {
    const rules = JSON.stringify([{ field: "moneyMax", direction: "desc" }, { field: "deadlineAt", direction: "asc" }]);
    const params = new URLSearchParams({ q: "Python API", hidden: "false", favorite: "true", sourceIds: "hh,manual", minMatch: "75", advancedSort: rules, mode: "table", view: "old-view", add: "true", cursor: "stale" });
    const payload = savedViewPayload(params, "vacancies", "  Удалённо  ", "profile-a", "vacancy");
    expect(payload).toMatchObject({ name: "Удалённо", query: { query: "Python API", profileId: "profile-a", type: "vacancy" }, filters: { hidden: false, favorite: true, sourceIds: ["hh", "manual"], minMatch: 75 }, sort: { advancedSort: rules }, mode: "table" });
    const restored = new URL(savedViewUrl({ ...payload, id: "view-a" } as SavedView), "http://intly.local");
    expect(restored.pathname).toBe("/vacancies");
    const request = buildOpportunityQuery(restored.searchParams, restored.searchParams.get("profileId")!, "vacancy");
    expect(Object.fromEntries(request)).toMatchObject({ hidden: "false", favorite: "true", sourceIds: "hh,manual", minMatch: "75", advancedSort: rules, query: "Python API" });
    expect(request.has("view")).toBe(false);
    expect(request.has("cursor")).toBe(false);
    expect(request.has("add")).toBe(false);
  });
  it("lets an explicitly removed filter remain removed after opening a saved view", () => {
    const restored = new URL(savedViewUrl({ id: "v", name: "Фильтр", scope: "opportunities", query: {}, filters: { remoteType: "remote", favorite: true } }), "http://intly.local");
    restored.searchParams.delete("favorite");
    const request = buildOpportunityQuery(restored.searchParams, "p");
    expect(request.get("remoteType")).toBe("remote");
    expect(request.has("favorite")).toBe(false);
    expect(request.has("viewId")).toBe(false);
  });
  it("does not accept an arbitrary saved configuration as API criteria", () => {
    const restored = new URL(savedViewUrl({ id: "v", name: "x", scope: "opportunities", filters: { userId: "another-owner", rawPayload: "secret", sourceIds: ["hh"] } }), "http://intly.local");
    expect(restored.searchParams.has("userId")).toBe(false);
    expect(restored.searchParams.has("rawPayload")).toBe(false);
    expect(buildOpportunityQuery(restored.searchParams).get("sourceIds")).toBe("hh");
  });
  it("restores explicit columns and bounded widths without sending them as filters", () => {
    const params = new URLSearchParams({ mode: "table", fields: "ai,money,forbidden", columnWidths: JSON.stringify({ title: 1, ai: 96, money: 5000, forbidden: 300 }) });
    const payload = savedViewPayload(params, "opportunities", "Моя таблица");
    const restored = new URL(savedViewUrl({ ...payload, id: "table" } as SavedView), "http://intly.local");
    expect(restored.searchParams.get("fields")).toBe("ai,money");
    expect(JSON.parse(restored.searchParams.get("columnWidths")!)).toEqual({ title: 240, ai: 96, money: 800 });
    expect(buildOpportunityQuery(restored.searchParams).has("fields")).toBe(false);
    expect(buildOpportunityQuery(restored.searchParams).has("columnWidths")).toBe(false);
    const empty = savedViewPayload(new URLSearchParams({ fields: "none" }), "opportunities", "Только название");
    expect(new URL(savedViewUrl({ ...empty, id: "empty" } as SavedView), "http://intly.local").searchParams.get("fields")).toBe("none");
  });
  it("keeps historical analytics filters through request building and saved views", () => {
    const params = new URLSearchParams({ profileScope: "all", pipelineReachedStatuses: "Applied,Won", pipelineReachedFrom: "2026-10-01", pipelineReachedTo: "2026-10-03", moneyPeriod: "month", moneyKind: "salary", role: "Backend Engineer" });
    const request = buildOpportunityQuery(params, "active-profile");
    expect(request.get("profileScope")).toBe("all");
    expect(request.has("profileId")).toBe(false);
    expect(request.get("pipelineReachedStatuses")).toBe("Applied,Won");
    expect(request.get("pipelineReachedFrom")).toBe("2026-10-01");
    expect(request.get("moneyPeriod")).toBe("month");
    const view = { ...savedViewPayload(params, "opportunities", "Исторические отклики"), id: "historical" } as SavedView;
    expect(new URL(savedViewUrl(view), "http://intly.local").searchParams.get("pipelineReachedStatuses")).toBe("Applied,Won");
  });
});
