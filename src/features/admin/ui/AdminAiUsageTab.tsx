"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { adminApi } from "../api/admin-api";
import { aiProviders, aiTasks, providerLabel, taskLabel } from "../adminAI/catalog";
import type { AdminAiCallUsage, AdminAiCallUsageRow, AdminAiTestRun, AdminAiUsageError, AdminAiUsageParams, AdminAiUsageRow, AdminAiUsageStatus, AiProvider, AiTaskType } from "../adminAI/types";
import type { AdminLocale, Localized } from "./admin-locale";

type UsagePeriod = "all" | "7d" | "30d";

type UsageCopy = {
  title: string;
  description: string;
  refresh: string;
  period: string;
  periods: Record<UsagePeriod, string>;
  all: string;
  user: string;
  task: string;
  provider: string;
  status: string;
  model: string;
  runs: string;
  completed: string;
  failed: string;
  cancelled: string;
  errorRate: string;
  inputTokens: string;
  outputTokens: string;
  totalTokens: string;
  finalTokens: string;
  finalCost: string;
  cost: string;
  partialCost: (unknown: number) => string;
  avgLatency: string;
  latencySamples: string;
  details: string;
  detailsDescription: string;
  providerCalls: string;
  providerCallsDescription: string;
  calls: string;
  attemptDetails: string;
  attemptsMissing: string;
  costBasisReportedCache: string;
  costBasisUncached: string;
  fallback: string;
  errors: string;
  errorsDescription: string;
  lastRun: string;
  inspect: string;
  runDetails: string;
  runDetailsDescription: string;
  created: string;
  started: string;
  completedAt: string;
  result: string;
  usage: string;
  noRows: string;
  noErrors: string;
  loading: string;
  loadFailed: string;
  loadingRun: string;
  failedRunLoad: string;
  anonymousUser: string;
  unknownUser: string;
  statusLabels: Record<AdminAiTestRun["status"], string>;
};

const copy: Localized<UsageCopy> = {
  ru: {
    title: "Статистика AI",
    description: "Запуски и их итоговый расход. Расход всех обращений, включая повторы, приведён ниже. Отмены не входят в долю ошибок.",
    refresh: "Обновить",
    period: "Период",
    periods: { all: "Всё время", "7d": "7 дней", "30d": "30 дней" },
    all: "Все",
    user: "Пользователь",
    task: "Задача",
    provider: "Провайдер",
    status: "Статус",
    model: "Модель",
    runs: "Запуски",
    completed: "Готово",
    failed: "Ошибки",
    cancelled: "Отмены",
    errorRate: "Доля ошибок",
    inputTokens: "Вход",
    outputTokens: "Выход",
    totalTokens: "Всего токенов",
    finalTokens: "Итоговые токены",
    finalCost: "Итоговый расход",
    cost: "Стоимость",
    partialCost: (unknown) => `${unknown} без оценки`,
    avgLatency: "Средняя задержка",
    latencySamples: "замеров",
    details: "Разрезы",
    detailsDescription: "Группировка по пользователю, задаче, провайдеру, модели и статусу.",
    providerCalls: "Вызовы провайдеров",
    providerCallsDescription: "Повторы и fallback считаются отдельно; фильтр статуса относится к запуску, а статус в таблице — к отдельной попытке. Исторические запуски до трекинга могут быть без вызовов.",
    calls: "Вызовы",
    attemptDetails: "Попытки провайдера",
    attemptsMissing: "Для этого запуска нет отдельных записей попыток.",
    costBasisReportedCache: "кэш входа учтён",
    costBasisUncached: "кэш не передан, вход посчитан по обычному тарифу",
    fallback: "Резервная модель",
    errors: "Ошибки",
    errorsDescription: "Последние сбои без содержимого промптов и системных данных.",
    lastRun: "Последний запуск",
    inspect: "Открыть",
    runDetails: "AI-запуск",
    runDetailsDescription: "Служебные поля результата без промптов и системного контекста.",
    created: "Создан",
    started: "Старт",
    completedAt: "Финиш",
    result: "Результат",
    usage: "Расход",
    noRows: "AI-запусков по выбранным фильтрам пока нет.",
    noErrors: "Ошибок по выбранным фильтрам нет.",
    loading: "Загружаю статистику...",
    loadFailed: "Не удалось загрузить статистику AI.",
    loadingRun: "Загружаю запуск...",
    failedRunLoad: "Не удалось загрузить запуск.",
    anonymousUser: "Без пользователя",
    unknownUser: "Неизвестный пользователь",
    statusLabels: { queued: "В очереди", running: "Выполняется", completed: "Готово", failed: "Ошибка", cancelled: "Отменён" },
  },
  en: {
    title: "AI analytics",
    description: "Launches and their final-call usage. All call costs, including retries, are shown below. Cancelled launches are excluded from the error rate.",
    refresh: "Refresh",
    period: "Period",
    periods: { all: "All time", "7d": "7 days", "30d": "30 days" },
    all: "All",
    user: "User",
    task: "Task",
    provider: "Provider",
    status: "Status",
    model: "Model",
    runs: "Launches",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
    errorRate: "Error rate",
    inputTokens: "Input",
    outputTokens: "Output",
    totalTokens: "Total tokens",
    finalTokens: "Final-call tokens",
    finalCost: "Final-call cost",
    cost: "Cost",
    partialCost: (unknown) => `${unknown} unknown costs`,
    avgLatency: "Avg latency",
    latencySamples: "samples",
    details: "Breakdown",
    detailsDescription: "Grouped by user, task, provider, model and status.",
    providerCalls: "Provider calls",
    providerCallsDescription: "Retries and fallbacks are recorded separately; the status filter applies to the launch, while the table status belongs to each attempt. Historical runs before tracking may lack calls.",
    calls: "Calls",
    attemptDetails: "Provider attempts",
    attemptsMissing: "This launch has no separate attempt records.",
    costBasisReportedCache: "cached input counted",
    costBasisUncached: "cache not reported, input priced at the standard rate",
    fallback: "Fallback model",
    errors: "Errors",
    errorsDescription: "Recent failures without prompt or system content.",
    lastRun: "Last launch",
    inspect: "Open",
    runDetails: "AI launch",
    runDetailsDescription: "Operational result fields without prompts or system context.",
    created: "Created",
    started: "Started",
    completedAt: "Finished",
    result: "Result",
    usage: "Usage",
    noRows: "No AI launches match the selected filters yet.",
    noErrors: "No errors match the selected filters.",
    loading: "Loading analytics...",
    loadFailed: "Could not load AI analytics.",
    loadingRun: "Loading launch...",
    failedRunLoad: "Could not load launch.",
    anonymousUser: "No user",
    unknownUser: "Unknown user",
    statusLabels: { queued: "Queued", running: "Running", completed: "Completed", failed: "Failed", cancelled: "Cancelled" },
  }
};

const selectClass = "h-[var(--control-height)] rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const usageStatuses: AdminAiUsageStatus[] = ["completed", "failed", "cancelled"];

export function AdminAiUsageTab({ locale }: { locale: AdminLocale }) {
  const text = copy[locale];
  const [period, setPeriod] = useState<UsagePeriod>("all");
  const [userId, setUserId] = useState("");
  const [selectedUserLabel, setSelectedUserLabel] = useState("");
  const [provider, setProvider] = useState<AiProvider | "">("");
  const [taskType, setTaskType] = useState<AiTaskType | "">("");
  const [modelId, setModelId] = useState("");
  const [status, setStatus] = useState<AdminAiUsageStatus | "">("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const params = useMemo<AdminAiUsageParams>(() => ({
    ...periodParams(period),
    userId: userId || undefined,
    provider: provider || undefined,
    taskType: taskType || undefined,
    modelId: modelId.trim() || undefined,
    status: status || undefined
  }), [period, userId, provider, taskType, modelId, status]);
  const usage = useQuery({
    queryKey: ["admin", "ai", "usage", params],
    queryFn: () => adminApi.ai.usage(params)
  });
  const selectedRun = useQuery({
    queryKey: ["admin", "ai", "usage-run", selectedRunId],
    queryFn: () => adminApi.ai.run(selectedRunId!),
    enabled: Boolean(selectedRunId)
  });
  const summary = usage.data?.summary;
  const callSummary = usage.data?.callSummary;
  const users = usage.data?.users ?? [];
  const userOptions = userId && !users.some((user) => user.userId === userId)
    ? [...users, { userId, name: selectedUserLabel || userId }]
    : users;
  const dataReady = Boolean(usage.data) && !usage.isError;
  return (
    <div className="min-w-0 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle>{text.title}</CardTitle>
              <CardDescription>{text.description}</CardDescription>
            </div>
            <Button type="button" variant="outline" className="self-start" loading={usage.isFetching} onClick={() => void usage.refetch()}>
              <RefreshCw className="size-4" aria-hidden />
              {text.refresh}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Filter label={text.period}><select className={`${selectClass} w-full`} value={period} onChange={(event) => setPeriod(event.target.value as UsagePeriod)}>{(["all", "7d", "30d"] as UsagePeriod[]).map((item) => <option key={item} value={item}>{text.periods[item]}</option>)}</select></Filter>
            <Filter label={text.user}><select className={`${selectClass} w-full min-w-0`} value={userId} onChange={(event) => { const id = event.target.value; setUserId(id); const selected = userOptions.find((user) => user.userId === id); setSelectedUserLabel(selected ? userLabel(selected, text) : ""); }}><option value="">{text.all}</option>{userOptions.map((user) => <option key={user.userId} value={user.userId}>{userLabel(user, text)}</option>)}</select></Filter>
            <Filter label={text.provider}><select className={`${selectClass} w-full min-w-0`} value={provider} onChange={(event) => setProvider(event.target.value as AiProvider | "")}><option value="">{text.all}</option>{aiProviders.map((item) => <option key={item.provider} value={item.provider}>{item.label}</option>)}</select></Filter>
            <Filter label={text.task}><select className={`${selectClass} w-full min-w-0`} value={taskType} onChange={(event) => setTaskType(event.target.value as AiTaskType | "")}><option value="">{text.all}</option>{aiTasks.map((item) => <option key={item.taskType} value={item.taskType}>{item.label[locale]}</option>)}</select></Filter>
            <Filter label={text.model}><input className={`${selectClass} w-full min-w-0`} value={modelId} onChange={(event) => setModelId(event.target.value)} placeholder={text.all} /></Filter>
            <Filter label={text.status}><select className={`${selectClass} w-full min-w-0`} value={status} onChange={(event) => setStatus(event.target.value as AdminAiUsageStatus | "")}><option value="">{text.all}</option>{usageStatuses.map((item) => <option key={item} value={item}>{text.statusLabels[item]}</option>)}</select></Filter>
          </div>
        </CardContent>
      </Card>

      {usage.isLoading ? <DataNotice text={text.loading} /> : null}
      {usage.isError ? <DataNotice text={text.loadFailed} danger action={<Button type="button" variant="outline" size="sm" onClick={() => void usage.refetch()}>{text.refresh}</Button>} /> : null}

      {dataReady ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label={text.runs} value={formatNumber(summary?.runs ?? 0, locale)} hint={`${text.completed}: ${formatNumber(summary?.completed ?? 0, locale)} · ${text.failed}: ${formatNumber(summary?.failed ?? 0, locale)} · ${text.cancelled}: ${formatNumber(summary?.cancelled ?? 0, locale)}`} />
        <Metric label={text.finalTokens} value={formatNumber(summary?.totalTokens ?? 0, locale)} hint={`${text.inputTokens}: ${formatNumber(summary?.inputTokens ?? 0, locale)} · ${text.outputTokens}: ${formatNumber(summary?.outputTokens ?? 0, locale)}`} />
        <Metric label={text.finalCost} value={formatCost(summary?.estimatedCost)} hint={summary?.costUnknownRuns ? text.partialCost(summary.costUnknownRuns) : `${formatNumber(summary?.costKnownRuns ?? 0, locale)} ${text.runs.toLowerCase()}`} />
        <Metric label={text.avgLatency} value={formatLatency(summary?.avgLatencyMs, locale)} hint={`${formatPercent(summary?.errorRate, locale)} ${text.errorRate.toLowerCase()} · ${formatNumber(summary?.latencySamples ?? 0, locale)} ${text.latencySamples}`} />
      </div> : null}

      {dataReady ? <Card>
        <CardHeader><CardTitle>{text.providerCalls}</CardTitle><CardDescription>{text.providerCallsDescription}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric label={text.calls} value={formatNumber(callSummary?.calls ?? 0, locale)} hint={`${formatNumber(callSummary?.latencySamples ?? 0, locale)} ${text.latencySamples}`} />
            <Metric label={text.totalTokens} value={formatNumber(callSummary?.totalTokens ?? 0, locale)} hint={`${text.inputTokens}: ${formatNumber(callSummary?.inputTokens ?? 0, locale)} · ${text.outputTokens}: ${formatNumber(callSummary?.outputTokens ?? 0, locale)}`} />
            <Metric label={text.cost} value={formatCost(callSummary?.estimatedCost)} hint={callSummary?.costUnknownCalls ? text.partialCost(callSummary.costUnknownCalls) : `${formatNumber(callSummary?.costKnownCalls ?? 0, locale)} ${text.calls.toLowerCase()}`} />
            <Metric label={text.avgLatency} value={formatLatency(callSummary?.avgLatencyMs, locale)} hint={`${formatNumber(callSummary?.latencySamples ?? 0, locale)} ${text.latencySamples}`} />
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[68rem] text-left text-sm [&_td]:px-2 [&_th]:px-2 [&_th]:whitespace-nowrap">
              <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">{text.user}</th><th>{text.task}</th><th>{text.provider}</th><th>{text.model}</th><th>{text.status}</th><th className="text-right">{text.calls}</th><th className="text-right">{text.inputTokens}</th><th className="text-right">{text.outputTokens}</th><th className="text-right">{text.cost}</th><th className="text-right">{text.avgLatency}</th><th className="text-right">{text.inspect}</th></tr></thead>
              <tbody className="divide-y">
                {(usage.data?.callItems ?? []).map((row, index) => <CallRowView key={callRowKey(row, index)} row={row} text={text} locale={locale} onOpen={setSelectedRunId} />)}
                {!usage.isLoading && !(usage.data?.callItems ?? []).length ? <tr><td className="py-8 text-center text-muted-foreground" colSpan={11}>{text.noRows}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card> : null}

      {dataReady ? <Card>
        <CardHeader><CardTitle>{text.details}</CardTitle><CardDescription>{text.detailsDescription}</CardDescription></CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full min-w-[68rem] text-left text-sm [&_td]:px-2 [&_th]:px-2 [&_th]:whitespace-nowrap">
            <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">{text.user}</th><th>{text.task}</th><th>{text.provider}</th><th>{text.model}</th><th>{text.status}</th><th className="text-right">{text.runs}</th><th className="text-right">{text.inputTokens}</th><th className="text-right">{text.outputTokens}</th><th className="text-right">{text.cost}</th><th className="text-right">{text.avgLatency}</th></tr></thead>
            <tbody className="divide-y">
              {(usage.data?.items ?? []).map((row, index) => <UsageRowView key={usageRowKey(row, index)} row={row} text={text} locale={locale} />)}
              {!usage.isLoading && !(usage.data?.items ?? []).length ? <tr><td className="py-8 text-center text-muted-foreground" colSpan={10}>{text.noRows}</td></tr> : null}
            </tbody>
          </table>
        </CardContent>
      </Card> : null}

      {dataReady ? <Card>
        <CardHeader><CardTitle>{text.errors}</CardTitle><CardDescription>{text.errorsDescription}</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {(usage.data?.errors ?? []).map((item) => <ErrorRow key={`${item.errorCode}-${item.lastRunId}`} item={item} text={text} locale={locale} onOpen={setSelectedRunId} />)}
          {!usage.isLoading && !(usage.data?.errors ?? []).length ? <p className="py-6 text-center text-sm text-muted-foreground">{text.noErrors}</p> : null}
        </CardContent>
      </Card> : null}

      <Modal open={Boolean(selectedRunId)} onOpenChange={(open) => { if (!open) setSelectedRunId(null); }} title={text.runDetails} description={selectedRunId ?? text.runDetailsDescription} placement="drawer">
        {selectedRun.isLoading ? <p className="text-sm text-muted-foreground">{text.loadingRun}</p> : null}
        {selectedRun.isError ? <p className="text-sm text-destructive">{text.failedRunLoad}</p> : null}
        {selectedRun.data ? <RunDrawer run={selectedRun.data} text={text} locale={locale} /> : null}
      </Modal>
    </div>
  );
}

function UsageRowView({ row, text, locale }: { row: AdminAiUsageRow; text: UsageCopy; locale: AdminLocale }) {
  const group = usageGroup(row);
  const status = group.status;
  return (
    <tr>
      <td className="py-2 align-top font-medium">{usageRowUser(row, text)}</td>
      <td className="align-top">{taskLabel(group.taskType, locale)}</td>
      <td className="align-top">{providerLabel(group.provider)}</td>
      <td className="max-w-56 truncate align-top" title={group.modelId ?? undefined}>{group.modelId ?? "—"}</td>
      <td className="align-top"><Badge intent={statusIntent(status)}>{status ? text.statusLabels[status] ?? status : "—"}</Badge></td>
      <td className="align-top text-right">{formatNumber(row.runs ?? 0, locale)}</td>
      <td className="align-top text-right">{formatNumber(row.inputTokens ?? 0, locale)}</td>
      <td className="align-top text-right">{formatNumber(row.outputTokens ?? 0, locale)}</td>
      <td className="align-top text-right">{formatCost(row.estimatedCost)}{row.costUnknownRuns ? <span className="block text-xs text-muted-foreground">{text.partialCost(row.costUnknownRuns)}</span> : null}</td>
      <td className="align-top text-right">{formatLatency(row.avgLatencyMs, locale)}{row.latencySamples ? <span className="block text-xs text-muted-foreground">{formatNumber(row.latencySamples, locale)} {text.latencySamples}</span> : null}</td>
    </tr>
  );
}

function ErrorRow({ item, text, locale, onOpen }: { item: AdminAiUsageError; text: UsageCopy; locale: AdminLocale; onOpen: (runId: string) => void }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 rounded-lg border bg-background/50 p-3 text-left md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge intent="danger">{item.errorCode}</Badge>
          <span className="text-sm font-medium">{taskLabel(item.taskType, locale)}</span>
          <span className="text-xs text-muted-foreground">{providerLabel(item.provider)} · {item.modelId ?? "—"}</span>
        </div>
        <p className="break-words text-xs text-muted-foreground">{localizedAiError(item.errorCode, locale)}</p>
        <p className="break-words text-xs text-muted-foreground">{text.lastRun}: {formatDateTime(item.lastOccurredAt, locale)} · {item.lastRunId}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold">{formatNumber(item.runs, locale)}</span>
        <Button type="button" size="sm" variant="outline" onClick={() => onOpen(item.lastRunId)}><Eye className="size-4" aria-hidden />{text.inspect}</Button>
      </div>
    </div>
  );
}

function RunDrawer({ run, text, locale }: { run: AdminAiTestRun; text: UsageCopy; locale: AdminLocale }) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <Info label={text.task} value={taskLabel(run.taskType, locale)} />
        <Info label={text.status} value={text.statusLabels[run.status] ?? run.status} danger={run.status === "failed"} />
        <Info label={text.provider} value={providerLabel(run.provider)} />
        <Info label={text.model} value={run.modelId ?? "—"} />
        <Info label={text.created} value={formatDateTime(run.createdAt, locale)} />
        <Info label={text.started} value={formatDateTime(run.startedAt, locale)} />
        <Info label={text.completedAt} value={formatDateTime(run.completedAt, locale)} />
        {run.errorCode || run.errorSummary ? <Info label={text.failed} value={runErrorMessage(run.errorCode, run.errorSummary, locale)} danger /> : null}
      </dl>
      <JsonBlock title={text.usage} value={run.usage} />
      <AttemptsBlock run={run} text={text} locale={locale} />
      <JsonBlock title={text.result} value={run.structuredOutput} />
    </div>
  );
}

function CallRowView({ row, text, locale, onOpen }: { row: AdminAiCallUsageRow; text: UsageCopy; locale: AdminLocale; onOpen: (runId: string) => void }) {
  const group = usageGroup(row);
  const status = group.status;
  return (
    <tr>
      <td className="py-2 align-top font-medium">{usageRowUser(row, text)}</td>
      <td className="align-top">{taskLabel(group.taskType, locale)}</td>
      <td className="align-top">{providerLabel(group.provider)}</td>
      <td className="max-w-56 break-words align-top">{group.modelId ?? "—"}</td>
      <td className="align-top"><Badge intent={statusIntent(status)}>{status ? text.statusLabels[status] ?? status : "—"}</Badge></td>
      <td className="align-top text-right">{formatNumber(row.calls ?? 0, locale)}</td>
      <td className="align-top text-right">{formatNumber(row.inputTokens ?? 0, locale)}</td>
      <td className="align-top text-right">{formatNumber(row.outputTokens ?? 0, locale)}</td>
      <td className="align-top text-right">{formatCost(row.estimatedCost)}{row.costUnknownCalls ? <span className="block text-xs text-muted-foreground">{text.partialCost(row.costUnknownCalls)}</span> : null}</td>
      <td className="align-top text-right">{formatLatency(row.avgLatencyMs, locale)}{row.latencySamples ? <span className="block text-xs text-muted-foreground">{formatNumber(row.latencySamples, locale)} {text.latencySamples}</span> : null}</td>
      <td className="align-top text-right">{row.lastRunId ? <Button type="button" size="sm" variant="outline" onClick={() => onOpen(row.lastRunId!)}><Eye className="size-4" aria-hidden />{text.inspect}</Button> : "—"}</td>
    </tr>
  );
}

function AttemptsBlock({ run, text, locale }: { run: AdminAiTestRun; text: UsageCopy; locale: AdminLocale }) {
  const attempts = run.attempts ?? [];
  return (
    <section className="min-w-0 space-y-1.5">
      <h3 className="text-sm font-medium">{text.attemptDetails}</h3>
      {attempts.length ? (
        <>
        <div className="space-y-3 md:hidden">
          {attempts.map(attempt => (
            <div key={attempt.number} className="min-w-0 space-y-2 rounded-md border bg-background/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">#{attempt.number} · {providerLabel(attempt.provider)}</h4>
                <Badge intent={statusIntent(attempt.status)}>{text.statusLabels[attempt.status] ?? attempt.status}</Badge>
              </div>
              <p className="break-words text-xs text-muted-foreground">{attempt.modelId}{attempt.fallbackUsed ? ` · ${text.fallback}` : ""}</p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Info label={text.totalTokens} value={attemptTokens(attempt.usage, locale)} />
                <Info label={text.cost} value={formatCost(attempt.usage?.estimatedCost)} />
              </dl>
              {attempt.usage?.costBasis ? <p className="text-xs text-muted-foreground">{attempt.usage.costBasis === "reported-cache" ? text.costBasisReportedCache : text.costBasisUncached}</p> : null}
              <p className="text-xs text-muted-foreground">{text.completedAt}: {formatDateTime(attempt.completedAt ?? attempt.startedAt, locale)}</p>
              {attempt.errorCode ? <p className="text-xs text-destructive">{localizedAiError(attempt.errorCode, locale)}</p> : null}
            </div>
          ))}
        </div>
        <div className="hidden overflow-auto rounded-md border md:block">
          <table className="w-full min-w-[46rem] text-left text-xs [&_td]:px-2 [&_th]:px-2">
            <thead className="bg-muted text-muted-foreground"><tr><th className="py-2">#</th><th>{text.provider}</th><th>{text.model}</th><th>{text.status}</th><th className="text-right">{text.totalTokens}</th><th className="text-right">{text.cost}</th><th>{text.completedAt}</th></tr></thead>
            <tbody className="divide-y">
              {attempts.map((attempt) => (
                <tr key={`${attempt.number}-${attempt.provider}-${attempt.modelId}`}>
                  <td className="py-2 align-top">{attempt.number}</td>
                  <td className="align-top">{providerLabel(attempt.provider)}{attempt.fallbackUsed ? <span className="block text-muted-foreground">{text.fallback}</span> : null}</td>
                  <td className="max-w-48 break-words align-top">{attempt.modelId}</td>
                  <td className="align-top"><Badge intent={statusIntent(attempt.status)}>{text.statusLabels[attempt.status] ?? attempt.status}</Badge></td>
                  <td className="align-top text-right">{attemptTokens(attempt.usage, locale)}</td>
                  <td className="align-top text-right">{formatCost(attempt.usage?.estimatedCost)}{attempt.usage?.costBasis ? <span className="block text-muted-foreground">{attempt.usage.costBasis === "reported-cache" ? text.costBasisReportedCache : text.costBasisUncached}</span> : null}</td>
                  <td className="break-words align-top">{formatDateTime(attempt.completedAt ?? attempt.startedAt, locale)}{attempt.errorCode ? <span className="block text-destructive">{localizedAiError(attempt.errorCode, locale)}</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      ) : <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{text.attemptsMissing}</p>}
    </section>
  );
}

function attemptTokens(usage: AdminAiCallUsage | undefined, locale: AdminLocale) {
  const total = usage?.totalTokens ?? (typeof usage?.inputTokens === "number" && typeof usage.outputTokens === "number" ? usage.inputTokens + usage.outputTokens : undefined);
  return typeof total === "number" ? formatNumber(total, locale) : "—";
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="min-w-0 space-y-1.5 text-sm"><span className="font-medium">{label}</span>{children}</label>;
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="min-w-0 rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-2xl font-semibold" title={value}>{value}</p><p className="mt-1 min-h-4 break-words text-xs text-muted-foreground">{hint}</p></div>;
}

function DataNotice({ text, danger, action }: { text: string; danger?: boolean; action?: ReactNode }) {
  return <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 text-sm", danger ? "text-destructive" : "text-muted-foreground")}><span>{text}</span>{action}</div>;
}

function Info({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className={cn("mt-1 break-words font-medium", danger && "text-destructive")}>{value}</dd></div>;
}

function JsonBlock({ title, value }: { title: string; value?: Record<string, unknown> }) {
  if (!value || !Object.keys(value).length) return null;
  return <div className="min-w-0 space-y-1.5"><h3 className="text-sm font-medium">{title}</h3><pre className="max-h-72 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted p-3 text-xs [overflow-wrap:anywhere]">{JSON.stringify(value, null, 2)}</pre></div>;
}

function periodParams(period: UsagePeriod): Pick<AdminAiUsageParams, "dateFrom"> {
  if (period === "all") return {};
  const days = period === "7d" ? 7 : 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return { dateFrom: date.toISOString() };
}

function usageGroup(row: AdminAiUsageRow | AdminAiCallUsageRow) {
  return row.id ?? row._id ?? {};
}

function usageRowKey(row: AdminAiUsageRow, index: number) {
  const group = usageGroup(row);
  return [group.userId, group.taskType, group.provider, group.modelId, group.status, index].join(":");
}

function callRowKey(row: AdminAiCallUsageRow, index: number) {
  const group = usageGroup(row);
  return [group.userId, group.taskType, group.provider, group.modelId, group.status, index].join(":");
}

function usageRowUser(row: AdminAiUsageRow | AdminAiCallUsageRow, text: UsageCopy) {
  const group = usageGroup(row);
  if (row.user?.name || row.user?.email) return [row.user.name, row.user.email].filter(Boolean).join(" · ");
  if (group.userId) return group.userId;
  return text.anonymousUser;
}

function userLabel(user: { name?: string; email?: string; userId: string }, text: UsageCopy) {
  const label = [user.name, user.email].filter(Boolean).join(" · ");
  return label || user.userId || text.unknownUser;
}

function statusIntent(status: AdminAiTestRun["status"] | undefined) {
  if (status === "failed") return "danger";
  if (status === "cancelled") return "warning";
  if (status === "completed") return "success";
  return "neutral";
}

function runErrorMessage(errorCode: string | undefined, errorSummary: string | undefined, locale: AdminLocale) {
  const localized = errorCode ? localizedAiError(errorCode, locale) : null;
  if (localized) return localized;
  if (locale === "en" && errorSummary) return errorSummary;
  return locale === "ru" ? "Сервис вернул ошибку." : "The service returned an error.";
}

function localizedAiError(code: string, locale: AdminLocale) {
  const ru: Record<string, string> = {
    AI_PROVIDER_UNAVAILABLE: "Провайдер не настроен или недоступен.",
    AI_ROUTE_UNAVAILABLE: "Для этой задачи не настроен маршрут.",
    AI_RUN_FAILED: "AI-запуск завершился ошибкой.",
    AI_OUTPUT_INVALID: "Модель вернула ответ в неверном формате.",
    AI_AUTHENTICATION_FAILED: "Проверьте сохранённый ключ и права доступа у провайдера.",
    AI_MODEL_UNAVAILABLE: "Выбранная модель недоступна.",
    AI_RATE_LIMITED: "Провайдер временно ограничил частоту запросов.",
    AI_INVALID_REQUEST: "Провайдер отклонил параметры запроса.",
    AI_PROVIDER_TIMEOUT: "Провайдер не ответил вовремя.",
    INVALID_ARGUMENT: "Модель или параметры запроса не приняты сервисом.",
    AI_PROVIDER_TEST_FAILED: "Проверка провайдера завершилась ошибкой.",
  };
  const en: Record<string, string> = {
    AI_PROVIDER_UNAVAILABLE: "Provider is not configured or unavailable.",
    AI_ROUTE_UNAVAILABLE: "No route is configured for this task.",
    AI_RUN_FAILED: "AI launch failed.",
    AI_OUTPUT_INVALID: "The model returned an answer in an invalid format.",
    AI_AUTHENTICATION_FAILED: "Check the saved provider key and account permissions.",
    AI_MODEL_UNAVAILABLE: "The selected model is unavailable.",
    AI_RATE_LIMITED: "The provider temporarily limited the request rate.",
    AI_INVALID_REQUEST: "The provider rejected the request parameters.",
    AI_PROVIDER_TIMEOUT: "The provider did not respond in time.",
    INVALID_ARGUMENT: "The service did not accept the model or request parameters.",
    AI_PROVIDER_TEST_FAILED: "Provider check failed.",
  };
  return (locale === "ru" ? ru : en)[code] ?? code;
}

function formatNumber(value: number, locale: AdminLocale) {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US").format(value);
}

function formatCost(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "$0";
  if (value > 0 && value < 0.0001) return "<$0.0001";
  return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 8 }).format(value)}`;
}

function formatLatency(value: number | null | undefined, locale: AdminLocale) {
  if (value === null || value === undefined) return "—";
  return `${formatNumber(Math.round(value), locale)} ms`;
}

function formatPercent(value: number | null | undefined, locale: AdminLocale) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

function formatDateTime(value: string | undefined, locale: AdminLocale) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString(locale === "ru" ? "ru-RU" : "en-US");
}
