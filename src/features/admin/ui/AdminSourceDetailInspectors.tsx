"use client";

import Link from "next/link";
import { ArrowRight, DatabaseZap, Eye, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AdminSourceLogEntry,
  AdminSourceLogsBlock,
  AdminSourceLogsResponse,
  AdminSourceOpportunitySample,
  SourceInspectorToolAction,
  AdminSourceToolCapabilitiesResponse,
  AdminSourceToolReceipt
} from "@/types/admin-source-detail";
import { dateLabel, healthLabels, localizedLabel, safeJson } from "./admin-format";
import type { AdminLocale, Localized } from "./admin-locale";

const selectClass =
  "h-[var(--control-height)] w-full min-w-0 rounded-md border border-border/80 bg-card px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring";

const sampleTypeLabels: Localized<Record<string, string>> = {
  ru: { vacancy: "Вакансия", freelance: "Проект", tender: "Тендер", project: "Проект" },
  en: { vacancy: "Vacancy", freelance: "Project", tender: "Tender", project: "Project" }
};

const toolActionLabels: Localized<Record<string, string>> = {
  ru: {
    reindex: "Переиндексировать",
    reprocess: "Обработать raw заново",
    normalize: "Повторить нормализацию",
    deduplicate: "Объединить дубли",
    "reprocess-raw-payload": "повторная обработка исходных данных",
    "rerun-normalization": "повтор нормализации",
    "rerun-deduplication": "объединение дублей"
  },
  en: {
    reindex: "Reindex",
    reprocess: "Reprocess raw",
    normalize: "Rerun normalization",
    deduplicate: "Merge duplicates",
    "reprocess-raw-payload": "raw reprocessing",
    "rerun-normalization": "normalization rerun",
    "rerun-deduplication": "duplicate merge"
  }
};

const toolActions: SourceInspectorToolAction[] = [
  "reindex",
  "reprocess",
  "normalize",
  "deduplicate"
];

const toolReasonLabels: Localized<Record<string, string>> = {
  ru: {
    selectOpportunity: "Выберите сохранённую запись источника.",
    sampleNotFound: "Запись источника не найдена.",
    missingExternalId: "У записи нет externalId.",
    missingUrl: "У записи нет URL.",
    missingRawPayload: "Для записи не сохранён raw payload.",
    missingSourceMetadata: "Для записи не сохранены метаданные источника.",
    unsupportedSourceMapper: "Для этого источника ещё нет повторной обработки сохранённых данных.",
    missingNativePayload: "В сохранённых данных нет исходной карточки площадки.",
    identityMismatch: "Исходная карточка не совпадает с выбранной записью.",
    invalidNativeUrl: "Ссылка исходной карточки не прошла проверку.",
    dedupUnsupported: "Повторное объединение сохранённых дублей ещё недоступно.",
    removedOccurrence:
      "Источник подтвердил удаление записи. Сохранённые данные не восстанавливают её автоматически.",
    unsupported: "Инструмент сейчас недоступен."
  },
  en: {
    selectOpportunity: "Select a retained source record.",
    sampleNotFound: "The source record was not found.",
    missingExternalId: "The record is missing externalId.",
    missingUrl: "The record is missing URL.",
    missingRawPayload: "The record has no retained raw payload.",
    missingSourceMetadata: "The record has no retained source metadata.",
    unsupportedSourceMapper: "Retained-data replay is not available for this source yet.",
    missingNativePayload: "The retained data does not contain the original platform card.",
    identityMismatch: "The original card does not match the selected record.",
    invalidNativeUrl: "The original card URL did not pass validation.",
    dedupUnsupported: "Merging retained duplicates is not available yet.",
    removedOccurrence:
      "The source confirmed this record was removed. Retained data cannot restore it automatically.",
    unsupported: "This tool is unavailable now."
  }
};

const toolReasonCodeAliases: Record<string, keyof typeof toolReasonLabels.en> = {
  selectOpportunity: "selectOpportunity",
  select_opportunity: "selectOpportunity",
  select_opportunity_sample: "selectOpportunity",
  "select-opportunity-sample": "selectOpportunity",
  sampleNotFound: "sampleNotFound",
  sample_not_found: "sampleNotFound",
  opportunity_not_found: "sampleNotFound",
  opportunity_sample_not_found: "sampleNotFound",
  "opportunity-sample-not-found": "sampleNotFound",
  missingExternalId: "missingExternalId",
  missing_external_id: "missingExternalId",
  "missing-external-id": "missingExternalId",
  missingExternalID: "missingExternalId",
  missingUrl: "missingUrl",
  missing_url: "missingUrl",
  "missing-url": "missingUrl",
  missingRawPayload: "missingRawPayload",
  missing_raw_payload: "missingRawPayload",
  missing_retained_raw: "missingRawPayload",
  "missing-raw-payload": "missingRawPayload",
  missingSourceMetadata: "missingSourceMetadata",
  missing_source_metadata: "missingSourceMetadata",
  "missing-source-metadata": "missingSourceMetadata",
  unsupported_source_mapper: "unsupportedSourceMapper",
  missing_retained_native_payload: "missingNativePayload",
  identity_mismatch: "identityMismatch",
  invalid_native_url: "invalidNativeUrl",
  dedup_unsupported: "dedupUnsupported",
  removed_source_occurrence: "removedOccurrence",
  unsupported: "unsupported"
};

function localizedToolReason(locale: AdminLocale, reason?: string, reasonCode?: string) {
  const labelKey = reasonCode ? toolReasonCodeAliases[reasonCode] : undefined;
  return labelKey
    ? toolReasonLabels[locale][labelKey]
    : (reason ?? toolReasonLabels[locale].unsupported);
}

export type SourceInspectorCopy = {
  logs: string;
  samples: string;
  tools: string;
  filters: string;
  runId: string;
  level: string;
  from: string;
  to: string;
  search: string;
  apply: string;
  reset: string;
  next: string;
  emptyLogs: string;
  emptySamples: string;
  loadError: string;
  retry: string;
  loading: string;
  rawPayload: string;
  showRaw: string;
  rawIncluded: string;
  rawUnavailable: string;
  fields: string;
  openOpportunity: string;
  selectSample: string;
  noToolTarget: string;
  useInTools: string;
  reindex: string;
  reindexQueued: string;
  toolQueued: (action: string) => string;
  toolUnsupported: (action: string, reason?: string) => string;
  unavailableActions: string;
  capabilitiesLoading: string;
  toolsDescription: string;
  unsupportedTools: string;
  metadata: string;
  updated: string;
  time: string;
  message: string;
  logStatus: string;
  checkedAt: string;
  retention: string;
  unavailableLogs: string;
  unconfiguredLogs: string;
};

export const sourceInspectorCopy: Localized<SourceInspectorCopy> = {
  ru: {
    logs: "Логи",
    samples: "Данные",
    tools: "Инструменты",
    filters: "Фильтры логов",
    runId: "Run ID",
    level: "Уровень",
    from: "С",
    to: "По",
    search: "Поиск",
    apply: "Применить",
    reset: "Сбросить",
    next: "Следующая страница",
    emptyLogs: "Логов по выбранным фильтрам нет.",
    emptySamples: "Сырых примеров по источнику пока нет.",
    loadError: "Не удалось загрузить данные вкладки.",
    retry: "Повторить",
    loading: "Загрузка…",
    rawPayload: "Raw payload",
    showRaw: "Показать raw",
    rawIncluded: "Raw включён для текущей страницы.",
    rawUnavailable:
      "Подробные исходные данные скрыты. Нажмите “Показать raw”, чтобы загрузить их для текущей страницы.",
    fields: "Поля",
    openOpportunity: "Открыть возможность",
    selectSample: "Запись для инструментов",
    noToolTarget: "Выберите запись ниже, чтобы увидеть доступные инструменты.",
    useInTools: "В инструменты",
    reindex: "Переиндексировать",
    reindexQueued: "Переиндексация поставлена в очередь.",
    toolQueued: (action) => `${action} поставлено в очередь.`,
    toolUnsupported: (action, reason) =>
      `${action} сейчас недоступно${reason ? `: ${reason}` : "."}`,
    unavailableActions: "Недоступно сейчас",
    capabilitiesLoading: "Проверяем доступные инструменты…",
    toolsDescription:
      "Инструменты работают с выбранной сохранённой записью источника, ставят задачу в очередь и не меняют raw вручную.",
    unsupportedTools: "Показываем только инструменты, которые доступны для выбранной записи.",
    metadata: "Метаданные источника",
    updated: "Обновлено",
    time: "Время",
    message: "Сообщение",
    logStatus: "Статус логов",
    checkedAt: "Проверено",
    retention: "Хранение",
    unavailableLogs:
      "Логи сейчас недоступны. Это не пустой результат: backend не смог прочитать хранилище логов.",
    unconfiguredLogs: "Хранилище логов не настроено. Логи источника не собираются в файловый архив."
  },
  en: {
    logs: "Logs",
    samples: "Data",
    tools: "Tools",
    filters: "Log filters",
    runId: "Run ID",
    level: "Level",
    from: "From",
    to: "To",
    search: "Search",
    apply: "Apply",
    reset: "Reset",
    next: "Next page",
    emptyLogs: "No logs match these filters.",
    emptySamples: "No raw samples are available for this source yet.",
    loadError: "Could not load this tab data.",
    retry: "Retry",
    loading: "Loading…",
    rawPayload: "Raw payload",
    showRaw: "Show raw",
    rawIncluded: "Raw is included for the current page.",
    rawUnavailable: "Detailed raw data is hidden. Use Show raw to load it for the current page.",
    fields: "Fields",
    openOpportunity: "Open opportunity",
    selectSample: "Tool target",
    noToolTarget: "Select a record below to see available tools.",
    useInTools: "Use in tools",
    reindex: "Reindex",
    reindexQueued: "Reindex job queued.",
    toolQueued: (action) => `${action} queued.`,
    toolUnsupported: (action, reason) =>
      `${action} is unavailable now${reason ? `: ${reason}` : "."}`,
    unavailableActions: "Unavailable now",
    capabilitiesLoading: "Checking available tools…",
    toolsDescription:
      "Tools run against the selected retained source record. They queue work and never edit raw data manually.",
    unsupportedTools: "Only tools available for the selected record are shown as runnable.",
    metadata: "Source metadata",
    updated: "Updated",
    time: "Time",
    message: "Message",
    logStatus: "Log status",
    checkedAt: "Checked",
    retention: "Retention",
    unavailableLogs:
      "Logs are unavailable now. This is not an empty result: the backend could not read log storage.",
    unconfiguredLogs:
      "Log storage is not configured. Source logs are not collected into the file archive."
  }
};

export function SourceLogsPanel({
  locale,
  copy,
  data,
  isLoading,
  isError,
  onRetry,
  filters,
  onFiltersChange,
  onNext
}: {
  locale: AdminLocale;
  copy: SourceInspectorCopy;
  data?: AdminSourceLogsResponse;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  filters: { runId: string; level: string; from: string; to: string; query: string };
  onFiltersChange: (filters: {
    runId: string;
    level: string;
    from: string;
    to: string;
    query: string;
  }) => void;
  onNext: (cursor: string) => void;
}) {
  const logs = data?.logs;
  const items = logs?.items ?? [];
  return (
    <section className="min-w-0 space-y-4">
      <form
        className="grid gap-3 rounded-lg border bg-card p-4 text-sm md:grid-cols-2 xl:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          onRetry();
        }}
      >
        <h3 className="font-semibold md:col-span-2 xl:col-span-3">{copy.filters}</h3>
        <label className="min-w-0 space-y-1">
          <span className="text-xs text-muted-foreground">{copy.runId}</span>
          <Input
            value={filters.runId}
            onChange={(event) => onFiltersChange({ ...filters, runId: event.target.value })}
          />
        </label>
        <label className="min-w-0 space-y-1">
          <span className="text-xs text-muted-foreground">{copy.level}</span>
          <select
            className={`${selectClass} w-full min-w-0`}
            value={filters.level}
            onChange={(event) => onFiltersChange({ ...filters, level: event.target.value })}
          >
            <option value="">—</option>
            {["trace", "debug", "info", "warn", "error", "fatal"].map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 space-y-1">
          <span className="text-xs text-muted-foreground">{copy.from}</span>
          <Input
            type="datetime-local"
            value={filters.from}
            onInput={(event) => onFiltersChange({ ...filters, from: event.currentTarget.value })}
          />
        </label>
        <label className="min-w-0 space-y-1">
          <span className="text-xs text-muted-foreground">{copy.to}</span>
          <Input
            type="datetime-local"
            value={filters.to}
            onInput={(event) => onFiltersChange({ ...filters, to: event.currentTarget.value })}
          />
        </label>
        <label className="min-w-0 space-y-1">
          <span className="text-xs text-muted-foreground">{copy.search}</span>
          <Input
            value={filters.query}
            onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
          />
        </label>
        <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-1">
          <Button type="submit" size="sm" variant="outline">
            {copy.apply}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onFiltersChange({ runId: "", level: "", from: "", to: "", query: "" })}
          >
            {copy.reset}
          </Button>
        </div>
      </form>
      {logs ? <LogStatus logs={logs} copy={copy} locale={locale} /> : null}
      <PanelState
        isLoading={isLoading}
        isError={isError}
        empty={logs?.status === "available" && !items.length}
        emptyLabel={copy.emptyLogs}
        errorLabel={copy.loadError}
        retryLabel={copy.retry}
        loadingLabel={copy.loading}
        onRetry={onRetry}
      />
      {logs?.status === "unconfigured" ? (
        <p
          role="status"
          className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-muted-foreground"
        >
          {copy.unconfiguredLogs}
        </p>
      ) : null}
      {logs?.status === "unavailable" ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {copy.unavailableLogs}
        </p>
      ) : null}
      <div className="grid gap-3">
        {items.map((entry, index) => (
          <LogCard
            key={entry.id ?? `${entry.time}-${entry.message}-${index}`}
            entry={entry}
            locale={locale}
            copy={copy}
          />
        ))}
      </div>
      {logs?.nextCursor ? (
        <Button size="sm" variant="outline" onClick={() => onNext(logs.nextCursor!)}>
          {copy.next}
        </Button>
      ) : null}
    </section>
  );
}

export function SourceSamplesPanel({
  locale,
  copy,
  samples,
  isLoading,
  isError,
  includeRaw,
  nextCursor,
  onRetry,
  onNext,
  onShowRaw,
  toolOpportunityId,
  capabilities,
  capabilitiesLoading,
  capabilitiesError,
  onCapabilitiesRetry,
  onToolOpportunityChange,
  onToolAction,
  toolPending,
  toolReceipt,
  toolError
}: {
  locale: AdminLocale;
  copy: SourceInspectorCopy;
  samples: AdminSourceOpportunitySample[];
  isLoading: boolean;
  isError: boolean;
  includeRaw: boolean;
  nextCursor?: string | null;
  onRetry: () => void;
  onNext: (cursor: string) => void;
  onShowRaw: () => void;
  toolOpportunityId?: string;
  capabilities?: AdminSourceToolCapabilitiesResponse;
  capabilitiesLoading: boolean;
  capabilitiesError?: string;
  onCapabilitiesRetry: () => void;
  onToolOpportunityChange: (opportunityId: string) => void;
  onToolAction: (action: SourceInspectorToolAction, opportunityId: string) => void;
  toolPending?: { action: SourceInspectorToolAction; opportunityId: string } | null;
  toolReceipt?: AdminSourceToolReceipt;
  toolError?: string;
}) {
  const firstSampleId = samples.map(opportunityId).find(Boolean) ?? "";
  const activeOpportunityId = toolOpportunityId || firstSampleId;
  const currentCapabilities = capabilities?.capabilities;
  const unavailableActions = currentCapabilities?.unavailableActions ?? [];
  return (
    <section className="min-w-0 space-y-4">
      <div className="rounded-lg border bg-card p-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{copy.tools}</h3>
            <p className="mt-1 text-muted-foreground">{copy.toolsDescription}</p>
          </div>
          <Button size="sm" variant="outline" onClick={onShowRaw} disabled={includeRaw}>
            <Eye className="size-4" aria-hidden />
            {copy.showRaw}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {includeRaw ? copy.rawIncluded : copy.rawUnavailable}
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="min-w-0 space-y-1">
            <span className="text-xs text-muted-foreground">{copy.selectSample}</span>
            <select
              className={`${selectClass} w-full min-w-0`}
              value={activeOpportunityId}
              onChange={(event) => onToolOpportunityChange(event.target.value)}
              disabled={!samples.length}
            >
              {!samples.length ? <option value="">—</option> : null}
              {samples.map((sample) => {
                const id = opportunityId(sample);
                return (
                  <option key={id} value={id}>
                    {sample.opportunity.title || id}
                  </option>
                );
              })}
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            {activeOpportunityId
              ? toolActions.map((action) => {
                  const capability = currentCapabilities?.actions[action];
                  if (!capability?.supported) return null;
                  const loading =
                    toolPending?.action === action &&
                    toolPending?.opportunityId === activeOpportunityId;
                  return (
                    <Button
                      key={action}
                      size="sm"
                      variant="outline"
                      loading={loading}
                      disabled={Boolean(toolPending) || capabilitiesLoading}
                      onClick={() => onToolAction(action, activeOpportunityId)}
                    >
                      <Wrench className="size-4" aria-hidden />
                      {localizedLabel(toolActionLabels, action, locale)}
                    </Button>
                  );
                })
              : null}
          </div>
        </div>
        {!activeOpportunityId ? (
          <p className="mt-3 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            {copy.noToolTarget}
          </p>
        ) : null}
        {capabilitiesLoading ? (
          <p role="status" className="mt-3 text-xs text-muted-foreground">
            {copy.capabilitiesLoading}
          </p>
        ) : null}
        {capabilitiesError ? (
          <div
            role="alert"
            className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <p>
              {copy.loadError} {capabilitiesError}
            </p>
            <Button className="mt-3" size="sm" variant="outline" onClick={onCapabilitiesRetry}>
              {copy.retry}
            </Button>
          </div>
        ) : null}
        {unavailableActions.length ? (
          <div className="mt-3 rounded-md border bg-background/70 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{copy.unavailableActions}</p>
            <ul className="mt-2 space-y-1">
              {unavailableActions.map((item) => (
                <li key={item.action}>
                  {localizedLabel(toolActionLabels, item.action, locale)} —{" "}
                  {localizedToolReason(locale, item.reason, item.reasonCode)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {toolReceipt?.status === "queued" ? (
          <p role="status" className="mt-3 rounded-md border bg-background p-3">
            {copy.toolQueued(localizedLabel(toolActionLabels, String(toolReceipt.action), locale))}
          </p>
        ) : null}
        {toolReceipt?.status === "unsupported" ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-muted-foreground"
          >
            {copy.toolUnsupported(
              localizedLabel(toolActionLabels, String(toolReceipt.action), locale),
              localizedToolReason(locale, toolReceipt.reason, toolReceipt.reasonCode)
            )}
          </p>
        ) : null}
        {toolError ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive"
          >
            {toolError}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">{copy.unsupportedTools}</p>
      </div>
      <PanelState
        isLoading={isLoading}
        isError={isError}
        empty={!samples.length}
        emptyLabel={copy.emptySamples}
        errorLabel={copy.loadError}
        retryLabel={copy.retry}
        loadingLabel={copy.loading}
        onRetry={onRetry}
      />
      <div className="grid min-w-0 gap-3 xl:grid-cols-2">
        {samples.map((sample) => (
          <SampleCard
            key={opportunityId(sample)}
            sample={sample}
            locale={locale}
            copy={copy}
            includeRaw={includeRaw}
            onUseTools={onToolOpportunityChange}
            onToolAction={onToolAction}
            toolPending={toolPending}
          />
        ))}
      </div>
      {nextCursor ? (
        <Button size="sm" variant="outline" onClick={() => onNext(nextCursor)}>
          {copy.next}
        </Button>
      ) : null}
    </section>
  );
}

function SampleCard({
  sample,
  locale,
  copy,
  includeRaw,
  onUseTools,
  onToolAction,
  toolPending
}: {
  sample: AdminSourceOpportunitySample;
  locale: AdminLocale;
  copy: SourceInspectorCopy;
  includeRaw: boolean;
  onUseTools: (opportunityId: string) => void;
  onToolAction: (action: SourceInspectorToolAction, opportunityId: string) => void;
  toolPending?: { action: SourceInspectorToolAction; opportunityId: string } | null;
}) {
  const id = opportunityId(sample);
  const reindexing = toolPending?.action === "reindex" && toolPending?.opportunityId === id;
  return (
    <article className="min-w-0 rounded-lg border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-semibold">{sample.opportunity.title}</h3>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            {sample.occurrence.externalId ?? id}
          </p>
        </div>
        {sample.opportunity.type ? (
          <Badge intent="neutral">
            {localizedLabel(sampleTypeLabels, sample.opportunity.type, locale)}
          </Badge>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {copy.updated}:{" "}
        {dateLabel(sample.occurrence.lastSeenAt ?? sample.opportunity.lastSeenAt, locale)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {id ? (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/opportunities/${encodeURIComponent(id)}`}>
              {copy.openOpportunity}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled>
            {copy.openOpportunity}
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={!id} onClick={() => onUseTools(id)}>
          <Wrench className="size-4" aria-hidden />
          {copy.useInTools}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!id || Boolean(toolPending)}
          loading={reindexing}
          onClick={() => onToolAction("reindex", id)}
        >
          <DatabaseZap className="size-4" aria-hidden />
          {copy.reindex}
        </Button>
        {sample.occurrence.url ? (
          <Button size="sm" variant="ghost" asChild>
            <a href={sample.occurrence.url} target="_blank" rel="noreferrer">
              URL
            </a>
          </Button>
        ) : null}
      </div>
      {includeRaw ? (
        <details className="mt-3 min-w-0 rounded-md border p-3">
          <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {copy.rawPayload}
          </summary>
          <pre className="mt-3 max-h-[32rem] overflow-auto rounded bg-muted p-3 text-xs">
            {safeJson(sample.occurrence.rawPayload ?? {})}
          </pre>
        </details>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          {sample.occurrence.hasRawPayload ? copy.rawUnavailable : "—"}
        </p>
      )}
      {includeRaw && sample.occurrence.sourceMetadata ? (
        <details className="mt-3 min-w-0 rounded-md border p-3">
          <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {copy.metadata}
          </summary>
          <pre className="mt-3 max-h-[24rem] overflow-auto rounded bg-muted p-3 text-xs">
            {safeJson(sample.occurrence.sourceMetadata)}
          </pre>
        </details>
      ) : null}
      {includeRaw && sample.occurrence.normalizedSnapshot ? (
        <details className="mt-3 min-w-0 rounded-md border p-3">
          <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Normalized
          </summary>
          <pre className="mt-3 max-h-[24rem] overflow-auto rounded bg-muted p-3 text-xs">
            {safeJson(sample.occurrence.normalizedSnapshot)}
          </pre>
        </details>
      ) : null}
    </article>
  );
}

function LogStatus({
  logs,
  copy,
  locale
}: {
  logs: AdminSourceLogsBlock;
  copy: SourceInspectorCopy;
  locale: AdminLocale;
}) {
  return (
    <dl className="grid gap-2 rounded-lg border bg-card p-4 text-xs sm:grid-cols-3">
      <Metric label={copy.logStatus} value={localizedLabel(healthLabels, logs.status, locale)} />
      <Metric label={copy.checkedAt} value={dateLabel(logs.checkedAt, locale)} />
      <Metric
        label={copy.retention}
        value={`${logs.retentionDays} ${locale === "en" ? "days" : "дн."}`}
      />
    </dl>
  );
}

function LogCard({
  entry,
  locale,
  copy
}: {
  entry: AdminSourceLogEntry;
  locale: AdminLocale;
  copy: SourceInspectorCopy;
}) {
  return (
    <article className="min-w-0 rounded-lg border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-medium">{entry.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.time}: {dateLabel(entry.time, locale)}
          </p>
        </div>
        <Badge
          intent={
            entry.level === "error" || entry.level === "fatal"
              ? "danger"
              : entry.level === "warn"
                ? "warning"
                : "neutral"
          }
        >
          {entry.level}
        </Badge>
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <Metric label={copy.runId} value={entry.runId ?? "—"} />
        <Metric label="Request ID" value={entry.requestId ?? "—"} />
        <Metric label="Job ID" value={entry.jobId ?? "—"} />
      </dl>
      {entry.fields ? (
        <details className="mt-3 min-w-0 rounded-md border p-3">
          <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {copy.fields}
          </summary>
          <pre className="mt-3 max-h-[24rem] overflow-auto rounded bg-muted p-3 text-xs">
            {safeJson(entry.fields)}
          </pre>
        </details>
      ) : null}
    </article>
  );
}

function PanelState({
  isLoading,
  isError,
  empty,
  emptyLabel,
  errorLabel,
  retryLabel,
  loadingLabel,
  onRetry
}: {
  isLoading: boolean;
  isError: boolean;
  empty: boolean;
  emptyLabel: string;
  errorLabel: string;
  retryLabel: string;
  loadingLabel: string;
  onRetry: () => void;
}) {
  if (isLoading)
    return (
      <p role="status" className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        {loadingLabel}
      </p>
    );
  if (isError)
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
      >
        <p>{errorLabel}</p>
        <Button className="mt-3" size="sm" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      </div>
    );
  if (empty)
    return (
      <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  return null;
}

function opportunityId(sample: AdminSourceOpportunitySample) {
  return sample.opportunity.id ?? sample.opportunity._id ?? "";
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
}
