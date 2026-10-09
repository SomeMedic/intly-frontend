import { describe, expect, it } from "vitest";
import { readTenderAnalysis, safeDocumentSourceUrl, tenderAnalysisPending, tenderAnalysisProviderNotConfigured, tenderAnalysisStatus } from "./tender-document-analysis-state";

const document = { tenderDocumentId: "doc-1", summary: "Supplier requirements", keyRequirements: [{ title: "License", citations: [{ tenderDocumentId: "doc-1", section: "3.2", excerpt: "A license is required" }] }], dates: [], risks: [], requiredDocuments: [], eligibilityReferences: [], financialTerms: [] };
const output = { summary: "One ready document", documents: [document], crossDocumentFindings: [] };

describe("tender analysis presentation boundary", () => {
  it("polls the actual lower-case backend run lifecycle and stops at every terminal state", () => {
    for (const status of ["queued", "running"]) expect(tenderAnalysisPending(status)).toBe(true);
    for (const status of ["completed", "failed", "cancelled"]) {
      expect(tenderAnalysisPending(status)).toBe(false);
      expect(tenderAnalysisStatus(status)).toBe(status);
    }
    expect(tenderAnalysisStatus("Completed")).toBe("completed");
    expect(tenderAnalysisStatus("Cancelled")).toBe("cancelled");
    for (const status of [undefined, "unknown", "success", "complete"]) {
      expect(tenderAnalysisPending(status)).toBe(false);
      expect(tenderAnalysisStatus(status)).toBeUndefined();
    }
  });
  it("retains cited facts and source calendar dates without converting them into timestamps", () => {
    const value = readTenderAnalysis({ ...output, documents: [{ ...document, dates: [{ title: "Submission", date: "19 October 2026, 10:00 MSK", citations: [{ tenderDocumentId: "doc-1" }] }] }] }, ["doc-1"]);
    expect(value?.documents[0].dates[0].date).toBe("19 October 2026, 10:00 MSK");
    expect(value?.documents[0].keyRequirements[0].citations[0].section).toBe("3.2");
  });
  it("rejects references to inaccessible documents, duplicate results and uncited claims", () => {
    expect(readTenderAnalysis(output, ["another-profile-document"])).toBeUndefined();
    expect(readTenderAnalysis({ ...output, documents: [document, document] }, ["doc-1"])).toBeUndefined();
    expect(readTenderAnalysis({ ...output, documents: [{ ...document, risks: [{ title: "Unverified", citations: [] }] }] }, ["doc-1"])).toBeUndefined();
    expect(readTenderAnalysis({ ...output, crossDocumentFindings: [{ title: "Conflict", description: "Different terms", type: "other", citations: [{ tenderDocumentId: "foreign" }] }] }, ["doc-1"])).toBeUndefined();
  });
  it("does not convert legacy opportunity analysis or arbitrary AI URLs into document findings", () => {
    expect(readTenderAnalysis({ summary: "Legacy", risks: [{ title: "Risk" }] }, ["doc-1"])).toBeUndefined();
    expect(readTenderAnalysis({ ...output, documents: [{ ...document, keyRequirements: [{ title: "License", citations: [{ tenderDocumentId: "doc-1", url: "https://untrusted.test" }] }] }] }, ["doc-1"])).toBeUndefined();
  });
  it("links only HTTP source URLs without credentials", () => {
    expect(safeDocumentSourceUrl("https://zakupki.gov.ru/file?id=1")).toBe("https://zakupki.gov.ru/file?id=1");
    for (const url of ["javascript:alert(1)", "file:///private/document.pdf", "https://user:secret@example.test", "broken"]) expect(safeDocumentSourceUrl(url)).toBeUndefined();
  });
  it("recognizes only the known missing AI provider route failure", () => {
    expect(tenderAnalysisProviderNotConfigured("No AI route configured for tender_document_analysis")).toBe(true);
    expect(tenderAnalysisProviderNotConfigured("  No AI route configured for tender_document_analysis  ")).toBe(true);
    expect(tenderAnalysisProviderNotConfigured("No AI route configured for editor_transform")).toBe(false);
    expect(tenderAnalysisProviderNotConfigured("AI provider quota exceeded")).toBe(false);
    expect(tenderAnalysisProviderNotConfigured()).toBe(false);
  });
});
