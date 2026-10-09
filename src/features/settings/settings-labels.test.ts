import { describe, expect, it } from "vitest";
import { apiTokenScopeLabels, booleanStatusLabels, digestModeLabels, resolveSettingsLocale, webhookEventLabels } from "./settings-labels";

describe("settings labels", () => {
  it("resolves Russian as fallback and English explicitly", () => {
    expect(resolveSettingsLocale("en")).toBe("en");
    expect(resolveSettingsLocale("ru")).toBe("ru");
    expect(resolveSettingsLocale(null)).toBe("ru");
  });

  it("labels notification and webhook states in both languages", () => {
    expect(digestModeLabels.ru.weekly).toBe("Еженедельно");
    expect(digestModeLabels.en.weekly).toBe("Weekly");
    expect(booleanStatusLabels.ru.disabled).toBe("Выключено");
    expect(booleanStatusLabels.en.disabled).toBe("Disabled");
    expect(webhookEventLabels.ru["notification.created"]).toBe("Уведомление создано");
    expect(webhookEventLabels.en["notification.created"]).toBe("Notification created");
  });

  it("labels API token scopes as user-readable permissions", () => {
    expect(apiTokenScopeLabels.ru["write:resumes"]).toBe("Создавать и менять резюме");
    expect(apiTokenScopeLabels.en["write:resumes"]).toBe("Create and update resumes");
  });
});

