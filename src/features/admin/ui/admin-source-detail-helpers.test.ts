import { describe, expect, it } from "vitest";
import type { AdminSource, AdminSourceRun } from "@/types";
import { localDateTimeInputToIso, sourceCollectionSummary, sourceCredentialsState } from "./admin-source-detail-helpers";

function source(input: Partial<AdminSource> & { credentialsRequired?: boolean }): AdminSource & { credentialsRequired?: boolean } {
  return { id: "source-1", name: "Source", group: "web", connectorFamily: "PublicFeed", enabled: true, ...input } as AdminSource & { credentialsRequired?: boolean };
}

describe("sourceCredentialsState", () => {
  it("distinguishes public, configured and missing credentials", () => {
    expect(sourceCredentialsState(source({ credentialsRequired: false, credentialsConfigured: false }), "ru")).toBe("Публичный / не требуются");
    expect(sourceCredentialsState(source({ credentialsRequired: true, credentialsConfigured: true }), "en")).toBe("Configured");
    expect(sourceCredentialsState(source({ credentialsRequired: true, credentialsConfigured: false }), "ru")).toBe("Отсутствуют");
  });
});

describe("sourceCollectionSummary", () => {
  const run = (input: Partial<AdminSourceRun> = {}): AdminSourceRun => ({ id: "run-1", sourceId: "arc", status: "Succeeded", runType: "backfill", createdAt: "2026-10-06T12:00:00Z", stats: { upserted: 60 }, ...input });

  it("summarizes the server-selected latest collection run without scanning the current page", () => {
    const result = sourceCollectionSummary(run({ id: "latest", status: "Running" }), "ru");
    expect(result?.runId).toBe("latest");
    expect(result?.title).toBe("Сбор продолжается");
  });

  it("shows account access only for an explicit checkpoint boundary", () => {
    const result = sourceCollectionSummary(run({ status: "Failed", checkpointAfter: { hasMore: false, incomplete: true, terminalReason: "native-public-registration-boundary", windowSince: "2026-09-06T12:00:00Z", windowUntil: "2026-10-06T12:00:00Z" } }), "ru");
    expect(result?.title).toBe("Для полного каталога нужен аккаунт");
    expect(result?.processed).toBe(60);
    expect(result?.incomplete).toBe(true);
    expect(result?.windowUntil).toBe("2026-10-06T12:00:00Z");
  });

  it("does not infer a required account from a generic pagination failure", () => {
    const result = sourceCollectionSummary(run({ status: "Failed", checkpointAfter: { hasMore: false, incomplete: true, terminalReason: "native-catalog-pagination-unverified" } }), "en");
    expect(result?.title).toBe("Collection is incomplete");
    expect(result?.description).not.toContain("account");
  });

  it("does not treat Succeeded with remaining pages as complete", () => {
    expect(sourceCollectionSummary(run({ checkpointAfter: { hasMore: true } }), "en")?.incomplete).toBe(true);
  });

  it("describes finite success as scoped and preserves zero counts", () => {
    const result = sourceCollectionSummary(run({ stats: { upserted: 0 }, checkpointAfter: { hasMore: false }, requestMetadata: { backfillSince: "2026-09-06T12:00:00Z" } }), "en");
    expect(result?.title).toBe("Available collection completed");
    expect(result?.description).toContain("entire platform");
    expect(result?.processed).toBe(0);
    expect(result?.windowSince).toBe("2026-09-06T12:00:00Z");
  });

  it("omits the summary when no collection was observed", () => {
    expect(sourceCollectionSummary(null, "ru")).toBeUndefined();
  });
});

describe("localDateTimeInputToIso", () => {
  it("converts a datetime-local value from browser local time to ISO UTC", () => {
    expect(localDateTimeInputToIso("2026-10-06T12:34")).toBe(new Date(2026, 9, 6, 12, 34).toISOString());
  });

  it("omits empty or invalid datetime filters", () => {
    expect(localDateTimeInputToIso("")).toBeUndefined();
    expect(localDateTimeInputToIso("not-a-date")).toBeUndefined();
  });
});
