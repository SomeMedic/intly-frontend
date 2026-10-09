import { describe, expect, it } from "vitest";
import { editorEntryCtaLabel, editorTargetTabForOpportunity } from "./opportunity-editor-entry";

describe("opportunity editor entry point", () => {
  it("routes vacancy and freelance to response editor and tender to application editor", () => {
    expect(editorTargetTabForOpportunity("vacancy")).toBe("response");
    expect(editorTargetTabForOpportunity("freelance")).toBe("response");
    expect(editorTargetTabForOpportunity("tender")).toBe("application");
  });

  it("uses opportunity-specific CTA labels", () => {
    expect(editorEntryCtaLabel("vacancy", "ru")).toBe("Подготовить отклик");
    expect(editorEntryCtaLabel("freelance", "ru")).toBe("Подготовить предложение");
    expect(editorEntryCtaLabel("tender", "ru")).toBe("Подготовить заявку");
    expect(editorEntryCtaLabel("vacancy", "en")).toBe("Prepare response");
    expect(editorEntryCtaLabel("freelance", "en")).toBe("Prepare proposal");
    expect(editorEntryCtaLabel("tender", "en")).toBe("Prepare application");
  });
});
