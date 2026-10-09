import { describe, expect, it } from "vitest";
import {
  factLabel,
  moneyLabel,
  resolveOpportunityTableLocale,
  stageLabelsByLocale,
  tableColumnsByLocale,
  toMini,
  type OpportunityRecord
} from "./contracts";

const baseOpportunity: OpportunityRecord = {
  id: "opportunity-1",
  type: "vacancy",
  title: "Backend Engineer",
  companyOrClient: "Acme",
  description: "Build APIs",
  skills: ["Node.js"],
  technologies: ["PostgreSQL"],
  remoteType: "remote",
  money: { min: 2000, max: 3000, currency: "USD", period: "month" },
  sourceStatus: "Active",
  sourceOccurrences: [{ sourceId: "manual", url: "https://example.com", primary: true, status: "Active" }],
  firstSeenAt: "2026-10-03T00:00:00.000Z",
  pipelineStatus: "Reviewed",
  vacancyData: {},
  freelanceData: {},
  tenderData: {}
};

describe("Opportunity table locale", () => {
  it("uses English table labels without changing saved field keys", () => {
    expect(resolveOpportunityTableLocale("en")).toBe("en");
    expect(resolveOpportunityTableLocale("fr")).toBe("ru");
    expect(tableColumnsByLocale.en).toMatchObject({ money: "Pay", source: "Sources", status: "Stage", firstSeen: "Added" });
    expect(Object.keys(tableColumnsByLocale.en)).toEqual(Object.keys(tableColumnsByLocale.ru));
  });

  it("formats table helper values in English when locale is English", () => {
    expect(stageLabelsByLocale.en.Reviewed).toBe("Reviewed");
    expect(factLabel("remote", "en")).toBe("Remote");
    expect(moneyLabel(baseOpportunity.money, "en")).toBe("2,000 – 3,000 USD / month");
    expect(toMini(baseOpportunity, [], "en")).toMatchObject({
      compensationLabel: "2,000 – 3,000 USD / month",
      source: { name: "Manual import" },
      pipelineStage: "Reviewed"
    });
  });
});
