import { describe, expect, it } from "vitest";
import { applicationChecklist, documentTypeLabel, processingLabel, requirementStatusLabel, tenderDocuments, tenderDocumentReady, tenderRequirements } from "./tender-workspace-state";
import type { OpportunityRecord } from "./contracts";

const baseTender = {
  tenderData: {},
  sourceDocuments: [{ kind: "url", sourceId: "zakupki", label: "Публикация", url: "https://example.test/tender" }],
} satisfies Pick<OpportunityRecord, "tenderData" | "sourceDocuments">;

describe("TenderWorkspace helpers", () => {
  it("does not treat ordinary source URL as eligibility evidence", () => {
    expect(tenderDocuments(baseTender)).toHaveLength(1);
    expect(tenderRequirements(baseTender)).toEqual([]);
  });

  it("keeps requirements Unknown until explicit evidence exists", () => {
    const requirements = tenderRequirements({ tenderData: { requirements: ["Наличие опыта внедрения CRM"] } });
    expect(requirements).toEqual([{ id: "req-0", title: "Наличие опыта внедрения CRM", status: "Unknown", evidence: [] }]);
  });


  it("classifies explicit negative tender verdicts before positive substrings", () => {
    const requirements = tenderRequirements({
      tenderData: {
        requirements: [
          { id: "not-met", title: "No sanctions", status: "Not met", evidence: { excerpts: ["Supplier is under restrictions"] } },
          { id: "ru-negative", title: "License", status: "не соответствует", evidence: { excerpts: ["Лицензия не соответствует требованиям"] } },
        ],
      },
    });

    expect(requirements.map((item) => item.status)).toEqual(["Not met", "Not met"]);
  });

  it("keeps evidence with Unknown, no-data aliases, or missing verdict as Unknown", () => {
    const requirements = tenderRequirements({
      tenderData: {
        requirements: [
          { id: "unknown", title: "Experience", status: "Unknown", evidence: { excerpts: ["Experience clause found"] } },
          { id: "no-data", title: "Portfolio", status: "Нет данных", evidence: { excerpts: ["Данные не найдены"] } },
          { id: "not-checked", title: "License", status: "данные не проверены", evidence: { excerpts: ["Требование есть в документации"] } },
          { id: "ru-unknown", title: "Security", status: "неизвестно", evidence: { documentIds: ["doc-1"] } },
          { id: "missing", title: "Guarantee", evidence: { documentIds: ["doc-2"] } },
        ],
      },
    });

    expect(requirements.map((item) => item.status)).toEqual(["Unknown", "Unknown", "Unknown", "Unknown", "Unknown"]);
  });

  it("does not infer a verdict from free-form descriptions", () => {
    const requirements = tenderRequirements({
      tenderData: {
        requirements: [
          { id: "data-text", title: "Data package", status: "данные подходят для проверки позже", evidence: { excerpts: ["Описание содержит слово данные"] } },
          { id: "positive-word", title: "Fit note", status: "подходит только после ручной проверки", evidence: { excerpts: ["Свободное описание без enum verdict"] } },
        ],
      },
    });

    expect(requirements.map((item) => item.status)).toEqual(["Unknown", "Unknown"]);
  });

  it("keeps top-level eligibility evidence Unknown without explicit verdict", () => {
    const requirements = tenderRequirements({
      tenderData: { eligibilityEvidence: { excerpts: ["Требование найдено"] } },
    });

    expect(requirements).toHaveLength(1);
    expect(requirements[0].status).toBe("Unknown");
  });

  it("uses explicit excerpts/citations/documents as evidence for eligibility", () => {
    const requirements = tenderRequirements({
      tenderData: {
        requirements: [{ id: "exp", title: "Опыт аналогичных работ", status: "met", evidence: { excerpts: ["Договоры за 2024 год"], documentIds: ["doc-1"], citations: ["п. 3.2"] } }],
      },
    });
    expect(requirements[0].status).toBe("Met");
    expect(requirements[0].evidence.map((item) => item.label)).toEqual(["Выдержка 1", "Документ требований", "Цитата"]);
  });


  it("localizes tender helper labels in Russian and English", () => {
    expect(processingLabel("Indexed", "ru")).toBe("Готов");
    expect(processingLabel("Indexed", "en")).toBe("Ready");
    expect(requirementStatusLabel("Unknown", "ru")).toBe("Нет данных");
    expect(requirementStatusLabel("Unknown", "en")).toBe("No data");
    expect(documentTypeLabel("technical specification", "ru")).toBe("Техническое задание");
    expect(documentTypeLabel("technical specification", "en")).toBe("Technical specification");
    expect(applicationChecklist({ ...baseTender, id: "opp", type: "tender", title: "Tender", companyOrClient: "Client", description: "", skills: [], technologies: [], money: {}, sourceStatus: "Active", sourceOccurrences: [], firstSeenAt: "2026-10-02T00:00:00.000Z", vacancyData: {}, freelanceData: {} }, "en").map((item) => item.text)).toContain("Check the current tender document set");
  });

  it("extracts typed tender documents from tenderData and source documents", () => {
    const docs = tenderDocuments({
      tenderData: { documents: [{ title: "Техническое задание", fileId: "file-1", type: "technical specification", processingStatus: "indexed" }] },
      sourceDocuments: [{ kind: "url", sourceId: "platform", label: "Извещение", url: "https://example.test/notice" }],
    });
    expect(docs.map((doc) => [doc.label, doc.documentType, doc.processingStatus])).toEqual([
      ["Техническое задание", "technical specification", "indexed"],
      ["Извещение", "notice", "Source"],
    ]);
  });

  it("classifies native tender document labels from Roseltorg and zakupki", () => {
    const labels = [
      ["Проект государственного контракта", "draft_contract"],
      ["Техническое задание", "technical_specification"],
      ["Требования к содержанию и составу заявки", "participant_requirements"],
      ["Порядок рассмотрения и оценки заявок", "evaluation_criteria"],
      ["Заявка на определение поставщика", "application_form"],
      ["Локально-сметный расчет", "pricing_estimate"],
      ["Обоснование начальной (максимальной) цены контракта", "pricing_estimate"],
      ["Тех задание.docx", "technical_specification"],
      ["Форма_КП.xlsx", "application_form"],
    ];
    const docs = tenderDocuments({
      tenderData: {
        documents: labels.map(([label], index) => ({ label, url: `https://files.example.test/doc-${index}` })),
      },
      sourceDocuments: [],
    });

    expect(docs.map((doc) => [doc.label, doc.documentType])).toEqual(labels);
  });

  it("excludes native landing pages and deduplicates attachments with their actual occurrence source", () => {
    const docs = tenderDocuments({
      tenderData: { documents: [{ label: "Техническое задание", url: "https://files.example.test/spec.pdf", type: "technical_specification" }] },
      sourceOccurrences: [{ sourceId: "roseltorg", url: "https://www.roseltorg.ru/procedure/1/1", primary: true, status: "Active" }],
      sourceDocuments: [
        { kind: "url", sourceId: "roseltorg", label: "roseltorg", url: "https://www.roseltorg.ru/procedure/1/1" },
        { kind: "url", sourceId: "roseltorg", label: "spec.pdf", url: "https://files.example.test/spec.pdf" },
      ],
    });
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ sourceId: "roseltorg", documentType: "technical_specification", processingStatus: "Source" });
    expect(tenderRequirements({ tenderData: {} })).toEqual([]);
  });

  it("allows AI only for a linked Indexed document with actual extracted text", () => {
    expect(tenderDocumentReady({ tenderDocumentId: "doc", processingStatus: "Indexed", textReady: true })).toBe(true);
    for (const processingStatus of ["Uploading", "Parsing", "Chunking", "Embedding", "Indexing", "Failed", "Source"]) expect(tenderDocumentReady({ tenderDocumentId: "doc", processingStatus, textReady: true })).toBe(false);
    expect(tenderDocumentReady({ tenderDocumentId: "doc", processingStatus: "Indexed", textReady: false })).toBe(false);
    expect(tenderDocumentReady({ processingStatus: "Indexed", textReady: true })).toBe(false);
  });
});
