import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { adminApi } from "./admin-api";

vi.mock("@/services/api", () => ({ api: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }));

describe("Admin source catalog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads entries after the first page and retains the catalog total", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: `source-${index}` }));
    vi.mocked(api.get).mockResolvedValueOnce({ items: firstPage, total: 103, nextCursor: "workingnomads" });
    vi.mocked(api.get).mockResolvedValueOnce({ items: [{ id: "workspace" }, { id: "ycombinator" }, { id: "zakupki" }], total: 3, nextCursor: null });
    const result = await adminApi.sources.list();
    expect(result.items).toHaveLength(103);
    expect(result.items.at(-1)?.id).toBe("zakupki");
    expect(result.total).toBe(103);
    expect(result.nextCursor).toBeNull();
    expect(api.get).toHaveBeenNthCalledWith(1, "/admin/sources");
    expect(api.get).toHaveBeenNthCalledWith(2, "/admin/sources?cursor=workingnomads");
  });

  it("fails clearly when a cursor repeats instead of looping forever", async () => {
    vi.mocked(api.get).mockResolvedValue({ items: [], nextCursor: "stuck" });
    await expect(adminApi.sources.list()).rejects.toThrow("Source catalog pagination did not advance");
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("requests paged source runs and preserves legacy sourceId calls", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ items: [{ id: "run-1" }], nextCursor: "cursor-2", latestCollectionRun: { id: "collection-1", runType: "backfill" } });
    const first = await adminApi.sources.runs({ sourceId: "source/1", status: "Failed", cursor: "cursor-1", limit: 50 });
    expect(first.latestCollectionRun?.id).toBe("collection-1");
    expect(api.get).toHaveBeenCalledWith("/admin/sources/runs?sourceId=source%2F1&status=Failed&cursor=cursor-1&limit=50");

    vi.mocked(api.get).mockResolvedValueOnce({ items: [], nextCursor: null, latestCollectionRun: null });
    await adminApi.sources.runs("source/1");
    expect(api.get).toHaveBeenCalledWith("/admin/sources/runs?sourceId=source%2F1");
  });

  it("requests source inspector logs, samples and reindex with the backend contract", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      source: { id: "source/1", name: "Source", group: "web", connectorFamily: "PublicFeed", enabled: true },
      logs: { checkedAt: "2026-10-06T00:00:00.000Z", status: "available", retentionDays: 30, items: [], nextCursor: "cursor-2" },
      filters: { sourceId: "source/1", runId: "run-1", level: "error", from: "2026-10-01T00:00", to: "2026-10-06T00:00", query: "timeout", limit: 50 },
    });
    const logs = await adminApi.sources.logs("source/1", { runId: "run-1", level: "error", from: "2026-10-01T00:00", to: "2026-10-06T00:00", query: "timeout", cursor: "cursor-1", limit: 50 });
    expect(logs.logs.status).toBe("available");
    expect(logs.filters.from).toBe("2026-10-01T00:00");
    expect(api.get).toHaveBeenCalledWith("/admin/sources/source%2F1/logs?runId=run-1&level=error&from=2026-10-01T00%3A00&to=2026-10-06T00%3A00&query=timeout&cursor=cursor-1&limit=50");

    vi.mocked(api.get).mockResolvedValueOnce({
      source: { id: "source/1", name: "Source", group: "web", connectorFamily: "PublicFeed", enabled: true },
      items: [{ opportunity: { id: "opp-1", type: "vacancy", title: "Backend developer" }, occurrence: { sourceId: "source/1", externalId: "ext-1", hasRawPayload: true, hasSourceMetadata: false } }],
      nextCursor: "opp-2",
    });
    const samples = await adminApi.sources.samples("source/1", { cursor: "opp-0", limit: 20, includeRaw: "true" });
    expect(samples.items[0]?.occurrence.hasRawPayload).toBe(true);
    expect(api.get).toHaveBeenCalledWith("/admin/sources/source%2F1/samples?cursor=opp-0&limit=20&includeRaw=true");

    vi.mocked(api.get).mockResolvedValueOnce({
      source: { id: "source/1", name: "Source", group: "web", connectorFamily: "PublicFeed", enabled: true },
      capabilities: {
        sourceId: "source/1",
        supportedActions: ["reindex", "reprocess"],
        unavailableActions: [{ action: "normalize", reason: "No retained metadata" }],
        actions: {
          reindex: { supported: true, requiresOpportunity: true },
          reprocess: { supported: true, requiresOpportunity: true },
          normalize: { supported: false, requiresOpportunity: true, reason: "No retained metadata" },
          deduplicate: { supported: false, requiresOpportunity: true, reason: "No retained metadata" },
        },
      },
    });
    const capabilities = await adminApi.sources.toolCapabilities("source/1", { opportunityId: "opp-1" });
    expect(capabilities.capabilities.supportedActions).toContain("reprocess");
    expect(api.get).toHaveBeenCalledWith("/admin/sources/source%2F1/tools/capabilities?opportunityId=opp-1");

    vi.mocked(api.post).mockResolvedValueOnce({ status: "queued", action: "reindex", sourceId: "source/1", opportunityId: "opp-1", unavailableActions: [{ action: "normalize", reason: "No retained metadata" }] });
    const result = await adminApi.sources.reindexSample("source/1", "opp-1");
    expect(result.unavailableActions?.[0]).toMatchObject({ action: "normalize" });
    expect(api.post).toHaveBeenCalledWith("/admin/sources/source%2F1/tools/reindex", { opportunityId: "opp-1" });

    vi.mocked(api.post).mockResolvedValueOnce({ status: "queued", action: "reprocess", sourceId: "source/1", opportunityId: "opp-1" });
    await adminApi.sources.sourceTool("source/1", "reprocess", "opp-1");
    expect(api.post).toHaveBeenCalledWith("/admin/sources/source%2F1/tools/reprocess", { opportunityId: "opp-1" });
  });
});

describe("Admin reports API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes cursor and limit through report list requests", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ items: [], total: 51, nextCursor: "cursor-2" });
    await adminApi.reports.list({ status: "Open", type: "money", query: "python", cursor: "cursor-1", limit: 25 });
    expect(api.get).toHaveBeenCalledWith("/admin/reports?status=Open&type=money&query=python&cursor=cursor-1&limit=25");
  });

  it("sends null when report assignee is cleared", async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({ id: "report-1" });
    await adminApi.reports.update("report-1", { assignedAdminId: null });
    expect(api.patch).toHaveBeenCalledWith("/admin/reports/report-1", { assignedAdminId: null });
  });

  it("marks report bulk triage as explicitly confirmed", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ items: [] });
    await adminApi.reports.bulk({ ids: ["r1", "r2"], action: "resolve", reason: "same duplicate", confirmed: true });
    expect(api.post).toHaveBeenCalledWith("/admin/reports/bulk", { ids: ["r1", "r2"], action: "resolve", reason: "same duplicate", confirmed: true });
  });
});
