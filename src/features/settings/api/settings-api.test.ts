import { describe, expect, it } from "vitest";
import { buildApiTokenCreatePayload, parseWebhookEvents } from "./settings-form";

describe("settings integration API helpers", () => {
  it("keeps webhook events inside the backend-supported event catalog", () => {
    expect(parseWebhookEvents("test, notification.created, admin.secret, response.submitted")).toEqual(["test", "notification.created", "response.submitted"]);
  });

  it("builds bounded API token creation payloads without a hardcoded expiry", () => {
    expect(buildApiTokenCreatePayload({ name: "  Local tool  ", scopes: ["read:profiles", "write:responses"], expiresInDays: 500 })).toEqual({
      name: "Local tool",
      scopes: ["read:profiles", "write:responses"],
      expiresInDays: 365
    });
    expect(buildApiTokenCreatePayload({ name: "Read only", scopes: [], expiresInDays: 0 }).scopes).toEqual(["read:opportunities"]);
  });
});

import { afterEach, vi } from "vitest";
import { api } from "@/services/api";
import { settingsApi } from "./settings-api";

vi.mock("@/services/api", () => ({ api: { get: vi.fn(), patch: vi.fn() } }));

afterEach(() => vi.restoreAllMocks());

describe("account preference request boundaries", () => {
  it("sends a minimal appearance patch without reading and replacing the dashboard", async () => {
    const get = vi.spyOn(api, "get");
    const patch = vi.spyOn(api, "patch").mockResolvedValue({ uiSettings: { themePack: "forest-teal", exportDefaults: { format: "xlsx" }, dashboard: { period: "30d" } } });
    const result = await settingsApi.updateSettings({ themePack: "forest-teal" });
    expect(get).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledWith("/me/settings", { uiSettings: { themePack: "forest-teal" } });
    expect(result.exportFormat).toBe("xlsx");
  });

  it("preserves distinct AI preferences and explicitly cleared custom prompt on save", async () => {
    const patch = vi.spyOn(api, "patch").mockResolvedValue({ aiPreferences: { language: "en", userPreferences: "Concise", userPrompt: "Legacy", customPrompt: "" } });
    const result = await settingsApi.updateAiPreferences({ userPreferences: "Concise", customPrompt: "" });
    expect(patch).toHaveBeenCalledWith("/me/settings", { aiPreferences: { userPreferences: "Concise", customPrompt: "" } });
    expect(result.userPreferences).toBe("Concise");
    expect(result.customPrompt).toBe("");
  });

  it("uses the legacy prompt only when the canonical custom prompt has not been set", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ aiPreferences: { userPrompt: "Legacy" } });
    expect(await settingsApi.aiPreferences()).toMatchObject({ userPreferences: "", customPrompt: "Legacy" });
  });
});
