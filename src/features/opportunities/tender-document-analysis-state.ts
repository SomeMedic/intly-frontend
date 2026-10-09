import { z } from "zod";

const text = z.string().trim().min(1).max(2000);
const citation = z.object({
  tenderDocumentId: z.string().min(1).max(160),
  section: z.string().min(1).max(500).optional(),
  excerpt: text.optional(),
}).strict();
const fact = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  citations: z.array(citation).min(1).max(8),
}).strict();

const outputSchema = z.object({
  summary: text,
  aiScore: z.number().min(0).max(100).optional(),
  recommendation: z.string().max(2000).optional(),
  documents: z.array(z.object({
    tenderDocumentId: z.string().min(1).max(160),
    summary: text,
    keyRequirements: z.array(fact).max(50),
    dates: z.array(fact.extend({ date: z.string().min(1).max(120) })).max(30),
    risks: z.array(fact).max(30),
    requiredDocuments: z.array(fact).max(50),
    eligibilityReferences: z.array(fact).max(50),
    financialTerms: z.array(fact).max(30),
  }).strict()).min(1).max(50),
  crossDocumentFindings: z.array(z.object({
    title: z.string().min(1).max(500),
    description: text,
    type: z.enum(["conflicting_dates", "financial_mismatch", "scope_inconsistency", "other"]),
    citations: z.array(citation).min(2).max(12),
  }).strict()).max(50),
}).strict();

export type TenderAnalysisOutput = z.infer<typeof outputSchema>;
export type TenderAnalysisCitation = z.infer<typeof citation>;
export type TenderAnalysisFact = z.infer<typeof fact> & { date?: string };
export type TenderAnalysisRun = {
  id: string;
  status: string;
  stage?: string;
  output?: unknown;
  errorSummary?: string;
  completedAt?: string;
};

export function tenderAnalysisProviderNotConfigured(errorSummary?: string): boolean {
  return errorSummary?.trim() === "No AI route configured for tender_document_analysis";
}

export function tenderAnalysisStatus(status?: string): "queued" | "running" | "completed" | "failed" | "cancelled" | undefined {
  switch (status?.toLowerCase()) {
    case "queued": return "queued";
    case "running": return "running";
    case "completed": return "completed";
    case "failed": return "failed";
    case "cancelled": return "cancelled";
    default: return undefined;
  }
}

export function tenderAnalysisPending(status?: string): boolean {
  const normalized = tenderAnalysisStatus(status);
  return normalized === "queued" || normalized === "running";
}

export function readTenderAnalysis(output: unknown, documentIds: string[]): TenderAnalysisOutput | undefined {
  const parsed = outputSchema.safeParse(output);
  if (!parsed.success) return undefined;
  const allowed = new Set(documentIds);
  const seen = new Set<string>();
  for (const document of parsed.data.documents) {
    if (!allowed.has(document.tenderDocumentId) || seen.has(document.tenderDocumentId)) return undefined;
    seen.add(document.tenderDocumentId);
    const facts = [...document.keyRequirements, ...document.dates, ...document.risks, ...document.requiredDocuments, ...document.eligibilityReferences, ...document.financialTerms];
    if (facts.some((item) => item.citations.some((item) => !allowed.has(item.tenderDocumentId)))) return undefined;
  }
  if (parsed.data.crossDocumentFindings.some((item) => new Set(item.citations.map((item) => item.tenderDocumentId)).size < 2 || item.citations.some((item) => !allowed.has(item.tenderDocumentId)))) return undefined;
  return parsed.data;
}

export function safeDocumentSourceUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}
