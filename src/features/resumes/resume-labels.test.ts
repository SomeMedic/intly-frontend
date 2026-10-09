import { describe, expect, it } from "vitest";
import { adaptationFailureLabel, adaptationStatusLabels, pendingSuggestionLabel, resumeStatusLabels } from "./resume-labels";

describe("resume labels", () => {
  it("keeps status labels localized for ru and en", () => {
    expect(resumeStatusLabels.ru.draft).toBe("Черновик");
    expect(resumeStatusLabels.en.draft).toBe("Draft");
    expect(adaptationStatusLabels.ru.exported).toBe("Экспортировано");
    expect(adaptationStatusLabels.en.exported).toBe("Exported");
  });

  it("formats pending suggestion counts for both locales", () => {
    expect(pendingSuggestionLabel(1, "ru")).toBe("1 предложение на проверке");
    expect(pendingSuggestionLabel(3, "ru")).toBe("3 предложения на проверке");
    expect(pendingSuggestionLabel(12, "ru")).toBe("12 предложений на проверке");
    expect(pendingSuggestionLabel(1, "en")).toBe("1 pending suggestion");
    expect(pendingSuggestionLabel(2, "en")).toBe("2 pending suggestions");
  });

  it("turns provider failures into readable localized guidance without exposing technical details", () => {
    expect(adaptationFailureLabel("No AI route configured for resume_adaptation", "ru")).toContain("пока не подключён");
    expect(adaptationFailureLabel("API key is required", "en")).toContain("administrator");
    expect(adaptationFailureLabel("rate_limit_exceeded", "ru")).toContain("лимит запросов");
    expect(adaptationFailureLabel("Request timed out", "en")).toContain("did not respond");
    expect(adaptationFailureLabel("Internal error: private endpoint details", "ru")).not.toContain("private endpoint");
    expect(adaptationFailureLabel(undefined, "en")).toContain("edit the copy manually");
  });
});
