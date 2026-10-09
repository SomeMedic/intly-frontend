"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/intly/error-state";
import { api } from "@/services/api";
import { downloadStoredFile } from "@/services/files/download-file";
import type { OpportunityLocale } from "./opportunity-workspace-labels";
import type { TenderDocument } from "./tender-workspace-state";
import { readTenderAnalysis, safeDocumentSourceUrl, tenderAnalysisPending, tenderAnalysisProviderNotConfigured, tenderAnalysisStatus, type TenderAnalysisCitation, type TenderAnalysisFact, type TenderAnalysisRun } from "./tender-document-analysis-state";

const copy = {
  ru: {
    title: "AI-разбор документов", close: "Закрыть AI-разбор", loading: "Загружаем анализ…",
    queued: "Анализ ожидает запуска", running: "Читаем документы и сопоставляем условия…",
    failed: "Анализ не завершён", retry: "Обновить", completed: "Готов", cancelled: "Анализ отменён",
    providerNotConfigured: "AI-разбор документов не настроен. Администратору нужно подключить AI-провайдера для анализа документов.",
    verify: "Проверить в документах", note: "Выводы AI помогают подготовиться к участию. Сверьте условия по приведённым документам и пунктам.",
    incompatible: "Для этого результата нет структурированного разбора. Запустите анализ документов снова.",
    requirements: "Ключевые требования", dates: "Даты и сроки", risks: "Риски", requiredDocuments: "Документы для заявки",
    eligibility: "Условия участия", financial: "Финансовые условия", cross: "Расхождения между документами",
    noFindings: "В этом разделе сведения не выделены.", citations: "Документы и выдержки", download: "Скачать документ", open: "Открыть оригинал",
  },
  en: {
    title: "AI document analysis", close: "Close AI analysis", loading: "Loading analysis…",
    queued: "Analysis is queued", running: "Reading documents and comparing terms…",
    failed: "Analysis did not complete", retry: "Refresh", completed: "Ready", cancelled: "Analysis was cancelled",
    providerNotConfigured: "AI document analysis is not configured. An administrator needs to connect an AI provider for document analysis.",
    verify: "Verify in the documents", note: "AI findings help with preparation. Check the terms against the cited documents and sections.",
    incompatible: "This result has no structured document analysis. Run document analysis again.",
    requirements: "Key requirements", dates: "Dates and deadlines", risks: "Risks", requiredDocuments: "Application documents",
    eligibility: "Eligibility conditions", financial: "Financial terms", cross: "Cross-document findings",
    noFindings: "No information was extracted for this section.", citations: "Documents and excerpts", download: "Download document", open: "Open original",
  },
};

export function TenderDocumentAnalysis({ opportunityId, documentId, documents, locale, onClose }: {
  opportunityId: string; documentId: string; documents: TenderDocument[]; locale: OpportunityLocale; onClose: () => void;
}) {
  const labels = copy[locale];
  const query = useQuery({
    queryKey: ["tender-document-analysis", opportunityId, documentId],
    queryFn: () => api.get<TenderAnalysisRun>(`/opportunities/${opportunityId}/tender-documents/${documentId}/analysis`),
    refetchInterval: (query) => tenderAnalysisPending(query.state.data?.status) ? 2000 : false,
  });
  const run = query.data;
  const output = readTenderAnalysis(run?.output, documents.flatMap((document) => document.tenderDocumentId ? [document.tenderDocumentId] : []));
  const status = tenderAnalysisStatus(run?.status);
  const processing = tenderAnalysisPending(run?.status);

  return <section className="rounded-lg border border-ai/30 bg-card p-4" aria-label={labels.title}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 shrink-0 text-ai" />{labels.title}</h2><p className="mt-2 text-sm text-muted-foreground">{labels.note}</p></div>
      <Button variant="ghost" size="icon" aria-label={labels.close} onClick={onClose}><X className="size-4" /></Button>
    </div>
    {query.isPending || processing ? <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin" />{query.isPending ? labels.loading : status === "queued" ? labels.queued : labels.running}</p>
      : query.isError ? <div className="mt-4"><ErrorState title={labels.failed} message={query.error.message} /><Button className="mt-2" variant="outline" onClick={() => query.refetch()}>{labels.retry}</Button></div>
      : status !== "completed" ? <p className="mt-4 break-words text-sm text-muted-foreground">{tenderAnalysisErrorMessage(run?.errorSummary, status, labels)}</p>
      : !output ? <p className="mt-4 text-sm text-muted-foreground">{labels.incompatible}</p>
      : <div className="mt-4 space-y-4">
        <div className="rounded-md bg-ai/5 p-3"><Badge intent="ai">{labels.completed}</Badge><p className="mt-2 whitespace-pre-line text-sm">{output.summary}</p>{output.recommendation ? <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{output.recommendation}</p> : null}</div>
        {output.documents.map((document) => <article key={document.tenderDocumentId} className="space-y-3 rounded-md border p-3">
          <h3 className="break-words font-semibold">{documents.find((item) => item.tenderDocumentId === document.tenderDocumentId)?.label}</h3>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{document.summary}</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {([
              [labels.requirements, document.keyRequirements], [labels.dates, document.dates], [labels.risks, document.risks],
              [labels.requiredDocuments, document.requiredDocuments], [labels.eligibility, document.eligibilityReferences], [labels.financial, document.financialTerms],
            ] as [string, TenderAnalysisFact[]][]).map(([title, facts]) => <section key={title} className="min-w-0 rounded-md border bg-background p-3">
              <h4 className="text-sm font-semibold">{title}</h4>
              {!facts.length ? <p className="mt-2 text-xs text-muted-foreground">{labels.noFindings}</p> : <ul className="mt-2 space-y-3">{facts.map((fact, index) => <li key={index} className="text-sm">
                <p className="break-words font-medium">{fact.title}{fact.date ? ` · ${fact.date}` : ""}</p>
                {fact.description ? <p className="mt-1 whitespace-pre-line text-muted-foreground">{fact.description}</p> : null}
                <Citations citations={fact.citations} documents={documents} locale={locale} />
              </li>)}</ul>}
            </section>)}
          </div>
        </article>)}
        {output.crossDocumentFindings.length ? <section className="rounded-md border border-warning/40 p-3"><h3 className="font-semibold">{labels.cross}</h3><div className="mt-3 space-y-4">{output.crossDocumentFindings.map((finding, index) => <article key={index}>
          <Badge intent="warning">{labels.verify}</Badge><h4 className="mt-2 break-words text-sm font-medium">{finding.title}</h4><p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{finding.description}</p>
          <Citations citations={finding.citations} documents={documents} locale={locale} />
        </article>)}</div></section> : null}
      </div>}
  </section>;
}

function tenderAnalysisErrorMessage(errorSummary: string | undefined, status: ReturnType<typeof tenderAnalysisStatus>, labels: typeof copy.ru): string {
  if (status === "cancelled") return labels.cancelled;
  if (tenderAnalysisProviderNotConfigured(errorSummary)) return labels.providerNotConfigured;
  return errorSummary || labels.failed;
}

function Citations({ citations, documents, locale }: { citations: TenderAnalysisCitation[]; documents: TenderDocument[]; locale: OpportunityLocale }) {
  const labels = copy[locale];
  return <details className="mt-2 rounded-md border bg-muted/20 p-2 text-xs"><summary className="cursor-pointer text-muted-foreground">{labels.citations} ({citations.length})</summary><div className="mt-2 space-y-3">{citations.map((citation, index) => {
    const document = documents.find((item) => item.tenderDocumentId === citation.tenderDocumentId);
    if (!document) return null;
    return <div key={index} className="min-w-0"><p className="break-words font-medium">{document.label}{citation.section ? ` · ${citation.section}` : ""}</p>{citation.excerpt ? <blockquote className="mt-1 whitespace-pre-line border-l-2 border-ai/30 pl-2 text-muted-foreground">{citation.excerpt}</blockquote> : null}<CitationDocument document={document} locale={locale} /></div>;
  })}</div></details>;
}

function CitationDocument({ document, locale }: { document: TenderDocument; locale: OpportunityLocale }) {
  const labels = copy[locale];
  const source = safeDocumentSourceUrl(document.sourceUrl);
  const download = useMutation({ mutationFn: async () => {
    await downloadStoredFile(document.fileId!, document.filename || document.label || "document");
  }, onError: (error) => toast.error(error.message) });
  return <div className="mt-2 flex flex-wrap gap-2">
    {document.fileId ? <Button size="sm" variant="outline" loading={download.isPending} onClick={() => download.mutate()}><Download className="size-3" />{labels.download}</Button> : null}
    {source ? <Button size="sm" variant="outline" asChild><a href={source} target="_blank" rel="noreferrer"><ExternalLink className="size-3" />{labels.open}</a></Button> : null}
  </div>;
}
