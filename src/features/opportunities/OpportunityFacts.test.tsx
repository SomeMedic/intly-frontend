import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OpportunityRecord } from "./contracts";

vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/services/api", () => ({ api: { download: vi.fn() } }));
vi.mock("@/services/files/download-file", () => ({ downloadStoredFile: vi.fn() }));

const { OpportunityFacts } = await import("./OpportunityFacts");

const baseTender: OpportunityRecord = {
  id: "opp-1",
  type: "tender",
  title: "Тендер",
  companyOrClient: "Заказчик",
  description: "",
  skills: [],
  technologies: [],
  money: {},
  sourceStatus: "Active",
  sourceOccurrences: [],
  sourceDocuments: [{ kind: "url", sourceId: "zakupki", label: "Публикация", url: "https://example.test/tender" }],
  firstSeenAt: "2026-10-02T00:00:00.000Z",
  vacancyData: {},
  freelanceData: {},
  tenderData: { procurementMethod: "Конкурс" },
};

const baseVacancy: OpportunityRecord = {
  ...baseTender,
  id: "opp-vacancy",
  type: "vacancy",
  title: "Вакансия",
  companyOrClient: "Компания",
  sourceDocuments: [{ kind: "url", sourceId: "hh", label: "Вакансия", url: "https://example.test/vacancy" }],
  vacancyData: { schedule: "Полный день" },
  tenderData: {},
};

const baseFreelance: OpportunityRecord = {
  ...baseTender,
  id: "opp-freelance",
  type: "freelance",
  title: "Проект",
  companyOrClient: "Клиент",
  sourceDocuments: [{ kind: "url", sourceId: "fl", label: "Проект", url: "https://example.test/freelance" }],
  freelanceData: { duration: "2 недели" },
  tenderData: {},
};

describe("OpportunityFacts", () => {
  it("does not treat ordinary source links as tender requirement evidence", () => {
    const html = renderToStaticMarkup(<OpportunityFacts opportunity={baseTender} sources={[{ id: "zakupki", name: "Zakupki", group: "web", status: "active", healthState: "ok", types: ["tender"] }]} />);

    expect(html).toContain("Нет подтверждения из документов требований");
    expect(html).not.toContain("Unknown —");
    expect(html).toContain("Публикация");
    expect(html).not.toContain("Eligibility");
    expect(html).not.toContain("canonical record");
    expect(html).not.toContain("source snapshots");
  });

  it("shows tender requirement evidence only from explicit citations or documents", () => {
    const html = renderToStaticMarkup(<OpportunityFacts opportunity={{
      ...baseTender,
      tenderData: {
        ...baseTender.tenderData,
        eligibility: "Подходит",
        eligibilityEvidence: {
          requirementDocumentIds: ["req-doc-1"],
          excerpts: ["Требуется опыт интеграции"],
          citations: [{ documentId: "req-doc-1", excerpt: "Пункт 4.2" }],
        },
      },
    }} />);

    expect(html).toContain("Подходит");
    expect(html).toContain("req-doc-1");
    expect(html).toContain("Требуется опыт интеграции");
    expect(html).not.toContain("{&quot;");
  });

  it.each([
    ["vacancy", { ...baseVacancy, vacancyData: undefined } as unknown as OpportunityRecord],
    ["freelance", { ...baseFreelance, freelanceData: undefined } as unknown as OpportunityRecord],
    ["tender", { ...baseTender, tenderData: undefined } as unknown as OpportunityRecord],
  ])("renders sparse %s typed data without invented facts", (_, opportunity) => {
    const html = renderToStaticMarkup(<OpportunityFacts opportunity={opportunity} />);

    expect(html).toContain("Факты возможности");
    expect(html).not.toContain("TypeError");
    expect(html).not.toContain("Бюджет</dt>");
    expect(html).not.toContain("Зарплата</dt>");
    expect(html).not.toContain("Способ закупки</dt>");
  });

  it("uses generic source-link copy for vacancy and freelance in Russian and English", () => {
    const vacancyRu = renderToStaticMarkup(<OpportunityFacts opportunity={baseVacancy} locale="ru" />);
    const freelanceEn = renderToStaticMarkup(<OpportunityFacts opportunity={baseFreelance} locale="en" />);

    expect(vacancyRu).toContain("Эти ссылки помогают открыть первоисточник и уточнить сведения из карточки.");
    expect(vacancyRu).not.toContain("Они не считаются подтверждением соответствия требованиям тендера");
    expect(freelanceEn).toContain("These links open the original source so you can check the details in this card.");
    expect(freelanceEn).not.toContain("They are not treated as proof of tender eligibility");
  });

  it("keeps tender-specific source-link copy separate from requirement evidence", () => {
    const html = renderToStaticMarkup(<OpportunityFacts opportunity={baseTender} locale="en" />);

    expect(html).toContain("These links open the original source. They are not treated as proof of tender eligibility without separate quotes or requirement documents.");
    expect(html).toContain("No confirmation from requirement documents");
    expect(html).not.toContain("These links open the original source so you can check the details in this card.");
  });

  it("renders native vacancy education and qualification facts", () => {
    const html = renderToStaticMarkup(<OpportunityFacts opportunity={{
      ...baseVacancy,
      vacancyData: {
        education: "Высшее",
        qualification: "Инженер-программист",
        workPlaces: ["Москва", "удалённо"],
        requirements: "Длинный текст требований остаётся в описании карточки",
        companyCode: "123",
        regionCode: "77",
      },
    }} />);

    expect(html).toContain("Образование");
    expect(html).toContain("Высшее");
    expect(html).toContain("Квалификация");
    expect(html).toContain("Инженер-программист");
    expect(html).toContain("Москва, удалённо");
    expect(html).not.toContain("Длинный текст требований остаётся в описании карточки");
    expect(html).not.toContain("companyCode");
    expect(html).not.toContain("regionCode");
  });

  it.each([
    ["ru", "Срок выполнения", "Требуемый опыт", "Часовой пояс заказчика", "Формат проекта"],
    ["en", "Delivery time", "Required experience", "Client time zone", "Project format"],
  ] as const)("renders declared freelance duration and conditions in %s", (locale, duration, experience, timezone, engagement) => {
    const html = renderToStaticMarkup(<OpportunityFacts opportunity={{ ...baseFreelance, freelanceData: {
      durationText: "90 дней", experienceText: "От 3 лет", clientTimezone: "UTC+3", engagementText: "Долгосрочное",
    } }} locale={locale} />);
    for (const label of [duration, experience, timezone, engagement]) expect(html).toContain(label);
    for (const value of ["90 дней", "От 3 лет", "UTC+3", "Долгосрочное"]) expect(html).toContain(value);
    expect(html).not.toContain("durationText</dt>");
    expect(html).not.toContain("clientTimezone</dt>");
  });
});
