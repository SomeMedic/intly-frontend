import { describe, expect, it } from "vitest";
import { commercialDraftFromInitial, commercialFieldsFromAnalysis, commercialInsertValue, commercialText, updateCommercialDraft } from "./response-commercial-state";

describe("response commercial state", () => {
  it("renders fixed pricing with shared estimated hours", () => {
    const text = commercialText({ mode: "fixed", price: " 120 000 ₽ ", rate: " 3000 ₽/ч ", hours: "40", duration: " 2 недели " }, "ru");

    expect(text).toContain("Модель оплаты: фиксированная.");
    expect(text).toContain("Стоимость проекта: 120 000 ₽.");
    expect(text).toContain("Оценка трудозатрат: 40 ч.");
    expect(text).toContain("Срок: 2 недели.");
    expect(text).not.toContain("Ставка");
  });

  it("renders only hourly pricing when hourly model is selected", () => {
    const text = commercialText({ mode: "hourly", price: "120 000 ₽", rate: "  $45/h  ", hours: " 30 h ", duration: "March" }, "en");

    expect(text).toContain("Pricing model: hourly.");
    expect(text).toContain("Rate: $45/h.");
    expect(text).toContain("Estimated effort: 30 h.");
    expect(text).toContain("Timeline: March.");
    expect(text).not.toContain("Project price");
  });

  it("preserves both price values while switching the selected model", () => {
    const fixed = commercialDraftFromInitial({ mode: "fixed", price: "1000", rate: "50/h" });
    const hourly = updateCommercialDraft(fixed, { mode: "hourly" });
    const fixedAgain = updateCommercialDraft(hourly, { mode: "fixed" });

    expect(hourly).toMatchObject({ mode: "hourly", price: "1000", rate: "50/h" });
    expect(commercialText(hourly, "en")).toContain("Rate: 50/h.");
    expect(commercialText(hourly, "en")).not.toContain("Project price");
    expect(fixedAgain).toMatchObject({ mode: "fixed", price: "1000", rate: "50/h" });
    expect(commercialText(fixedAgain, "en")).toContain("Project price: 1000.");
  });

  it("allows shared hours-only fixed terms but ignores inactive fixed rate", () => {
    expect(commercialInsertValue({ mode: "fixed", price: "   ", rate: "5000 ₽/ч", hours: " 16 ", duration: "" }, "ru")).toMatchObject({
      mode: "fixed",
      price: "",
      rate: "5000 ₽/ч",
      hours: "16",
      text: "Модель оплаты: фиксированная. Оценка трудозатрат: 16 ч.",
    });
    expect(commercialInsertValue({ mode: "fixed", price: "   ", rate: "5000 ₽/ч", hours: "   ", duration: " \n\t " }, "ru")).toBeNull();
  });

  it("extracts canonical nested type-specific commercial recommendations", () => {
    const fields = commercialFieldsFromAnalysis({
      typeSpecific: {
        commercial: {
          pricingModel: "hourly",
          recommendedPrice: "120 000 ₽",
          recommendedRate: "3000 ₽/ч",
          estimatedHours: 30,
          estimatedDuration: "2 недели",
        },
      },
    });

    expect(fields).toEqual({ mode: "hourly", price: "120 000 ₽", rate: "3000 ₽/ч", hours: "30", duration: "2 недели" });
    expect(commercialText(fields!, "ru")).toContain("Ставка: 3000 ₽/ч.");
    expect(commercialText(fields!, "ru")).not.toContain("Стоимость проекта");
  });

  it("keeps numeric zero and thirty hour estimates", () => {
    expect(commercialFieldsFromAnalysis({ typeSpecific: { commercial: { pricingModel: "fixed", estimatedHours: 0 } } })).toMatchObject({ mode: "fixed", hours: "0" });
    expect(commercialFieldsFromAnalysis({ typeSpecific: { commercial: { pricingModel: "fixed", estimatedHours: 30 } } })).toMatchObject({ mode: "fixed", hours: "30" });
  });

  it("infers hourly mode for canonical rate-only recommendations", () => {
    const fields = commercialFieldsFromAnalysis({
      typeSpecific: {
        commercial: {
          recommendedRate: "3000 ₽/ч",
        },
      },
    });

    expect(fields).toEqual({ mode: "hourly", price: "", rate: "3000 ₽/ч", hours: "", duration: "" });
    expect(commercialInsertValue(fields!, "ru")).toMatchObject({
      mode: "hourly",
      rate: "3000 ₽/ч",
      text: "Модель оплаты: почасовая. Ставка: 3000 ₽/ч.",
    });
  });

  it("infers hourly mode for rate and estimated hours through extract to insert", () => {
    const fields = commercialFieldsFromAnalysis({
      typeSpecific: {
        commercial: {
          recommendedRate: "3000 ₽/ч",
          estimatedHours: 30,
        },
      },
    });
    const draft = commercialDraftFromInitial(fields);
    const insert = commercialInsertValue(draft, "ru");

    expect(draft).toMatchObject({ mode: "hourly", price: "", rate: "3000 ₽/ч", hours: "30" });
    expect(insert).toMatchObject({
      mode: "hourly",
      price: "",
      rate: "3000 ₽/ч",
      hours: "30",
      text: "Модель оплаты: почасовая. Ставка: 3000 ₽/ч. Оценка трудозатрат: 30 ч.",
    });
  });

  it("adds localized units only for bare numeric estimated hours", () => {
    const canonical = commercialFieldsFromAnalysis({
      typeSpecific: {
        commercial: {
          recommendedRate: "3000 ₽/ч",
          estimatedHours: 24,
        },
      },
    });

    expect(canonical).toMatchObject({ mode: "hourly", hours: "24" });
    expect(commercialInsertValue(canonical!, "ru")).toMatchObject({
      hours: "24",
      text: "Модель оплаты: почасовая. Ставка: 3000 ₽/ч. Оценка трудозатрат: 24 ч.",
    });
    expect(commercialText({ mode: "fixed", price: "1000", hours: "0" }, "ru")).toContain("Оценка трудозатрат: 0 ч.");
    expect(commercialText({ mode: "fixed", price: "1000", hours: "2,5" }, "ru")).toContain("Оценка трудозатрат: 2,5 ч.");
    expect(commercialText({ mode: "hourly", rate: "$60/h", hours: "2.5" }, "en")).toContain("Estimated effort: 2.5 h.");
    expect(commercialText({ mode: "hourly", rate: "$60/h", hours: "2.5 h" }, "en")).toContain("Estimated effort: 2.5 h.");
    expect(commercialText({ mode: "fixed", price: "1000", hours: "примерно день" }, "ru")).toContain("Оценка трудозатрат: примерно день.");
  });

  it("returns null for unknown or empty analysis without explicit commercial fields", () => {
    expect(commercialFieldsFromAnalysis({ summary: "Budget around 100k", budget: "100k" })).toBeNull();
    expect(commercialFieldsFromAnalysis({ typeSpecific: { commercial: {} } })).toBeNull();
    expect(commercialFieldsFromAnalysis(undefined)).toBeNull();
  });

  it("extracts legacy explicit commercial aliases", () => {
    expect(commercialFieldsFromAnalysis({ commercialTerms: { fixedVsHourly: "fixed", price: "1000", hourlyRate: "50/h", hours: "8", timeline: "Friday" } })).toEqual({
      mode: "fixed",
      price: "1000",
      rate: "50/h",
      hours: "8",
      duration: "Friday",
    });
  });

  it("infers hourly for legacy rate-only aliases but keeps both amounts conservatively fixed", () => {
    expect(commercialDraftFromInitial({ rate: "50/h" })).toMatchObject({ mode: "hourly", rate: "50/h" });
    expect(commercialFieldsFromAnalysis({ commercialTerms: { hourlyRate: "50/h" } })).toMatchObject({ mode: "hourly", rate: "50/h" });
    expect(commercialFieldsFromAnalysis({ commercialTerms: { price: "1000", hourlyRate: "50/h" } })).toMatchObject({ mode: "fixed", price: "1000", rate: "50/h" });
  });

  it("returns a trimmed insert payload", () => {
    expect(commercialInsertValue({ mode: "hourly", rate: "  90 €/h ", hours: "  12  ", duration: " next week " }, "en")).toMatchObject({
      mode: "hourly",
      price: "",
      rate: "90 €/h",
      hours: "12",
      duration: "next week",
      text: "Pricing model: hourly. Rate: 90 €/h. Estimated effort: 12 h. Timeline: next week.",
    });
  });
});
