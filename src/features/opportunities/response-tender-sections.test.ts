import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import { ensureTenderApplicationSection, tenderApplicationSections } from "./response-tender-sections";
import { normalizeResponseChecklist, responseReadinessIssues } from "./response-panel-state";

const tender = { type: "tender" as const, tenderData: { requiredApplicationSections: ["application-summary", "technical-response"] } };
const text = (value: string): JSONContent => ({ type: "text", text: value });
const section = (type: string, value: string, id = type): JSONContent => ({ type: "semanticBlock", attrs: { semanticType: type, blockId: id }, content: [text(value)] });
const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });

describe("configured tender application sections", () => {
  it("requires meaningful text in each typed section and ignores headings, caches, and attributes", () => {
    const result = tenderApplicationSections(tender, doc(
      { type: "heading", attrs: { blockId: "title" }, content: [text("Technical response")] },
      section("application-summary", "Confirmed summary"),
      { ...section("technical-response", " \n\t "), attrs: { blockId: "technical", semanticType: "technical-response", label: "A complete technical proposal" } },
    ));
    expect(result.valid).toBe(true);
    expect(result.sections.map(item => item.complete)).toEqual([true, false]);
    expect(result.sections[1]).toMatchObject({ blockId: "technical", label: "Техническое предложение" });
  });

  it("accepts inline marks and legacy sections, deduplicates canonical requirements, and localizes labels", () => {
    const result = tenderApplicationSections({ ...tender, tenderData: { requiredApplicationSections: [" application-summary ", "technical-response", "technical-response"] } }, doc(
      { type: "application-summary", attrs: { id: "old-summary" }, content: [text("Summary")] },
      { type: "paragraph", attrs: { semanticType: " technical-response ", blockId: "tech" }, content: [{ ...text("Supported"), marks: [{ type: "bold" }] }, text(" proposal")] },
    ), "en");
    expect(result.sections).toHaveLength(2);
    expect(result.sections.every(item => item.complete)).toBe(true);
    expect(result.sections[0]).toMatchObject({ label: "Application summary", blockId: "old-summary" });
  });

  it("does not impose sections on unconfigured tenders, vacancies, or freelance proposals", () => {
    expect(tenderApplicationSections({ type: "tender", tenderData: {} }, doc()).sections).toEqual([]);
    for (const type of ["vacancy", "freelance"] as const) expect(tenderApplicationSections({ type, tenderData: tender.tenderData }, doc()).sections).toEqual([]);
  });

  it("fails closed for invalid canonical requirements", () => {
    for (const requiredApplicationSections of ["eligibility", ["eligibility", "unknown"], null]) {
      expect(tenderApplicationSections({ ...tender, tenderData: { requiredApplicationSections } }, doc())).toEqual({ valid: false, sections: [] });
    }
  });

  it("uses the explicit semantic type rather than a conflicting legacy node name", () => {
    const result = tenderApplicationSections({ ...tender, tenderData: { requiredApplicationSections: ["eligibility"] } }, doc({ type: "eligibility", attrs: { semanticType: "technical-response" }, content: [text("Technical text")] }));
    expect(result.sections[0].complete).toBe(false);
  });

  it("adds one empty addressable section without replacing existing text and reuses it on repeated navigation", () => {
    const original = doc({ type: "paragraph", attrs: { blockId: "original" }, content: [text("Keep my text")] });
    const result = ensureTenderApplicationSection(original, "technical-response", () => "new-section");
    expect(result.document.content?.[0]).toBe(original.content?.[0]);
    expect(result.document.content?.[1]).toEqual({ type: "semanticBlock", attrs: { blockId: "new-section", semanticType: "technical-response" }, content: [] });
    expect(tenderApplicationSections(tender, result.document).sections[1].complete).toBe(false);
    expect(ensureTenderApplicationSection(result.document, "technical-response", () => "duplicate")).toEqual(result);
  });

  it("prefers an existing filled section over duplicate empty ones and preserves its rich text", () => {
    const original = doc(section("technical-response", "", "empty"), section("technical-response", "Existing text", "filled"));
    const result = ensureTenderApplicationSection(original, "technical-response", () => "unused");
    expect(result).toEqual({ document: original, blockId: "filled" });
  });

  it("exposes a focus target for missing sections and plain status for invalid configuration", () => {
    const base = { hydrated: true, text: "Text", checklist: normalizeResponseChecklist({ factsChecked: true, requirementsCovered: true, noUnresolvedPlaceholders: true, userReviewed: true }), unresolvedPlaceholders: [], hasUnresolvedSuggestion: false };
    const result = tenderApplicationSections(tender, doc(section("application-summary", "Summary")));
    expect(responseReadinessIssues({ ...base, tenderSections: result.sections })).toEqual([{ id: "tender-section:technical-response", message: "Заполните раздел «Техническое предложение»", target: { kind: "tender-section", sectionType: "technical-response" } }]);
    const invalid = responseReadinessIssues({ ...base, tenderSectionsValid: false });
    expect(invalid).toHaveLength(1);
    expect(invalid[0]).not.toHaveProperty("target");
  });
});
