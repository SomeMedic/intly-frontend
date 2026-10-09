"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { AdminDeadLetterItem, AdminJobItem, AdminJobQueueCounts, AdminScheduledJobItem } from "@/types";
import { adminApi } from "../api/admin-api";
import { AdminFrame, AdminQueryState } from "./AdminShared";
import { AdminReportsScreen } from "./AdminReportsScreen";
import { dateLabel, jobStateLabels, localizedLabel, safeJson, totalQueueCount } from "./admin-format";
import type { AdminLocale, Localized } from "./admin-locale";
import { useAdminLocale } from "./admin-locale";

const selectClass = "h-[var(--control-height)] rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const jobStates = ["failed", "waiting", "active", "delayed", "completed"];
type RuntimeCopy = {
  jobsTitle: string;
  jobsDescription: string;
  queue: string;
  state: string;
  pause: string;
  resume: string;
  failed: string;
  active: string;
  waiting: string;
  scheduledTitle: string;
  scheduledDescription: string;
  scheduledEmpty: string;
  nextRun: string;
  concurrency: string;
  limit: string;
  jobDetail: string;
  payload: string;
  progress: string;
  retryBackoff: string;
  stackError: string;
  jobsTableTitle: string;
  job: string;
  attempts: string;
  entity: string;
  time: string;
  error: string;
  actions: string;
  created: string;
  started: string;
  finished: string;
  retry: string;
  jobsEmpty: string;
  dlqTitle: string;
  dlqDescription: string;
  dlqEmpty: string;
  reportsTitle: string;
  reportsDescription: string;
  search: string;
  searchPlaceholder: string;
  all: string;
  category: string;
  reportsShown: (count: number) => string;
  bulkResultNote: string;
  open: string;
  cancel: string;
  issue: string;
  opportunity: string;
  reporter: string;
  assignee: string;
  unassigned: string;
  bulkReason: string;
  bulkPlaceholder: string;
  resolve: string;
  dismiss: string;
  select: string;
  status: string;
  priority: string;
  noText: string;
  grouped: (count: number) => string;
  reportsEmpty: string;
  reportDetail: string;
  loading: string;
  adminNotes: string;
  saveTriage: string;
  resolution: string;
  resolutionPlaceholder: string;
  currentFields: string;
  sourceOccurrences: string;
  sourceLink: string;
  relatedReports: string;
  noRelatedReports: string;
};
const runtimeCopy: Localized<RuntimeCopy> = {
  ru: {
    jobsTitle: "Очереди и задания",
    jobsDescription: "Состояние BullMQ, список заданий, расписание, повторный запуск и безопасная отмена через реальные admin endpoints.",
    queue: "Очередь",
    state: "Состояние",
    pause: "Поставить на паузу",
    resume: "Возобновить",
    failed: "Ошибки",
    active: "В работе",
    waiting: "Ожидают",
    scheduledTitle: "Запланированные задания",
    scheduledDescription: "Повторяющиеся задания BullMQ и следующий запуск; интервалы источников управляются на странице источников.",
    scheduledEmpty: "В BullMQ нет зарегистрированных запланированных заданий.",
    nextRun: "Следующий запуск",
    concurrency: "Параллельность",
    limit: "Лимит",
    jobDetail: "Детали задания",
    payload: "Данные задания",
    progress: "Прогресс",
    retryBackoff: "Повтор и задержка",
    stackError: "Ошибка и стек",
    jobsTableTitle: "Задания",
    job: "Задание",
    attempts: "Попытки",
    entity: "Связанные данные",
    time: "Время",
    error: "Ошибка",
    actions: "Действия",
    created: "Создано",
    started: "Старт",
    finished: "Завершено",
    retry: "Повторить",
    jobsEmpty: "В выбранном состоянии заданий нет.",
    dlqTitle: "Неразобранные ошибки",
    dlqDescription: "Данные задания скрыты backend-ом; повтор и отклонение используют реальные endpoints.",
    dlqEmpty: "Очередь неразобранных ошибок пуста.",
    reportsTitle: "Обращения по возможностям",
    reportsDescription: "Очередь пользовательских обращений по возможностям. Журнал аудита хранится отдельно.",
    search: "Поиск",
    searchPlaceholder: "текст, автор, возможность",
    all: "Все",
    category: "Категория",
    reportsShown: (count) => `Показано обращений: ${count}.`,
    bulkResultNote: "Групповые действия возвращают результат по каждому обращению; данные возможности автоматически не меняются.",
    open: "Открыть",
    cancel: "Отменить",
    issue: "Обращение",
    opportunity: "Возможность",
    reporter: "Автор",
    assignee: "Ответственный",
    unassigned: "Не назначен",
    bulkReason: "Причина для группового решения",
    bulkPlaceholder: "Единая причина для выбранной группы",
    resolve: "Решить",
    dismiss: "Отклонить",
    select: "Выбор",
    status: "Статус",
    priority: "Приоритет",
    noText: "Без текста",
    grouped: (count) => `В группе обращений: ${count}`,
    reportsEmpty: "Обращения не найдены.",
    reportDetail: "Детали обращения",
    loading: "Загрузка…",
    adminNotes: "Заметки администратора",
    saveTriage: "Сохранить решение",
    resolution: "Решение",
    resolutionPlaceholder: "Причина решения или отклонения",
    currentFields: "Текущие нормализованные поля",
    sourceOccurrences: "Найденные источники",
    sourceLink: "Источник",
    relatedReports: "Похожие обращения",
    noRelatedReports: "Других обращений по этой возможности нет.",
  },
  en: {
    jobsTitle: "Queues and jobs",
    jobsDescription: "BullMQ state, job list, schedule, retry and safe cancellation through real admin endpoints.",
    queue: "Queue",
    state: "State",
    pause: "Pause",
    resume: "Resume",
    failed: "Failed",
    active: "Active",
    waiting: "Waiting",
    scheduledTitle: "Scheduled jobs",
    scheduledDescription: "Recurring BullMQ jobs and next run; source intervals are managed in Admin Sources.",
    scheduledEmpty: "No BullMQ scheduled jobs registered.",
    nextRun: "Next run",
    concurrency: "Concurrency",
    limit: "Limit",
    jobDetail: "Job detail",
    payload: "Payload metadata",
    progress: "Progress",
    retryBackoff: "Retry/backoff",
    stackError: "Stack/error",
    jobsTableTitle: "Jobs",
    job: "Job",
    attempts: "Attempts",
    entity: "Entity",
    time: "Time",
    error: "Error",
    actions: "Actions",
    created: "Created",
    started: "Started",
    finished: "Finished",
    retry: "Retry",
    jobsEmpty: "No jobs in the selected state.",
    dlqTitle: "Dead letter queue",
    dlqDescription: "Payload is redacted by the backend; retry and dismiss use real endpoints.",
    dlqEmpty: "Dead letter queue is empty.",
    reportsTitle: "Reports and issues",
    reportsDescription: "User report triage queue for opportunities. Audit events stay separate.",
    search: "Search",
    searchPlaceholder: "text, reporter, opportunity",
    all: "All",
    category: "Category",
    reportsShown: (count) => `Showing ${count} reports.`,
    bulkResultNote: "Bulk actions return one result per report; opportunity data is not changed automatically.",
    open: "Open",
    cancel: "Cancel",
    issue: "Issue",
    opportunity: "Opportunity",
    reporter: "Reporter",
    assignee: "Assignee",
    unassigned: "Unassigned",
    bulkReason: "Bulk triage reason",
    bulkPlaceholder: "Shared reason for the selected group",
    resolve: "Resolve",
    dismiss: "Dismiss",
    select: "Select",
    status: "Status",
    priority: "Priority",
    noText: "No text",
    grouped: (count) => `Reports in group: ${count}`,
    reportsEmpty: "No reports found.",
    reportDetail: "Report detail",
    loading: "Loading…",
    adminNotes: "Admin notes",
    saveTriage: "Save triage",
    resolution: "Resolution",
    resolutionPlaceholder: "Reason for resolving or dismissing",
    currentFields: "Current normalized fields",
    sourceOccurrences: "Source occurrences",
    sourceLink: "Source",
    relatedReports: "Related reports",
    noRelatedReports: "No other reports for this opportunity.",
  },
} as const;

export function AdminJsonScreen({ kind }: { kind: "jobs" | "issues" }) {
  if (kind === "jobs") return <AdminJobsScreen />;
  return <AdminReportsScreen />;
}

function AdminJobsScreen() {
  const locale = useAdminLocale();
  const text = runtimeCopy[locale];
  const queryClient = useQueryClient();
  const counts = useQuery({ queryKey: ["admin", "jobs", "counts"], queryFn: adminApi.jobs.counts });
  const dlq = useQuery({ queryKey: ["admin", "jobs", "dlq"], queryFn: adminApi.jobs.dlq });
  const scheduled = useQuery({ queryKey: ["admin", "jobs", "scheduled"], queryFn: adminApi.jobs.scheduled });
  const queues = counts.data ?? [];
  const [queue, setQueue] = useState("");
  const selectedQueue = queue || queues[0]?.name || "ingestion";
  const [state, setState] = useState("failed");
  const [selectedJob, setSelectedJob] = useState<{ queue: string; id: string } | null>(null);
  const jobs = useQuery({ queryKey: ["admin", "jobs", selectedQueue, state], queryFn: () => adminApi.jobs.list(selectedQueue, state), enabled: Boolean(selectedQueue) });
  const detail = useQuery({ queryKey: ["admin", "jobs", selectedJob?.queue, selectedJob?.id], queryFn: () => adminApi.jobs.detail(selectedJob!.queue, selectedJob!.id), enabled: Boolean(selectedJob) });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
  };
  const retry = useMutation({ mutationFn: ({ queue, id }: { queue: string; id: string }) => adminApi.jobs.retry(queue, id), onSuccess: invalidate });
  const cancel = useMutation({ mutationFn: ({ queue, id }: { queue: string; id: string }) => adminApi.jobs.cancel(queue, id), onSuccess: invalidate });
  const dismiss = useMutation({ mutationFn: ({ queue, id }: { queue: string; id: string }) => adminApi.jobs.dismiss(queue, id), onSuccess: invalidate });
  const pause = useMutation({ mutationFn: adminApi.jobs.pause, onSuccess: invalidate });
  const resume = useMutation({ mutationFn: adminApi.jobs.resume, onSuccess: invalidate });
  const loading = counts.isLoading || dlq.isLoading || scheduled.isLoading || jobs.isLoading;
  const error = counts.isError || dlq.isError || scheduled.isError || jobs.isError;
  return <AdminFrame title={text.jobsTitle} description={text.jobsDescription}><AdminQueryState isLoading={loading} isError={error} onRetry={() => { counts.refetch(); dlq.refetch(); scheduled.refetch(); jobs.refetch(); }}><section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{queues.map((item) => <QueueCard key={item.name} item={item} active={item.name === selectedQueue} text={text} onClick={() => setQueue(item.name)} />)}</section><section className="mt-4 rounded-lg border bg-card p-3"><div className="flex flex-wrap items-end gap-3"><label className="space-y-1 text-sm"><span className="font-medium">{text.queue}</span><select className={`${selectClass} min-w-0 sm:min-w-48`} value={selectedQueue} onChange={(event) => setQueue(event.target.value)}>{queues.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label><label className="space-y-1 text-sm"><span className="font-medium">{text.state}</span><select className={`${selectClass} min-w-0 sm:min-w-40`} value={state} onChange={(event) => setState(event.target.value)}>{jobStates.map((item) => <option key={item} value={item}>{localizedLabel(jobStateLabels, item, locale)}</option>)}</select></label><Button variant="outline" onClick={() => pause.mutate(selectedQueue)} loading={pause.isPending}><Pause className="size-4" />{text.pause}</Button><Button variant="outline" onClick={() => resume.mutate(selectedQueue)} loading={resume.isPending}><Play className="size-4" />{text.resume}</Button></div></section><ScheduledJobs items={scheduled.data?.items ?? []} text={text} locale={locale} /><JobsTable jobs={jobs.data?.items ?? []} queue={selectedQueue} text={text} locale={locale} retry={(id) => retry.mutate({ queue: selectedQueue, id })} cancel={(id) => cancel.mutate({ queue: selectedQueue, id })} open={(id) => setSelectedJob({ queue: selectedQueue, id })} busy={retry.isPending || cancel.isPending} /><DlqTable items={dlq.data?.items ?? []} text={text} locale={locale} retry={(item) => retry.mutate({ queue: item.queue, id: item.jobId })} dismiss={(item) => dismiss.mutate({ queue: item.queue, id: item.jobId })} busy={retry.isPending || dismiss.isPending} />{selectedJob ? <JobDetailModal job={detail.data} text={text} loading={detail.isLoading} error={detail.isError ? detail.error.message : null} onClose={() => setSelectedJob(null)} /> : null}</AdminQueryState></AdminFrame>;
}

function QueueCard({ item, active, text, onClick }: { item: AdminJobQueueCounts; active: boolean; text?: RuntimeCopy; onClick: () => void }) {
  const failed = item.counts.failed ?? 0;
  const waiting = item.counts.waiting ?? 0;
  const activeCount = item.counts.active ?? 0;
  return <button type="button" onClick={onClick} className={`min-w-0 rounded-lg border bg-card p-3 text-left transition hover:border-primary/45 ${active ? "border-primary" : ""}`}><div className="flex items-center justify-between gap-2"><h2 className="min-w-0 truncate font-semibold">{item.name}</h2><Badge intent={failed ? "danger" : activeCount ? "primary" : "neutral"}>{totalQueueCount(item.counts)}</Badge></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground"><span>{text?.failed ?? "Failed"} {failed}</span><span>{text?.active ?? "Active"} {activeCount}</span><span>{text?.waiting ?? "Waiting"} {waiting}</span></div><p className="mt-2 text-xs text-muted-foreground">{text?.concurrency ?? "Concurrency"} {item.concurrency ?? "—"} · {text?.limit ?? "Limit"} {item.rateLimit ? `${item.rateLimit.max}/${item.rateLimit.durationMs}ms` : "—"}</p>{item.error ? <p className="mt-2 text-xs text-destructive">{item.error}</p> : null}</button>;
}

function ScheduledJobs({ items, text, locale }: { items: AdminScheduledJobItem[]; text: RuntimeCopy; locale: AdminLocale }) {
  return <section className="mt-4 overflow-hidden rounded-lg border bg-card"><div className="border-b p-3"><h2 className="font-semibold">{text.scheduledTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{text.scheduledDescription}</p></div><div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={`${item.queue}:${item.id}`} className="min-w-0 rounded-md border bg-background/60 p-3 text-sm"><div className="flex items-center justify-between gap-2"><p className="min-w-0 truncate font-medium">{item.name}</p><Badge intent="neutral">{item.queue}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{text.nextRun}: {dateLabel(item.nextRunAt, locale)}</p><p className="mt-1 break-all text-xs text-muted-foreground">{String(item.pattern ?? "—")}</p></article>)}{!items.length ? <p className="p-3 text-sm text-muted-foreground">{text.scheduledEmpty}</p> : null}</div></section>;
}

function JobsTable({ jobs, queue, text, locale, retry, cancel, open, busy }: { jobs: AdminJobItem[]; queue: string; text: RuntimeCopy; locale: AdminLocale; retry: (id: string) => void; cancel: (id: string) => void; open: (id: string) => void; busy: boolean }) {
  return <section className="mt-4 overflow-hidden rounded-lg border bg-card"><div className="border-b p-3"><h2 className="font-semibold">{text.jobsTableTitle}: {queue}</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[64rem] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2">{text.job}</th><th className="px-3 py-2">{text.state}</th><th className="px-3 py-2">{text.attempts}</th><th className="px-3 py-2">{text.entity}</th><th className="px-3 py-2">{text.time}</th><th className="px-3 py-2">{text.error}</th><th className="px-3 py-2 text-right">{text.actions}</th></tr></thead><tbody>{jobs.map((job) => { const id = String(job.id ?? ""); return <tr key={id} className="border-b last:border-0"><td className="px-3 py-3 align-top"><p className="font-medium">{job.name ?? text.job}</p><p className="text-xs text-muted-foreground">{id}</p></td><td className="px-3 py-3 align-top"><Badge intent={job.state === "failed" ? "danger" : job.state === "active" ? "primary" : "neutral"}>{localizedLabel(jobStateLabels, job.state, locale)}</Badge></td><td className="px-3 py-3 align-top">{job.attempts ?? 0}/{job.maxAttempts ?? "—"}</td><td className="px-3 py-3 align-top"><pre className="max-w-xs overflow-auto rounded bg-muted p-2 text-xs">{safeJson(job.entity ?? {})}</pre></td><td className="px-3 py-3 align-top text-xs text-muted-foreground"><p>{text.created}: {dateLabel(job.createdAt, locale)}</p><p>{text.started}: {dateLabel(job.startedAt, locale)}</p><p>{text.finished}: {dateLabel(job.finishedAt, locale)}</p></td><td className="max-w-sm px-3 py-3 align-top text-xs text-destructive">{job.failedReason}</td><td className="px-3 py-3 align-top text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => open(id)}>{text.open}</Button>{job.canCancel ? <Button size="sm" variant="outline" loading={busy} onClick={() => cancel(id)}>{text.cancel}</Button> : null}{job.canRetry ? <Button size="sm" variant="outline" loading={busy} onClick={() => retry(id)}><RotateCcw className="size-4" />{text.retry}</Button> : null}</div></td></tr>; })}{!jobs.length ? <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{text.jobsEmpty}</td></tr> : null}</tbody></table></div></section>;
}

function JobDetailModal({ job, text, loading, error, onClose }: { job?: AdminJobItem; text: RuntimeCopy; loading: boolean; error: string | null; onClose: () => void }) {
  return <Modal open onOpenChange={(open) => !open && onClose()} title={text.jobDetail} description={job?.id ? String(job.id) : undefined} placement="drawer">{loading ? <p className="text-sm text-muted-foreground">{text.loading}</p> : error ? <p className="text-sm text-destructive">{error}</p> : job ? <div className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><JsonBlock title={text.payload} value={job.data} /><JsonBlock title={text.progress} value={job.progress} /><JsonBlock title={text.retryBackoff} value={job.retryBackoff} /><JsonBlock title={text.stackError} value={{ failedReason: job.failedReason, stacktrace: job.stacktrace }} /></div><p className="text-xs text-muted-foreground">Correlation: {job.logsCorrelationId ?? "—"}</p></div> : null}</Modal>;
}

function DlqTable({ items, text, locale, retry, dismiss, busy }: { items: AdminDeadLetterItem[]; text: RuntimeCopy; locale: AdminLocale; retry: (item: AdminDeadLetterItem) => void; dismiss: (item: AdminDeadLetterItem) => void; busy: boolean }) {
  return <section className="mt-4 overflow-hidden rounded-lg border bg-card"><div className="border-b p-3"><h2 className="font-semibold">{text.dlqTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{text.dlqDescription}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[56rem] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2">{text.job}</th><th className="px-3 py-2">{text.queue}</th><th className="px-3 py-2">{text.attempts}</th><th className="px-3 py-2">{text.created}</th><th className="px-3 py-2">{text.error}</th><th className="px-3 py-2 text-right">{text.actions}</th></tr></thead><tbody>{items.map((item) => <tr key={`${item.queue}:${item.jobId}`} className="border-b last:border-0"><td className="px-3 py-3 align-top"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.jobId}</p></td><td className="px-3 py-3 align-top">{item.queue}</td><td className="px-3 py-3 align-top">{item.attempts ?? 0}</td><td className="px-3 py-3 align-top text-xs text-muted-foreground">{dateLabel(item.createdAt, locale)}</td><td className="max-w-md px-3 py-3 align-top text-xs text-destructive">{item.error}</td><td className="px-3 py-3 align-top"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" loading={busy} onClick={() => retry(item)}><RotateCcw className="size-4" />{text.retry}</Button><Button size="sm" variant="outline" loading={busy} onClick={() => dismiss(item)}><Trash2 className="size-4" />{text.dismiss}</Button></div></td></tr>)}{!items.length ? <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">{text.dlqEmpty}</td></tr> : null}</tbody></table></div></section>;
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return <div className="rounded-lg border bg-background/60 p-4"><h3 className="font-semibold">{title}</h3><pre className="mt-3 max-h-72 overflow-auto rounded bg-muted p-3 text-xs">{safeJson(value ?? {})}</pre></div>;
}
