"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, FileCode2, PenLine, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { MatchScore } from "@/components/intly/match-score";
import { BrandArt } from "@/components/intly/brand";
import { EmptyState } from "@/components/intly/empty-state";
import { ErrorState } from "@/components/intly/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { selectClass, type AiRun, type Page } from "./contracts";
import { editorEntryCtaLabel, type OpportunityEditorEntryType } from "./opportunity-editor-entry";
import {
  aiRunStatusLabels,
  formatOpportunityDate,
  type OpportunityLocale
} from "./opportunity-workspace-labels";

type AnalysisCopy = {
  chooseProfileTitle: string;
  chooseProfileDescription: string;
  title: string;
  description: string;
  rerun: string;
  run: string;
  customInstruction: string;
  customInstructionAria: string;
  history: string;
  runAria: string;
  fullPrompt: string;
  queued: string;
  running: string;
  cancel: string;
  failedTitle: string;
  providerMissing: string;
  providerFallback: string;
  cancelled: string;
  completed: string;
  evidence: string;
  strengths: string;
  risks: string;
  missingRequirements: string;
  recommendedActions: string;
  budgetAssessment: string;
  usefulQuestion: string;
  usefulYes: string;
  usefulNo: string;
  notStartedTitle: string;
  notStartedDescription: string;
  promptTitle: string;
  promptDescription: string;
  loadingPrompt: string;
  emptyEvidence: string;
};

const analysisCopy: Record<OpportunityLocale, AnalysisCopy> = {
  ru: {
    chooseProfileTitle: "Выберите профиль для анализа",
    chooseProfileDescription:
      "AI учитывает выбранный профиль и доступные документы. Соответствие профилю и оценка AI считаются отдельно.",
    title: "AI-анализ",
    description:
      "Оценка соответствия, рисков и следующих действий. Каждый запуск сохраняется в личной истории.",
    rerun: "Повторить анализ",
    run: "Проанализировать",
    customInstruction: "Дополнительная инструкция для этого запуска",
    customInstructionAria: "Дополнительная инструкция AI",
    history: "История",
    runAria: "Запуск AI",
    fullPrompt: "Полный промпт",
    queued: "Анализ ожидает запуска…",
    running: "AI выполняет анализ…",
    cancel: "Отменить",
    failedTitle: "Анализ не выполнен",
    providerMissing:
      "AI-провайдер ещё не настроен. Администратор может подключить его в настройках AI.",
    providerFallback: "Не удалось получить ответ провайдера. Можно повторить запуск.",
    cancelled: "Этот запуск отменён. История сохранена.",
    completed: "Анализ завершён",
    evidence: "Основание",
    strengths: "Сильные стороны",
    risks: "Риски",
    missingRequirements: "Недостающие требования",
    recommendedActions: "Следующие действия",
    budgetAssessment: "Оценка оплаты / бюджета",
    usefulQuestion: "Полезный анализ?",
    usefulYes: "Полезный анализ",
    usefulNo: "Неполезный анализ",
    notStartedTitle: "Анализ ещё не запускался",
    notStartedDescription: "Результат появится после ответа настроенного AI-провайдера.",
    promptTitle: "Полный промпт запуска",
    promptDescription: "Инструкции, контекст и формат результата доступны только для чтения.",
    loadingPrompt: "Загружаем промпт…",
    emptyEvidence: "Не указано в этом анализе"
  },
  en: {
    chooseProfileTitle: "Choose a profile for analysis",
    chooseProfileDescription:
      "AI uses the selected profile and available documents. Profile fit and AI rating are calculated separately.",
    title: "AI analysis",
    description: "Fit, risk, and next-step assessment. Every run is saved in your private history.",
    rerun: "Run again",
    run: "Analyze",
    customInstruction: "Additional instruction for this run",
    customInstructionAria: "Additional AI instruction",
    history: "History",
    runAria: "AI run",
    fullPrompt: "Full prompt",
    queued: "Analysis is waiting to start…",
    running: "AI is analyzing…",
    cancel: "Cancel",
    failedTitle: "Analysis failed",
    providerMissing:
      "The AI provider is not configured yet. An administrator can connect it in AI settings.",
    providerFallback: "The provider did not return a response. You can run the analysis again.",
    cancelled: "This run was cancelled. The history entry was saved.",
    completed: "Analysis completed",
    evidence: "Evidence",
    strengths: "Strengths",
    risks: "Risks",
    missingRequirements: "Missing requirements",
    recommendedActions: "Next actions",
    budgetAssessment: "Compensation / budget assessment",
    usefulQuestion: "Was this analysis useful?",
    usefulYes: "Useful analysis",
    usefulNo: "Not useful",
    notStartedTitle: "Analysis has not been run yet",
    notStartedDescription: "The result will appear after the configured AI provider responds.",
    promptTitle: "Full run prompt",
    promptDescription: "Instructions, context, and result format are read-only.",
    loadingPrompt: "Loading prompt…",
    emptyEvidence: "Not specified in this analysis"
  }
};

export function AiAnalysisPanel({
  opportunityId,
  opportunityType,
  profileId,
  locale = "ru",
  onOpenEditor
}: {
  opportunityId: string;
  opportunityType: OpportunityEditorEntryType;
  profileId?: string;
  locale?: OpportunityLocale;
  onOpenEditor?: () => void;
}) {
  const copy = analysisCopy[locale];
  const client = useQueryClient();
  const [runId, setRunId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const history = useQuery({
    queryKey: ["ai-runs", opportunityId, profileId],
    queryFn: () =>
      api.get<Page<AiRun>>(
        `/ai/runs?opportunityId=${opportunityId}&profileId=${profileId}&taskType=opportunity_analysis`
      ),
    enabled: !!profileId,
    refetchInterval: (query) =>
      query.state.data?.items.some((run) => ["queued", "running"].includes(run.status))
        ? 1500
        : false
  });
  const run = history.data?.items.find((item) => item.id === runId) ?? history.data?.items[0];
  const start = useMutation({
    mutationFn: () =>
      api.post<AiRun>("/ai/analyses", {
        opportunityId,
        profileId,
        ...(customPrompt.trim() ? { customPrompt: customPrompt.trim() } : {})
      }),
    onSuccess: (result) => {
      setRunId(result.id);
      client.invalidateQueries({ queryKey: ["ai-runs", opportunityId] });
    },
    onError: (error) => toast.error(error.message)
  });
  const action = useMutation({
    mutationFn: ({ name, body }: { name: string; body?: unknown }) =>
      api.post(`/ai/runs/${run?.id}/${name}`, body),
    onSuccess: () => client.invalidateQueries({ queryKey: ["ai-runs", opportunityId] }),
    onError: (error) => toast.error(error.message)
  });
  const prompt = useQuery({
    queryKey: ["ai-prompt", run?.id],
    queryFn: () => api.get<{ prompt: Record<string, unknown> }>(`/ai/runs/${run?.id}/prompt`),
    enabled: promptOpen && !!run
  });
  if (!profileId)
    return (
      <EmptyState title={copy.chooseProfileTitle} description={copy.chooseProfileDescription} />
    );
  const busy = !!run && ["queued", "running"].includes(run.status);
  const output = run?.structuredOutput;
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-ai/30 bg-ai/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BrandArt kind="analysis" className="w-20 shrink-0 sm:w-32" />
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 font-semibold">
              <Bot className="size-5 shrink-0 text-ai" />
              {copy.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button className="flex-1 sm:flex-none" variant="secondary" onClick={onOpenEditor}>
              <PenLine className="size-4" />
              {editorEntryCtaLabel(opportunityType, locale)}
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              loading={start.isPending}
              disabled={busy}
              onClick={() => start.mutate()}
            >
              {run ? copy.rerun : copy.run}
            </Button>
          </div>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            {copy.customInstruction}
          </summary>
          <Textarea
            className="mt-2"
            aria-label={copy.customInstructionAria}
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
            maxLength={4000}
          />
        </details>
      </div>
      {history.isError && (
        <ErrorState message={history.error.message} onRetry={() => history.refetch()} />
      )}
      {!!history.data?.items.length && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="min-w-0 text-sm">
            {copy.history}{" "}
            <select
              className={`${selectClass} ml-2 max-w-full`}
              aria-label={copy.runAria}
              value={run?.id ?? ""}
              onChange={(event) => setRunId(event.target.value)}
            >
              {history.data.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatOpportunityDate(item.createdAt, locale)} ·{" "}
                  {statusLabel(item.status, locale)}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" variant="outline" onClick={() => setPromptOpen(true)}>
            <FileCode2 className="size-4" />
            {copy.fullPrompt}
          </Button>
        </div>
      )}
      {busy && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-5"
        >
          <p>{run.status === "queued" ? copy.queued : copy.running}</p>
          <Button
            size="sm"
            variant="outline"
            loading={action.isPending}
            onClick={() => action.mutate({ name: "cancel" })}
          >
            {copy.cancel}
          </Button>
        </div>
      )}
      {run?.status === "failed" && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
          <h3 className="font-medium">{copy.failedTitle}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {run.errorCode === "AI_ROUTE_UNAVAILABLE"
              ? copy.providerMissing
              : (run.errorSummary ?? copy.providerFallback)}
          </p>
        </div>
      )}
      {run?.status === "cancelled" && (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">{copy.cancelled}</p>
      )}
      {run?.status === "completed" && output && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-card p-5">
            <div className="min-w-0 flex-1">
              <Badge intent="ai">{String(output.recommendation ?? copy.completed)}</Badge>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                {String(output.summary ?? "")}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {run.provider} · {run.modelId} · {formatOpportunityDate(run.createdAt, locale)}
              </p>
            </div>
            <MatchScore
              value={run.aiScore ?? (typeof output.aiScore === "number" ? output.aiScore : null)}
              label="AI"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <EvidenceList title={copy.strengths} value={output.strengths} copy={copy} />
            <EvidenceList title={copy.risks} value={output.risks} copy={copy} />
            <EvidenceList
              title={copy.missingRequirements}
              value={output.missingRequirements}
              copy={copy}
            />
            <EvidenceList
              title={copy.recommendedActions}
              value={output.recommendedActions}
              copy={copy}
            />
          </div>
          {output.compensationBudgetAssessment && (
            <section className="rounded-lg border bg-card p-4">
              <h3 className="mb-2 font-semibold">{copy.budgetAssessment}</h3>
              <p className="text-sm">{String(output.compensationBudgetAssessment)}</p>
            </section>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{copy.usefulQuestion}</span>
            <Button
              size="icon"
              variant="outline"
              aria-label={copy.usefulYes}
              disabled={action.isPending}
              onClick={() => action.mutate({ name: "feedback", body: { value: "positive" } })}
            >
              <ThumbsUp className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label={copy.usefulNo}
              disabled={action.isPending}
              onClick={() => action.mutate({ name: "feedback", body: { value: "negative" } })}
            >
              <ThumbsDown className="size-4" />
            </Button>
          </div>
        </>
      )}
      {!run && !history.isPending && (
        <EmptyState
          illustration={false}
          title={copy.notStartedTitle}
          description={copy.notStartedDescription}
        />
      )}
      <Modal
        open={promptOpen}
        onOpenChange={setPromptOpen}
        title={copy.promptTitle}
        description={copy.promptDescription}
        wide
      >
        {prompt.isPending ? (
          <p>{copy.loadingPrompt}</p>
        ) : prompt.isError ? (
          <ErrorState message={prompt.error.message} onRetry={() => prompt.refetch()} />
        ) : (
          <div className="space-y-4">
            {Object.entries(prompt.data?.prompt ?? {}).map(([key, value]) => (
              <section key={key}>
                <h3 className="mb-2 text-sm font-semibold">{key}</h3>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-4 text-xs">
                  {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                </pre>
              </section>
            ))}
          </div>
        )}
      </Modal>
    </section>
  );
}

function EvidenceList({
  title,
  value,
  copy
}: {
  title: string;
  value: unknown;
  copy: AnalysisCopy;
}) {
  const items = Array.isArray(value) ? value : [];
  return (
    <section className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={index} className="text-sm">
              <p>{evidenceItemTitle(item)}</p>
              {evidenceItemEvidence(item) ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.evidence}: {evidenceItemEvidence(item)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{copy.emptyEvidence}</p>
      )}
    </section>
  );
}

function evidenceItemTitle(item: unknown) {
  if (typeof item === "string") return item;
  if (item && typeof item === "object" && "title" in item)
    return String((item as { title?: unknown }).title ?? "");
  return "";
}

function evidenceItemEvidence(item: unknown) {
  if (item && typeof item === "object" && "evidence" in item)
    return String((item as { evidence?: unknown }).evidence ?? "");
  return "";
}

function statusLabel(status: AiRun["status"], locale: OpportunityLocale) {
  return aiRunStatusLabels[locale][status];
}
