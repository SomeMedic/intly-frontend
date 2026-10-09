"use client";

import { useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Play, Radar, RotateCcw, Square, TestTube2 } from "lucide-react";
import { ApiError } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminSource, AdminSourceRun } from "@/types";
import type { SourceInspectorToolAction, AdminSourceToolReceipt } from "@/types/admin-source-detail";
import { adminApi } from "../api/admin-api";
import { AdminFrame, AdminQueryState } from "./AdminShared";
import { SourceLogsPanel, SourceSamplesPanel, sourceInspectorCopy } from "./AdminSourceDetailInspectors";
import { localDateTimeInputToIso, sourceCollectionSummary, sourceCredentialsState } from "./admin-source-detail-helpers";
import { boolLabel, dateLabel, healthLabels, localizedLabel, runStatusLabels, runtimeLabels, safeJson, secondsLabel, sourceGroupLabels, sourceId } from "./admin-format";
import type { AdminLocale, Localized } from "./admin-locale";
import { useAdminLocale } from "./admin-locale";

const selectClass = "h-[var(--control-height)] rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

type Tab = "overview" | "config" | "credentials" | "runs" | "logs" | "samples";
type SourceDetailCopy = {
  fallbackTitle: string;
  description: string;
  enabled: string;
  disabled: string;
  check: string;
  run: string;
  discover: string;
  tabs: Record<Tab, string>;
  actionSucceeded: string;
  runQueued: string;
  discoverCompleted: string;
  activeRun: string;
  checkResult: (state: string, message?: string) => string;
  stopSucceeded: string;
  operations: string;
  interval: string;
  timeout: string;
  credentials: string;
  proxyPool: string;
  lastSuccessfulCollection: string;
  connectionCheck: string;
  connectionCheckMessage: string;
  boundary: string;
  boundaryText: string;
  parser: string;
  normalization: string;
  refresh: string;
  checkpoint: string;
  endpointPolicyCheckpoint: string;
  diagnosticsSummary: string;
  expandDiagnostics: string;
  enabledForCollection: string;
  runtimeState: string;
  intervalSeconds: string;
  timeoutMs: string;
  perPage: string;
  maxPages: string;
  tenants: string;
  discoveryHosts: string;
  searchText: string;
  area: string;
  commaPlaceholder: string;
  saveConfig: string;
  credentialsDescription: string;
  newCredentials: string;
  configured: string;
  preview: string;
  credentialRef: string;
  invalidJson: string;
  saveCredentials: string;
  runCol: string;
  status: string;
  time: string;
  stats: string;
  error: string;
  actions: string;
  start: string;
  finish: string;
  stop: string;
  lastUpdate: string;
  recover: string;
  recoverName: (id: string) => string;
  recoveryHint: string;
  recoveryQueued: string;
  recoveryNetworkError: string;
  recoveryErrorFallback: string;
  recoveryErrors: Record<string, string>;
  runsEmpty: string;
  collectionEmpty: string;
  previous: string;
  next: string;
  page: string;
};

const detailCopy: Localized<SourceDetailCopy> = {
  ru: {
    fallbackTitle: "Источник",
    description: "Настройка коннектора, write-only доступы, история запусков и ручные операции.",
    enabled: "Включён",
    disabled: "Отключён",
    check: "Проверить",
    run: "Запустить",
    discover: "Найти доски",
    tabs: { overview: "Обзор", config: "Настройки", credentials: "Доступы", runs: "Запуски", logs: "Логи", samples: "Данные" },
    actionSucceeded: "Операция выполнена.",
    runQueued: "Сбор поставлен в очередь.",
    discoverCompleted: "Поиск досок завершён.",
    activeRun: "Сбор уже выполняется или ожидает в очереди. Откройте историю запусков.",
    checkResult: (state, message) => `Проверка подключения: ${state}${message ? ` · ${message}` : ""}`,
    stopSucceeded: "Остановка запрошена.",
    operations: "Операционное состояние",
    interval: "Интервал",
    timeout: "Таймаут",
    credentials: "Доступы",
    proxyPool: "Пул прокси",
    lastSuccessfulCollection: "Последний успешный сбор",
    connectionCheck: "Проверка подключения",
    connectionCheckMessage: "Сообщение проверки подключения",
    boundary: "Граница изменений",
    boundaryText: "Парсер, профиль нормализации и код конкретного источника меняются через релиз. Здесь доступны только поля, которые принимает admin API.",
    parser: "Парсер",
    normalization: "Нормализация",
    refresh: "Обновление",
    checkpoint: "Чекпоинт",
    endpointPolicyCheckpoint: "Endpoint / политика / чекпоинт (без секретов)",
    diagnosticsSummary: "Сводка источника скрыта, чтобы не растягивать страницу. Полное содержимое сохранено ниже.",
    expandDiagnostics: "Показать полную сводку",
    enabledForCollection: "Включён для сбора",
    runtimeState: "Режим источника",
    intervalSeconds: "Интервал, сек",
    timeoutMs: "Таймаут, мс",
    perPage: "На страницу",
    maxPages: "Максимум страниц",
    tenants: "Тенанты",
    discoveryHosts: "Хосты discovery",
    searchText: "Поисковая фраза",
    area: "Регион",
    commaPlaceholder: "через запятую",
    saveConfig: "Сохранить настройки",
    credentialsDescription: "Текущие секреты не читаются из API. Новые значения сохраняются как зашифрованные write-only доступы; превью остаётся маскированным.",
    newCredentials: "Новые доступы JSON",
    configured: "Настроено",
    preview: "Превью",
    credentialRef: "Ссылка на доступы",
    invalidJson: "Некорректный JSON",
    saveCredentials: "Сохранить доступы",
    runCol: "Запуск",
    status: "Статус",
    time: "Время",
    stats: "Статистика",
    error: "Ошибка",
    actions: "Действия",
    start: "Старт",
    finish: "Финиш",
    stop: "Остановить",
    lastUpdate: "Обновление",
    recover: "Восстановить",
    recoverName: (id) => `Восстановить запуск ${id}`,
    recoveryHint: "Восстановление продолжает тот же сбор с сохранённого места. Оно доступно после пяти минут без обновлений, если сбор не выполняется и не ожидает в очереди.",
    recoveryQueued: "Сбор продолжится с сохранённого места. Исходные даты и собранные записи сохранены.",
    recoveryNetworkError: "Не удалось проверить восстановление. Обновите историю запусков перед повторной попыткой.",
    recoveryErrorFallback: "Запуск не удалось восстановить. Обновите историю запусков и попробуйте снова.",
    recoveryErrors: {
      SOURCE_RUN_RECOVERY_BUSY: "У этого источника уже есть активная или ожидающая задача сбора.",
      SOURCE_RUN_RECOVERY_FRESH: "Запуск ещё обновлялся недавно. Восстановление доступно после пяти минут тишины.",
      SOURCE_RUN_RECOVERY_INELIGIBLE: "Этот запуск нельзя восстановить: он завершён, остановлен или относится не к сбору.",
      SOURCE_RUN_RECOVERY_SOURCE_DISABLED: "Источник отключён или находится на обслуживании.",
      SOURCE_RUN_RECOVERY_QUEUE_UNAVAILABLE: "Не удалось проверить очередь задач. Обновите страницу перед повторной попыткой.",
      SOURCE_RUN_RECOVERY_CHANGED: "Запуск изменился во время восстановления. История уже обновляется.",
      SOURCE_RUN_RECOVERY_ENQUEUE_FAILED: "Запуск возвращён в очередь, но задачу не удалось поставить. Повторите восстановление позже.",
    },
    runsEmpty: "Запусков пока нет.",
    collectionEmpty: "Запусков сбора для этого источника пока нет. Health-проверки не считаются сбором данных.",
    previous: "Назад",
    next: "Дальше",
    page: "Страница",
  },
  en: {
    fallbackTitle: "Source",
    description: "Connector settings, write-only credentials, run history and manual operations.",
    enabled: "Enabled",
    disabled: "Disabled",
    check: "Check",
    run: "Run",
    discover: "Discover boards",
    tabs: { overview: "Overview", config: "Settings", credentials: "Credentials", runs: "Runs", logs: "Logs", samples: "Data" },
    actionSucceeded: "Operation completed.",
    runQueued: "Collection queued.",
    discoverCompleted: "Board discovery completed.",
    activeRun: "Collection is already running or queued. Open the run history.",
    checkResult: (state, message) => `Connection check: ${state}${message ? ` · ${message}` : ""}`,
    stopSucceeded: "Stop requested.",
    operations: "Operational state",
    interval: "Interval",
    timeout: "Timeout",
    credentials: "Credentials",
    proxyPool: "Proxy pool",
    lastSuccessfulCollection: "Last successful collection",
    connectionCheck: "Connection check",
    connectionCheckMessage: "Connection check message",
    boundary: "Change boundary",
    boundaryText: "Parser, normalization profile and source-specific code change through releases. This page only exposes fields accepted by the admin API.",
    parser: "Parser",
    normalization: "Normalization",
    refresh: "Refresh",
    checkpoint: "Checkpoint",
    endpointPolicyCheckpoint: "Endpoint / policy / checkpoint (redacted)",
    diagnosticsSummary: "Source diagnostics are collapsed to keep the page compact. Full content is preserved below.",
    expandDiagnostics: "Show full diagnostics",
    enabledForCollection: "Enabled for collection",
    runtimeState: "Runtime state",
    intervalSeconds: "Interval, sec",
    timeoutMs: "Timeout, ms",
    perPage: "Per page",
    maxPages: "Max pages",
    tenants: "Tenants",
    discoveryHosts: "Discovery hosts",
    searchText: "Search text",
    area: "Area",
    commaPlaceholder: "comma-separated",
    saveConfig: "Save settings",
    credentialsDescription: "Current secrets are not returned by the API. New values are stored as encrypted write-only credentials; preview remains masked.",
    newCredentials: "New credentials JSON",
    configured: "Configured",
    preview: "Preview",
    credentialRef: "Credential ref",
    invalidJson: "Invalid JSON",
    saveCredentials: "Save credentials",
    runCol: "Run",
    status: "Status",
    time: "Time",
    stats: "Stats",
    error: "Error",
    actions: "Actions",
    start: "Start",
    finish: "Finish",
    stop: "Stop",
    lastUpdate: "Updated",
    recover: "Recover",
    recoverName: (id) => `Recover run ${id}`,
    recoveryHint: "Recovery resumes the same collection from its saved position. It is available after five minutes without updates when no collection task is running or waiting.",
    recoveryQueued: "Collection will continue from its saved position. Original dates and collected records are preserved.",
    recoveryNetworkError: "Could not confirm recovery. Refresh the run history before trying again.",
    recoveryErrorFallback: "The run could not be recovered. Refresh the run history and try again.",
    recoveryErrors: {
      SOURCE_RUN_RECOVERY_BUSY: "This source already has an active or waiting collection job.",
      SOURCE_RUN_RECOVERY_FRESH: "The run was updated recently. Recovery is available after five quiet minutes.",
      SOURCE_RUN_RECOVERY_INELIGIBLE: "This run cannot be recovered because it is finished, stopped, or is not a collection run.",
      SOURCE_RUN_RECOVERY_SOURCE_DISABLED: "The source is disabled or in maintenance.",
      SOURCE_RUN_RECOVERY_QUEUE_UNAVAILABLE: "The task queue could not be inspected. Refresh before trying again.",
      SOURCE_RUN_RECOVERY_CHANGED: "The run changed while recovery was claiming it. The history is already updating.",
      SOURCE_RUN_RECOVERY_ENQUEUE_FAILED: "The run was returned to queued, but the job could not be enqueued. Try recovery again later.",
    },
    runsEmpty: "No runs yet.",
    collectionEmpty: "No collection run has been recorded for this source yet. Health checks are not data collection.",
    previous: "Previous",
    next: "Next",
    page: "Page",
  },
};

export function AdminSourceDetailScreen() {
  const locale = useAdminLocale();
  const text = detailCopy[locale];
  const params = useParams<{ id: string }>();
  const id = params.id;
  return <AdminSourceDetailContent key={id} id={id} locale={locale} text={text} />;
}

function AdminSourceDetailContent({ id, locale, text }: { id: string; locale: AdminLocale; text: SourceDetailCopy }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [logsFilters, setLogsFilters] = useState({ runId: "", level: "", from: "", to: "", query: "" });
  const [logsCursor, setLogsCursor] = useState<string | null>(null);
  const [samplesCursor, setSamplesCursor] = useState<string | null>(null);
  const [runPager, setRunPager] = useState<{ sourceId: string; cursors: Array<string | null> }>({ sourceId: "", cursors: [null] });
  const [includeRawSamples, setIncludeRawSamples] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [toolOpportunityId, setToolOpportunityId] = useState("");
  const [toolReceipt, setToolReceipt] = useState<AdminSourceToolReceipt | undefined>();
  const runCursors = runPager.sourceId === id ? runPager.cursors : [null];
  const runCursor = runCursors.at(-1) ?? null;
  const query = useQuery({ queryKey: ["admin", "sources", id], queryFn: () => adminApi.sources.detail(id), enabled: Boolean(id), refetchInterval: tab === "overview" || tab === "runs" ? 5000 : false });
  const runs = useQuery({ queryKey: ["admin", "sources", id, "runs", runCursor], queryFn: () => adminApi.sources.runs({ sourceId: id, cursor: runCursor, limit: 50 }), enabled: Boolean(id), refetchInterval: tab === "runs" ? 5000 : false });
  const logs = useQuery({ queryKey: ["admin", "sources", id, "logs", logsFilters, logsCursor], queryFn: () => adminApi.sources.logs(id, { runId: logsFilters.runId || undefined, level: logsFilters.level || undefined, from: localDateTimeInputToIso(logsFilters.from), to: localDateTimeInputToIso(logsFilters.to), query: logsFilters.query || undefined, cursor: logsCursor ?? undefined, limit: 50 }), enabled: Boolean(id) && tab === "logs" });
  const samples = useQuery({ queryKey: ["admin", "sources", id, "samples", samplesCursor, includeRawSamples], queryFn: () => adminApi.sources.samples(id, { cursor: samplesCursor ?? undefined, limit: 20, includeRaw: includeRawSamples ? "true" : undefined }), enabled: Boolean(id) && tab === "samples" });
  const firstSampleOpportunityId = samples.data?.items.map((sample) => sample.opportunity.id ?? sample.opportunity._id ?? "").find(Boolean) ?? "";
  const activeToolOpportunityId = toolOpportunityId || firstSampleOpportunityId;
  const toolCapabilities = useQuery({ queryKey: ["admin", "sources", id, "tools", activeToolOpportunityId], queryFn: () => adminApi.sources.toolCapabilities(id, { opportunityId: activeToolOpportunityId }), enabled: Boolean(id) && tab === "samples" && Boolean(activeToolOpportunityId) });
  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "sources"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "sources", id] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "sources", id, "runs"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "sources", id, "logs"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "sources", id, "samples"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "sources", id, "tools"] }),
  ]);
  const run = useMutation({ mutationFn: () => adminApi.sources.run(id), onMutate: () => setActionMessage(""), onSuccess: async () => { setActionMessage(text.runQueued); await invalidate(); } });
  const check = useMutation({ mutationFn: () => adminApi.sources.test(id), onMutate: () => setActionMessage(""), onSuccess: async (result) => { setActionMessage(checkActionMessage(result, text, locale)); await invalidate(); } });
  const discover = useMutation({ mutationFn: () => adminApi.sources.discover(id), onMutate: () => setActionMessage(""), onSuccess: async () => { setActionMessage(text.discoverCompleted); await invalidate(); } });
  const stop = useMutation({ mutationFn: adminApi.sources.stop, onMutate: () => setActionMessage(""), onSuccess: async () => { setActionMessage(text.stopSucceeded); await invalidate(); } });
  const recover = useMutation({ mutationFn: adminApi.sources.recover, onMutate: () => setActionMessage(""), onSuccess: async () => { setActionMessage(text.recoveryQueued); await invalidate(); }, onError: invalidate });
  const sourceTool = useMutation({ mutationFn: ({ action, opportunityId }: { action: SourceInspectorToolAction; opportunityId: string }) => adminApi.sources.sourceTool(id, action, opportunityId), onMutate: ({ opportunityId }) => { setToolOpportunityId(opportunityId); setToolReceipt(undefined); }, onSuccess: async (result) => { setToolReceipt(result); await toolCapabilities.refetch(); } });

  const source = query.data;
  const supportsDiscovery = Boolean(source && ["AtsPublicBoard", "AtsAuthenticated"].includes(source.connectorFamily));
  const sourceActionBusy = check.isPending || run.isPending || discover.isPending || stop.isPending || recover.isPending;

  return (
    <AdminFrame title={source?.name ?? text.fallbackTitle} description={text.description}>
      <AdminQueryState isLoading={query.isLoading || runs.isLoading} isError={query.isError || runs.isError} onRetry={() => { query.refetch(); runs.refetch(); }}>
        {source ? <>
          <section className="mb-4 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><h2 className="truncate text-lg font-semibold">{source.name}</h2><p className="mt-1 text-sm text-muted-foreground">{sourceId(source)} · {localizedLabel(sourceGroupLabels, source.group, locale)} · {source.connectorFamily}</p></div>
              <div className="flex flex-wrap gap-2">
                <Badge intent={source.enabled ? "success" : "warning"}>{source.enabled ? text.enabled : text.disabled}</Badge>
                <Badge intent={source.healthState === "Failed" ? "danger" : source.healthState === "Healthy" ? "success" : "neutral"}>{localizedLabel(healthLabels, source.healthState ?? source.status, locale)}</Badge>
                <Badge intent="neutral">{localizedLabel(runtimeLabels, source.runtimeState, locale)}</Badge>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => check.mutate()} loading={check.isPending} disabled={sourceActionBusy}><TestTube2 className="size-4" />{text.check}</Button>
              <Button size="sm" variant="outline" onClick={() => run.mutate()} loading={run.isPending} disabled={!source.enabled || sourceActionBusy}><Play className="size-4" />{text.run}</Button>
              {supportsDiscovery ? <Button size="sm" variant="outline" onClick={() => discover.mutate()} loading={discover.isPending} disabled={sourceActionBusy}><Radar className="size-4" />{text.discover}</Button> : null}
            </div>
            <div aria-live="polite">{actionMessage ? <p role="status" className="mt-2 rounded-md border bg-background p-3 text-sm">{actionMessage}</p> : null}</div>
            {check.isError ? <p role="alert" className="mt-2 text-sm text-destructive">{check.error.message}</p> : null}
            {run.isError ? <p role="alert" className="mt-2 text-sm text-destructive">{sourceActionErrorMessage(run.error, text)}</p> : null}
            {discover.isError ? <p role="alert" className="mt-2 text-sm text-destructive">{discover.error.message}</p> : null}
            {stop.isError ? <p role="alert" className="mt-2 text-sm text-destructive">{stop.error.message}</p> : null}
          </section>
          <div className="mb-4 flex flex-wrap gap-2" aria-label="Source detail tabs">{(["overview", "config", "credentials", "runs", "logs", "samples"] as Tab[]).map((item) => <Button key={item} size="sm" variant={tab === item ? "primary" : "outline"} aria-pressed={tab === item} onClick={() => setTab(item)}>{text.tabs[item]}</Button>)}</div>
          {tab === "overview" ? <>
            <CollectionSummary latestRun={runs.data?.latestCollectionRun ?? null} text={text} locale={locale} />
            <Overview source={source} text={text} locale={locale} />
          </> : null}
          {tab === "config" ? <SourceConfigForm source={source} text={text} locale={locale} onSaved={invalidate} /> : null}
          {tab === "credentials" ? <CredentialsForm source={source} text={text} locale={locale} onSaved={invalidate} /> : null}
          {tab === "runs" ? <>
            <p className="mb-3 text-sm text-muted-foreground">{text.recoveryHint}</p>
            {recover.isSuccess ? <p role="status" className="mb-3 rounded-md border bg-background p-3 text-sm">{text.recoveryQueued}</p> : null}
            {recover.isError ? <p role="alert" className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{recoveryErrorMessage(recover.error, text)}</p> : null}
            <RunsTable runs={runs.data?.items ?? []} text={text} locale={locale} stopRun={(runId) => stop.mutate(runId)} stopping={stop.isPending} recoverRun={(runId) => recover.mutate(runId)} recovering={recover.isPending} observedAt={runs.dataUpdatedAt} sourceEnabled={Boolean(source.enabled) && !["Disabled", "Maintenance"].includes(source.runtimeState ?? "")} />
            <RunPagination text={text} page={runCursors.length} fetching={runs.isFetching} previousDisabled={runCursors.length === 1} nextCursor={runs.data?.nextCursor ?? null} onPrevious={() => setRunPager((value) => ({ sourceId: id, cursors: (value.sourceId === id ? value.cursors : [null]).slice(0, -1) }))} onNext={(cursor) => setRunPager((value) => ({ sourceId: id, cursors: [...(value.sourceId === id ? value.cursors : [null]), cursor] }))} />
          </> : null}
          {tab === "logs" ? <SourceLogsPanel locale={locale} copy={sourceInspectorCopy[locale]} data={logs.data} isLoading={logs.isLoading} isError={logs.isError} onRetry={() => logs.refetch()} filters={logsFilters} onFiltersChange={(next) => { setLogsFilters(next); setLogsCursor(null); }} onNext={setLogsCursor} /> : null}
          {tab === "samples" ? <SourceSamplesPanel locale={locale} copy={sourceInspectorCopy[locale]} samples={samples.data?.items ?? []} isLoading={samples.isLoading} isError={samples.isError} includeRaw={includeRawSamples} nextCursor={samples.data?.nextCursor} onRetry={() => samples.refetch()} onNext={(cursor) => { setSamplesCursor(cursor); setToolOpportunityId(""); setToolReceipt(undefined); sourceTool.reset(); }} onShowRaw={() => { setIncludeRawSamples(true); setSamplesCursor(null); setToolOpportunityId(""); setToolReceipt(undefined); sourceTool.reset(); }} toolOpportunityId={activeToolOpportunityId} capabilities={toolCapabilities.data} capabilitiesLoading={toolCapabilities.isFetching} capabilitiesError={toolCapabilities.isError ? toolCapabilities.error.message : undefined} onCapabilitiesRetry={() => toolCapabilities.refetch()} onToolOpportunityChange={(opportunityId) => { setToolOpportunityId(opportunityId); setToolReceipt(undefined); sourceTool.reset(); }} onToolAction={(action, opportunityId) => sourceTool.mutate({ action, opportunityId })} toolPending={sourceTool.isPending && sourceTool.variables ? sourceTool.variables : null} toolReceipt={toolReceipt} toolError={sourceTool.isError ? sourceTool.error.message : undefined} /> : null}
        </> : null}
      </AdminQueryState>
    </AdminFrame>
  );
}

function CollectionSummary({ latestRun, text, locale }: { latestRun?: AdminSourceRun | null; text: SourceDetailCopy; locale: AdminLocale }) {
  const summary = sourceCollectionSummary(latestRun, locale);
  if (!summary) return <section className="mb-4 min-w-0 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground" aria-label={locale === "en" ? "Collection coverage" : "Полнота сбора"}>{text.collectionEmpty}</section>;
  return <section className={`mb-4 min-w-0 rounded-lg border p-4 text-sm ${summary.incomplete ? "border-warning/30 bg-warning/10" : "bg-card"}`} aria-label={locale === "en" ? "Collection coverage" : "Полнота сбора"}>
    <h3 className="font-semibold">{summary.title}</h3>
    <p className="mt-2 break-words text-muted-foreground">{summary.description}</p>
    <dl className="mt-3 grid gap-3 sm:grid-cols-3">
      <Metric label={locale === "en" ? "Saved or updated records" : "Сохранено или обновлено записей"} value={summary.processed === undefined ? "—" : summary.processed.toLocaleString(locale)} />
      <Metric label={locale === "en" ? "Period starts" : "Начало периода"} value={dateLabel(typeof summary.windowSince === "string" ? summary.windowSince : undefined, locale)} />
      <Metric label={locale === "en" ? "Period ends" : "Конец периода"} value={dateLabel(typeof summary.windowUntil === "string" ? summary.windowUntil : undefined, locale)} />
    </dl>
  </section>;
}

function RunPagination({ text, page, fetching, previousDisabled, nextCursor, onPrevious, onNext }: {
  text: SourceDetailCopy;
  page: number;
  fetching: boolean;
  previousDisabled: boolean;
  nextCursor: string | null;
  onPrevious: () => void;
  onNext: (cursor: string) => void;
}) {
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
    <p className="text-xs text-muted-foreground">{text.page} {page}</p>
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={previousDisabled || fetching} onClick={onPrevious}><ChevronLeft className="size-4" aria-hidden />{text.previous}</Button>
      <Button size="sm" variant="outline" disabled={!nextCursor || fetching} onClick={() => { if (nextCursor) onNext(nextCursor); }}>{text.next}<ChevronRight className="size-4" aria-hidden /></Button>
    </div>
  </div>;
}

function Overview({ source, text, locale }: { source: AdminSource; text: SourceDetailCopy; locale: AdminLocale }) {
  const diagnostics = { endpoint: source.endpoint, policy: source.policy, checkpoint: source.checkpoint, unavailableReason: source.unavailableReason };
  const connectionState = source.lastHealthCheckState ?? "Unknown";
  const connectionMessage = source.lastHealthCheckMessage;
  return <div className="grid gap-4 xl:grid-cols-2"><section className="rounded-lg border bg-card p-4 text-sm"><h3 className="font-semibold">{text.operations}</h3><dl className="mt-3 grid gap-2 sm:grid-cols-2"><Metric label={text.interval} value={secondsLabel(source.intervalSeconds ?? (source.intervalMinutes ? source.intervalMinutes * 60 : undefined), locale)} /><Metric label={text.timeout} value={source.timeoutMs ? `${source.timeoutMs} ${locale === "en" ? "ms" : "мс"}` : "—"} /><Metric label={text.credentials} value={sourceCredentialsState(source, locale)} /><Metric label={text.proxyPool} value={boolLabel(source.proxyPoolEnabled, locale)} /><Metric label={text.lastSuccessfulCollection} value={dateLabel(source.lastSuccessAt, locale)} /><Metric label={text.connectionCheck} value={`${localizedLabel(healthLabels, connectionState, locale)} · ${dateLabel(source.lastHealthCheckAt, locale)}`} /></dl>{connectionMessage ? <p className="mt-3 rounded-md border bg-background/70 p-3 text-muted-foreground"><span className="font-medium">{text.connectionCheckMessage}: </span>{connectionMessage}</p> : null}{source.lastError ? <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-muted-foreground">{source.lastError}</p> : null}</section><section className="rounded-lg border bg-card p-4 text-sm"><h3 className="font-semibold">{text.boundary}</h3><p className="mt-2 text-muted-foreground">{text.boundaryText}</p><dl className="mt-3 grid gap-2"><Metric label={text.parser} value={source.parserVersion ?? "—"} /><Metric label={text.normalization} value={source.normalizationProfile ?? "—"} /><Metric label={text.refresh} value={source.refreshPolicy ?? "—"} /><Metric label={text.checkpoint} value={source.checkpointStrategy ?? "—"} /></dl></section><details className="min-w-0 rounded-lg border bg-card p-4 text-sm xl:col-span-2"><summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>{text.endpointPolicyCheckpoint}</span><span className="ml-2 text-xs font-normal text-muted-foreground">{text.expandDiagnostics}</span></summary><p className="mt-3 text-muted-foreground">{text.diagnosticsSummary}</p><pre className="mt-3 max-h-[32rem] overflow-auto rounded bg-muted p-3 text-xs">{safeJson(diagnostics)}</pre></details></div>;
}

function SourceConfigForm({ source, text, locale, onSaved }: { source: AdminSource; text: SourceDetailCopy; locale: AdminLocale; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(Boolean(source.enabled));
  const [runtimeState, setRuntimeState] = useState(source.runtimeState ?? "Enabled");
  const [intervalSeconds, setIntervalSeconds] = useState(String(source.intervalSeconds ?? 900));
  const [timeoutMs, setTimeoutMs] = useState(String(source.timeoutMs ?? 15000));
  const [tenants, setTenants] = useState(((source.config?.tenants as string[] | undefined) ?? []).join(", "));
  const [discoveryHosts, setDiscoveryHosts] = useState(((source.config?.discoveryHosts as string[] | undefined) ?? []).join(", "));
  const [searchText, setSearchText] = useState(String(source.config?.searchText ?? ""));
  const [area, setArea] = useState(String(source.config?.area ?? ""));
  const [perPage, setPerPage] = useState(String(source.limits?.perPage ?? ""));
  const [maxPages, setMaxPages] = useState(String(source.limits?.maxPages ?? ""));
  const [proxyPoolEnabled, setProxyPoolEnabled] = useState(Boolean(source.proxyPoolEnabled));
  const mutation = useMutation({ mutationFn: () => adminApi.sources.update(sourceId(source), cleanPatch({ enabled, runtimeState, intervalSeconds: numberOrUndefined(intervalSeconds), timeoutMs: numberOrUndefined(timeoutMs), tenants: splitValues(tenants), discoveryHosts: splitValues(discoveryHosts), searchText: emptyToUndefined(searchText), area: emptyToUndefined(area), perPage: numberOrUndefined(perPage), maxPages: numberOrUndefined(maxPages), proxyPoolEnabled })), onSuccess: onSaved });
  return <form className="grid gap-4 rounded-lg border bg-card p-4 text-sm md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}><label className="flex items-center gap-2 md:col-span-2"><Checkbox checked={enabled} onCheckedChange={(checked) => setEnabled(Boolean(checked))} /> {text.enabledForCollection}</label><Field label={text.runtimeState}><select className={`${selectClass} w-full min-w-0`} value={runtimeState} onChange={(event) => setRuntimeState(event.target.value)}>{["Enabled", "Disabled", "Maintenance", "Experimental", "Conditional"].map((item) => <option key={item} value={item}>{localizedLabel(runtimeLabels, item, locale)}</option>)}</select></Field><Field label={text.intervalSeconds}><Input value={intervalSeconds} onChange={(event) => setIntervalSeconds(event.target.value)} inputMode="numeric" /></Field><Field label={text.timeoutMs}><Input value={timeoutMs} onChange={(event) => setTimeoutMs(event.target.value)} inputMode="numeric" /></Field><Field label={text.perPage}><Input value={perPage} onChange={(event) => setPerPage(event.target.value)} inputMode="numeric" /></Field><Field label={text.maxPages}><Input value={maxPages} onChange={(event) => setMaxPages(event.target.value)} inputMode="numeric" /></Field><label className="flex items-center gap-2"><Checkbox checked={proxyPoolEnabled} onCheckedChange={(checked) => setProxyPoolEnabled(Boolean(checked))} /> {text.proxyPool}</label><Field label={text.tenants}><Input value={tenants} onChange={(event) => setTenants(event.target.value)} placeholder={text.commaPlaceholder} /></Field><Field label={text.discoveryHosts}><Input value={discoveryHosts} onChange={(event) => setDiscoveryHosts(event.target.value)} placeholder={text.commaPlaceholder} /></Field><Field label={text.searchText}><Input value={searchText} onChange={(event) => setSearchText(event.target.value)} /></Field><Field label={text.area}><Input value={area} onChange={(event) => setArea(event.target.value)} /></Field><div className="md:col-span-2"><Button type="submit" loading={mutation.isPending}>{text.saveConfig}</Button>{mutation.isError ? <p className="mt-2 text-sm text-destructive">{mutation.error.message}</p> : null}</div></form>;
}

function CredentialsForm({ source, text, locale, onSaved }: { source: AdminSource; text: SourceDetailCopy; locale: AdminLocale; onSaved: () => void }) {
  const [credentials, setCredentials] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: (body: Record<string, unknown>) => adminApi.sources.update(sourceId(source), { credentials: body }), onSuccess: () => { setCredentials(""); onSaved(); } });
  return <section className="rounded-lg border bg-card p-4 text-sm"><h3 className="font-semibold">{text.credentials}</h3><p className="mt-2 text-muted-foreground">{text.credentialsDescription}</p><div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]"><label className="min-w-0 space-y-1"><span className="font-medium">{text.newCredentials}</span><Textarea className="min-h-48 font-mono text-xs" value={credentials} onChange={(event) => { setCredentials(event.target.value); setError(""); }} placeholder={'{\n  "apiKey": "..."\n}'} /></label><div className="rounded-md border bg-background/70 p-3 text-xs text-muted-foreground"><p>{text.configured}: {sourceCredentialsState(source, locale)}</p><p>{text.preview}: {source.credentialsPreview ?? "—"}</p><p>{text.credentialRef}: {source.authCredentialRef ?? "—"}</p></div></div><Button className="mt-3" loading={mutation.isPending} disabled={!credentials.trim()} onClick={() => { try { const parsed = JSON.parse(credentials) as Record<string, unknown>; mutation.mutate(parsed); } catch { setError(text.invalidJson); } }}>{text.saveCredentials}</Button>{error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}{mutation.isError ? <p className="mt-2 text-sm text-destructive">{mutation.error.message}</p> : null}</section>;
}

function RunsTable({ runs, text, locale, stopRun, stopping, recoverRun, recovering, sourceEnabled, observedAt }: {
  runs: AdminSourceRun[];
  text: SourceDetailCopy;
  locale: AdminLocale;
  stopRun: (id: string) => void;
  stopping: boolean;
  recoverRun: (id: string) => void;
  recovering: boolean;
  sourceEnabled: boolean;
  observedAt: number;
}) {
  if (!runs.length) return <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">{text.runsEmpty}</p>;
  return <section className="min-w-0 rounded-lg border bg-card">
    <div className="grid gap-3 p-3 md:hidden">
      {runs.map((run) => <RunCard key={run.id ?? run._id ?? `${run.sourceId}-${run.createdAt}`} run={run} text={text} locale={locale} stopRun={stopRun} stopping={stopping} recoverRun={recoverRun} recovering={recovering} sourceEnabled={sourceEnabled} observedAt={observedAt} />)}
    </div>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[56rem] text-left text-sm">
        <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>{[text.runCol, text.status, text.time, text.stats, text.error, text.actions].map((label, index) => <th key={label} className={`px-3 py-2 ${index === 5 ? "text-right" : ""}`}>{label}</th>)}</tr>
        </thead>
        <tbody>{runs.map((run) => {
          const state = runActionState(run, sourceEnabled, observedAt);
          return <tr key={state.id} className="border-b last:border-0">
            <td className="px-3 py-3 align-top"><p className="font-medium">{run.runType}</p><p className="break-all text-xs text-muted-foreground">{state.id}</p></td>
            <td className="px-3 py-3 align-top"><Badge intent={run.status === "Failed" ? "danger" : run.status === "Succeeded" ? "success" : "neutral"}>{localizedLabel(runStatusLabels, run.status, locale)}</Badge></td>
            <td className="px-3 py-3 align-top text-xs text-muted-foreground">
              <p>{text.start}: {dateLabel(run.startedAt ?? run.createdAt, locale)}</p>
              <p>{text.lastUpdate}: {dateLabel(run.updatedAt, locale)}</p>
              <p>{text.finish}: {dateLabel(run.finishedAt, locale)}</p>
            </td>
            <td className="px-3 py-3 align-top"><pre className="max-w-xs overflow-auto rounded bg-muted p-2 text-xs">{safeJson(run.stats ?? {})}</pre></td>
            <td className="max-w-sm px-3 py-3 align-top text-xs text-destructive">{run.error}</td>
            <td className="px-3 py-3 align-top text-right"><RunActions state={state} text={text} stopRun={stopRun} stopping={stopping} recoverRun={recoverRun} recovering={recovering} /></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}

function RunCard({ run, text, locale, stopRun, stopping, recoverRun, recovering, sourceEnabled, observedAt }: {
  run: AdminSourceRun;
  text: SourceDetailCopy;
  locale: AdminLocale;
  stopRun: (id: string) => void;
  stopping: boolean;
  recoverRun: (id: string) => void;
  recovering: boolean;
  sourceEnabled: boolean;
  observedAt: number;
}) {
  const state = runActionState(run, sourceEnabled, observedAt);
  return <article className="min-w-0 rounded-lg border bg-card p-3 text-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><p className="font-medium">{run.runType}</p><p className="break-all text-xs text-muted-foreground">{state.id}</p></div>
      <Badge intent={run.status === "Failed" ? "danger" : run.status === "Succeeded" ? "success" : "neutral"}>{localizedLabel(runStatusLabels, run.status, locale)}</Badge>
    </div>
    <dl className="mt-3 grid gap-2 text-xs">
      <Metric label={text.start} value={dateLabel(run.startedAt ?? run.createdAt, locale)} />
      <Metric label={text.lastUpdate} value={dateLabel(run.updatedAt, locale)} />
      <Metric label={text.finish} value={dateLabel(run.finishedAt, locale)} />
    </dl>
    {run.error ? <p className="mt-3 break-words text-xs text-destructive">{run.error}</p> : null}
    <details className="mt-3 min-w-0 rounded-md border p-3"><summary className="cursor-pointer text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{text.stats}</summary><pre className="mt-3 max-h-72 overflow-auto rounded bg-muted p-2 text-xs">{safeJson(run.stats ?? {})}</pre></details>
    <div className="mt-3 flex flex-wrap justify-end gap-2"><RunActions state={state} text={text} stopRun={stopRun} stopping={stopping} recoverRun={recoverRun} recovering={recovering} /></div>
  </article>;
}

function RunActions({ state, text, stopRun, stopping, recoverRun, recovering }: { state: ReturnType<typeof runActionState>; text: SourceDetailCopy; stopRun: (id: string) => void; stopping: boolean; recoverRun: (id: string) => void; recovering: boolean }) {
  return <>
    {state.canRecover ? <Button size="sm" variant="outline" aria-label={text.recoverName(state.id)} loading={recovering} disabled={stopping} onClick={() => recoverRun(state.id)}><RotateCcw className="size-4" />{text.recover}</Button> : null}
    {state.canStop ? <Button size="sm" variant="outline" loading={stopping} disabled={recovering} onClick={() => stopRun(state.id)}><Square className="size-4" />{text.stop}</Button> : null}
  </>;
}

function runActionState(run: AdminSourceRun, sourceEnabled: boolean, observedAt: number) {
  const id = run.id ?? run._id ?? "";
  const canStop = ["Queued", "Running"].includes(run.status);
  const lastUpdated = run.updatedAt ? Date.parse(run.updatedAt) : NaN;
  const canRecover = sourceEnabled && canStop && !run.requestedStopAt &&
    ["manual", "scheduled", "backfill"].includes(run.runType) && run.requestMetadata?.mode !== "refresh" &&
    Number.isFinite(lastUpdated) && observedAt - lastUpdated >= 5 * 60_000;
  return { id, canStop, canRecover };
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div>; }
function checkActionMessage(result: unknown, text: SourceDetailCopy, locale: AdminLocale) {
  const health = (result as { health?: { state?: string; message?: string } } | undefined)?.health;
  if (!health?.state) return text.actionSucceeded;
  return text.checkResult(localizedLabel(healthLabels, health.state, locale), health.message);
}

function sourceActionErrorMessage(error: Error, text: SourceDetailCopy) {
  if (error instanceof ApiError && (error.code === "SOURCE_RUN_ACTIVE" || error.status === 409)) return text.activeRun;
  return error.message;
}

function recoveryErrorMessage(error: Error, text: SourceDetailCopy) {
  if (error instanceof ApiError) {
    if (error.kind === "NetworkError") return text.recoveryNetworkError;
    if (error.code && text.recoveryErrors[error.code]) return text.recoveryErrors[error.code];
  }
  return error.message || text.recoveryErrorFallback;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="min-w-0 space-y-1"><span className="font-medium">{label}</span>{children}</label>; }
function splitValues(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function numberOrUndefined(value: string) { const parsed = Number(value); return Number.isFinite(parsed) && value.trim() ? parsed : undefined; }
function emptyToUndefined(value: string) { return value.trim() || undefined; }
function cleanPatch<T extends Record<string, unknown>>(value: T) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<AdminSource> & Record<string, unknown>; }
