import { describe, expect, it } from "vitest";
import { factLabel, moneyLabel, opportunityPlaceLabel, type OpportunityRecord } from "./contracts";
import { factValueLabel, moneyLabelForLocale } from "./opportunity-workspace-labels";

describe("opportunity amounts from canonical API records", () => {
  it("shows an unspecified amount for absent or null bounds without crashing a new manual opportunity", () => {
    for (const money of [{}, { min: null, max: null }, { min: Number.NaN, max: Number.POSITIVE_INFINITY }]) {
      expect(moneyLabel(money as OpportunityRecord["money"], "ru")).toBe("Сумма не указана");
      expect(moneyLabelForLocale(money as OpportunityRecord["money"], "en")).toBe("Amount is not specified");
    }
  });

  it("preserves user freeform original text, zero and finite single-bound amounts", () => {
    for (const render of [moneyLabel, moneyLabelForLocale]) {
      expect(render({ originalText: "По договорённости", min: Number.NaN }, "ru")).toBe("По договорённости");
      expect(render({ originalText: "300000 RUR gross, net обсуждается", min: 300000, currency: "RUR", period: "MONTH" }, "ru")).toBe("300000 RUR gross, net обсуждается");
      expect(render({ originalText: "от 300000 RUB gross, премия отдельно", min: 300000, currency: "RUB" }, "ru")).toBe("от 300000 RUB gross, премия отдельно");
      expect(render({ min: 0, max: 2000, currency: "USD" }, "en")).toBe("0 – 2,000 USD");
      expect(render({ min: null, max: 2000, currency: "USD" } as OpportunityRecord["money"], "en")).toBe("up to 2,000 USD");
      expect(render({ min: 0, currency: "RUB" }, "ru")).toBe("от 0 ₽");
    }
  });

  it("formats generated source-schema money tokens using structured values", () => {
    const machine = { originalText: "260000 – 300000 RUR MONTH", min: 260000, max: 300000, currency: "RUR", period: "MONTH" } satisfies OpportunityRecord["money"];
    expect(moneyLabel(machine, "ru")).toBe("260 000 – 300 000 ₽ / месяц");
    expect(moneyLabel(machine, "en")).toBe("260,000 – 300,000 RUB / month");
    expect(moneyLabelForLocale(machine, "ru")).toBe("260 000 – 300 000 ₽ / месяц");
    expect(moneyLabelForLocale(machine, "en")).toBe("260,000 – 300,000 RUB / month");
    for (const render of [moneyLabel, moneyLabelForLocale]) {
      expect(render({ originalText: "от 250000 до 300000 RUB", min: 250000, max: 300000, currency: "RUB" }, "ru")).toBe("250 000 – 300 000 ₽");
      expect(render({ originalText: "от 250000 до 300000 RUB", min: 250000, max: 300000, currency: "RUB" }, "en")).toBe("250,000 – 300,000 RUB");
      expect(render({ originalText: "от 300000 до 300000 RUB", min: 300000, max: 300000, currency: "RUB" }, "ru")).toBe("300 000 ₽");
      expect(render({ originalText: "от 65000 RUB", min: 65000, currency: "RUB" }, "ru")).toBe("от 65 000 ₽");
      expect(render({ originalText: "до 90000 RUB", max: 90000, currency: "RUB" }, "en")).toBe("up to 90,000 RUB");
      expect(render({ originalText: "до 90000 RUB", max: 90000, currency: "RUB" }, "ru")).toBe("до 90 000 ₽");
      expect(render({ originalText: "от 65000 RUB", min: 65000, currency: "RUB" }, "en")).toBe("from 65,000 RUB");
      expect(render({ originalText: "Primary Location Base Pay Range: $176,200 USD - $264,400 USD", min: 176200, max: 264400, currency: "USD", period: "YEAR" }, "en")).toBe("176,200 – 264,400 USD / year");
      expect(render({ originalText: "Primary Location Base Pay Range: $176,200 USD - $264,400 USD", min: 176200, max: 264400, currency: "USD", period: "YEAR" }, "ru")).toBe("176 200 – 264 400 $ / год");
      expect(render({ originalText: "Primary Location Base Pay Range: $176,200 USD - $264,400 USD plus bonus/equity", min: 176200, max: 264400, currency: "USD", period: "YEAR" }, "en")).toBe("Primary Location Base Pay Range: $176,200 USD - $264,400 USD plus bonus/equity");
    }
  });

  it("normalizes periods, currencies and equal bounds without duplicate amounts", () => {
    for (const render of [moneyLabel, moneyLabelForLocale]) {
      expect(render({ min: 3000, max: 3000, currency: "RUB", period: "HOUR" }, "ru")).toBe("3 000 ₽ / час");
      expect(render({ min: 3000, max: 3000, currency: "RUR", period: "MONTH" }, "en")).toBe("3,000 RUB / month");
    }
  });
});

describe("opportunity source-schema fact labels", () => {
  it("normalizes known source tokens and preserves unknown public text", () => {
    expect(factLabel("TELECOMMUTE", "ru")).toBe("Удалённо");
    expect(factLabel("FULL_TIME", "en")).toBe("Full-time");
    expect(factLabel("PART_TIME", "ru")).toBe("Частичная занятость");
    expect(factLabel("CONTRACTOR", "en")).toBe("Contractor");
    expect(factValueLabel("TELECOMMUTE", "en")).toBe("Remote");
    expect(factValueLabel("Remote", "ru")).toBe("Удалённо");
    expect(factLabel("ft", "ru")).toBe("Полная занятость");
    expect(factLabel("SENIOR_LEVEL", "en")).toBe("Senior");
    expect(factValueLabel("ft", "en")).toBe("Full-time");
    expect(factValueLabel("SENIOR_LEVEL", "ru")).toBe("Senior");
    expect(factValueLabel("Head Office - Dublin, Remote", "ru")).toBe("Head Office - Dublin, Remote");
    expect(factValueLabel("some source text", "ru")).toBe("some source text");
  });

  it("keeps meaningful locations next to work format and deduplicates plain remote", () => {
    expect(opportunityPlaceLabel({ location: "Head Office - Dublin, Remote" }, "ru")).toBe("Head Office - Dublin, Remote");
    expect(opportunityPlaceLabel({ location: "USA, NY, New York City", remoteType: "Flex" }, "ru")).toBe("USA, NY, New York City · Flex");
    expect(opportunityPlaceLabel({ location: "Remote", remoteType: "TELECOMMUTE" }, "ru")).toBe("Удалённо");
    expect(opportunityPlaceLabel({ location: "Remote", remoteType: "TELECOMMUTE" }, "en")).toBe("Remote");
  });
});
