import { describe, expect, it } from "vitest";
import { confidenceLabel, dedupReasonSummary, numberLabel } from "./admin-dedup-labels";

describe("admin dedup labels", () => {
  it("maps internal reasons into stable user-facing Russian labels", () => {
    expect(dedupReasonSummary(["text_candidate_requires_review", "semantic_evidence_requires_review", "text_candidate_requires_review"], "ru")).toEqual(["Текст похож, нужен ручной разбор", "AI-сравнение требует ручного решения"]);
  });

  it("maps current backend guard and semantic reason keys", () => {
    expect(dedupReasonSummary(["candidate_limit_reached", "descriptions_incompatible", "locations_incompatible"], "ru")).toEqual([
      "Слишком много похожих записей, нужен ручной выбор",
      "Описания противоречат друг другу",
      "Локации отличаются",
    ]);
    expect(dedupReasonSummary(["titles_not_similar_enough", "full_title_and_description_semantically_distinct"], "en")).toEqual([
      "Title is not similar enough",
      "AI sees the title and description as different postings",
    ]);
  });

  it("keeps unknown reasons localized with diagnostic code only", () => {
    expect(dedupReasonSummary(["custom_backend_reason"], "en")).toEqual(["Needs manual review (custom_backend_reason)"]);
    expect(dedupReasonSummary(["custom_backend_reason"], "ru")).toEqual(["Нужна ручная проверка (custom_backend_reason)"]);
    expect(dedupReasonSummary([], "en")).toEqual(["Needs manual review"]);
  });

  it("formats semantic confidence for the active locale", () => {
    expect(confidenceLabel(0.9823, "en")).toBe("98.2%");
    expect(confidenceLabel(null, "ru")).toBe("—");
  });

  it("formats large status counts for the active locale", () => {
    expect(numberLabel(118222, "en")).toBe("118,222");
    expect(numberLabel(118222, "ru").replace(/\s/g, " ")).toBe("118 222");
    expect(numberLabel(undefined, "ru")).toBe("0");
  });
});
