"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, Archive, ArrowRight, FileText, RefreshCw, Search, Server, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/intly/loading";
import type { AdminBackupSummary, AdminInfrastructureService, AdminInfrastructureSummary, AdminJobItem, AdminLogEntry, AdminLogFilters, AdminSearchMaintenance } from "@/types";
import { adminApi } from "../api/admin-api";
import { AdminFrame } from "./AdminShared";
import { dateLabel, safeJson } from "./admin-format";
import { useAdminLocale, type AdminLocale } from "./admin-locale";
import { durationLabel, infrastructureState, progressPercentage, progressRecord, rebuildStageLabel, storageLabel } from "./infrastructure-format";

type Translate = (ru: string, en: string) => string;
const panel = "min-w-0 rounded-xl border bg-card p-[var(--card-padding)]";
const selectClass = "h-[var(--control-height)] w-full min-w-0 rounded-md border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function AdminInfrastructureScreen() {
  const locale = useAdminLocale();
  const t: Translate = (ru, en) => locale === "ru" ? ru : en;
  const { bootstrapped, user } = useAuth();
  const enabled = bootstrapped && user?.role === "Admin";
  const params = useSearchParams();
  const tab = ["search", "backups", "logs"].includes(params.get("tab") ?? "") ? params.get("tab") : "overview";
  const health = useQuery({ queryKey: ["admin", "infrastructure"], queryFn: adminApi.infrastructure, enabled, refetchInterval: 30_000 });
  const maintenance = useQuery({ queryKey: ["admin", "search", "maintenance"], queryFn: adminApi.searchMaintenance, enabled, refetchInterval: query => query.state.data?.active ? 3000 : 30_000 });
  const backups = useQuery({ queryKey: ["admin", "backups"], queryFn: adminApi.backups, enabled, refetchInterval: 30_000 });
  const tabs = [
    { id: "overview", label: t("Сервисы", "Services"), icon: Server },
    { id: "search", label: t("Индексы поиска", "Search indexes"), icon: Search },
    { id: "backups", label: t("Резервные копии", "Backups"), icon: Archive },
    { id: "logs", label: t("Логи", "Logs"), icon: FileText },
  ];

  return <AdminFrame title={t("Инфраструктура", "Infrastructure")} description={t("Сервисы, обслуживание поиска и история операций.", "Services, search maintenance and operation history.")}>
    <nav aria-label={t("Разделы инфраструктуры", "Infrastructure sections")} className="mb-5 grid grid-cols-2 gap-2 rounded-xl border bg-card p-2 sm:flex sm:flex-wrap">
      {tabs.map(item => <Link key={item.id} href={`/admin/infrastructure${item.id === "overview" ? "" : `?tab=${item.id}`}`} aria-current={tab === item.id ? "page" : undefined} className={`flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-1 ${tab === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><item.icon className="size-4 shrink-0" aria-hidden /><span>{item.label}</span></Link>)}
    </nav>
    {tab === "overview" ? <QueryBlock query={health} t={t}>
      {health.data ? <Overview summary={health.data} maintenance={maintenance.data} backups={backups.data} locale={locale} t={t} /> : null}
    </QueryBlock> : null}
    {tab === "search" ? <SearchMaintenance enabled={enabled} maintenance={maintenance} locale={locale} t={t} /> : null}
    {tab === "backups" ? <QueryBlock query={backups} t={t}>{backups.data ? <Backups summary={backups.data} locale={locale} t={t} /> : null}</QueryBlock> : null}
    {tab === "logs" ? <Logs enabled={enabled} locale={locale} t={t} /> : null}
  </AdminFrame>;
}

function QueryBlock({ query, t, children }: { query: { isLoading: boolean; isError: boolean; error: Error | null; refetch: () => unknown }; t: Translate; children: ReactNode }) {
  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.isError) return <section role="alert" className={`${panel} border-destructive/30`}><AlertTriangle className="mb-2 size-5 text-destructive" aria-hidden /><h2 className="font-semibold">{t("Не удалось загрузить раздел", "Could not load section")}</h2><p className="mt-2 break-words text-sm text-muted-foreground">{query.error?.message}</p><Button variant="outline" className="mt-4" onClick={() => query.refetch()}>{t("Повторить", "Retry")}</Button></section>;
  return <>{children}</>;
}

function StateBadge({ state, locale }: { state?: string; locale: AdminLocale }) {
  const danger = ["unavailable", "failed", "Failed", "issue"].includes(state ?? "");
  const success = ["healthy", "operational", "Succeeded", "completed", "available"].includes(state ?? "");
  return <Badge intent={danger ? "danger" : success ? "success" : ["degraded", "unconfigured"].includes(state ?? "") ? "warning" : "neutral"}>{infrastructureState(state, locale)}</Badge>;
}

function Overview({ summary, maintenance, backups, locale, t }: { summary: AdminInfrastructureSummary; maintenance?: AdminSearchMaintenance; backups?: AdminBackupSummary; locale: AdminLocale; t: Translate }) {
  const incidents = (summary.services ?? []).filter(service => service.healthy === false);
  const backend = summary.services?.find(service => service.id === "backend");
  const backupFailed = backups?.items[0]?.status === "Failed";
  const searchFailed = maintenance?.latest?.state === "failed";
  return <div className="space-y-5">
    <section className={`${panel} flex flex-wrap items-center justify-between gap-5`}>
      <div className="flex min-w-0 items-start gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Activity className="size-6" aria-hidden /></span><div><h2 className="text-lg font-semibold">{infrastructureState(summary.status, locale)}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Проверено", "Checked")}: {dateLabel(summary.checkedAt, locale)}</p><p className="mt-2 text-sm text-muted-foreground">{t("Автообновление каждые 30 секунд", "Refreshes every 30 seconds")}</p></div></div>
      <div className="flex flex-wrap gap-5"><Metric label={t("Версия backend", "Backend version")} value={backend?.details?.version} /><Metric label={t("Время работы", "Uptime")} value={typeof backend?.details?.uptimeSeconds === "number" ? durationLabel(backend.details.uptimeSeconds * 1000, locale) : undefined} /><StateBadge state={summary.status} locale={locale} /></div>
    </section>
    {incidents.length || backupFailed || searchFailed ? <section aria-label={t("Проблемы инфраструктуры", "Infrastructure alerts")} className="space-y-2">{incidents.map(service => <AlertLink key={service.id} href="/admin/infrastructure" text={`${service.label}: ${infrastructureState(service.state, locale)}`} />)}{searchFailed ? <AlertLink href="/admin/infrastructure?tab=search" text={t("Последняя пересборка поиска завершилась ошибкой", "The last search rebuild failed")} /> : null}{backupFailed ? <AlertLink href="/admin/infrastructure?tab=backups" text={t("Последняя резервная копия завершилась ошибкой", "The last backup failed")} /> : null}</section> : null}
    <section aria-label={t("Состояние сервисов", "Service health")} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{summary.services?.map(service => <ServiceCard key={service.id} service={service} locale={locale} t={t} />)}</section>
    <section className={panel}><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{t("Фоновые очереди", "Background queues")}</h2><Button size="sm" variant="outline" asChild><Link href="/admin/jobs">{t("Открыть задания", "View jobs")}<ArrowRight className="size-4" aria-hidden /></Link></Button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{summary.queues?.map(queue => <Link key={queue.name} href="/admin/jobs" className="min-w-0 rounded-lg border bg-background/50 p-3 transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex justify-between gap-2"><span className="font-medium">{queue.name}</span>{queue.counts.failed ? <Badge intent="danger">{queue.counts.failed}</Badge> : null}</div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{t("В работе", "Active")}: {queue.counts.active ?? "—"}</span><span>{t("Ожидают", "Waiting")}: {queue.counts.waiting ?? "—"}</span><span>{t("Ошибки", "Failed")}: {queue.counts.failed ?? "—"}</span></div>{queue.error ? <p className="mt-2 break-words text-xs text-destructive">{queue.error}</p> : null}</Link>)}</div></section>
  </div>;
}

function AlertLink({ href, text }: { href: string; text: string }) {
  return <Link href={href} className="flex items-center gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden /><span className="min-w-0 flex-1 break-words">{text}</span><ArrowRight className="size-4 shrink-0" aria-hidden /></Link>;
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return <dl className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-semibold tabular-nums">{typeof value === "string" || typeof value === "number" ? String(value) : "—"}</dd></dl>;
}

function ServiceCard({ service, locale, t }: { service: AdminInfrastructureService; locale: AdminLocale; t: Translate }) {
  const details = service.details;
  const storage = service.id === "mongo" ? details?.storageBytes : service.id === "redis" ? details?.memoryBytes : undefined;
  return <article className={panel}><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{service.label}</h3><StateBadge state={service.state} locale={locale} /></div><p className="mt-3 break-words text-sm text-muted-foreground">{service.message ?? t("Сведения пока недоступны", "Details are not available yet")}</p><div className="mt-4 flex flex-wrap gap-4">{service.latencyMs !== undefined ? <Metric label={t("Ответ", "Response")} value={`${service.latencyMs} ${t("мс", "ms")}`} /> : null}{service.id === "backend" ? <Metric label="Node.js" value={details?.node} /> : null}{service.id === "mongo" || service.id === "redis" ? <><Metric label={t("Объём", "Storage")} value={storageLabel(storage, locale)} /><Metric label={t("Соединения", "Connections")} value={details?.connections} /></> : null}{service.id === "minio" ? <><Metric label={t("Учтённые файлы", "Registered files")} value={details?.registeredFileCount} /><Metric label={t("Объём файлов", "File size")} value={storageLabel(details?.registeredBytes, locale)} /><Metric label={t("Ошибки загрузки за 30 дней", "Upload errors in 30 days")} value={details?.failedUploads30Days} /></> : null}</div>{service.details && service.id !== "backend" ? <details className="mt-3 text-xs"><summary className="cursor-pointer text-muted-foreground">{t("Подробности", "Details")}</summary><pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2">{safeJson(service.details)}</pre></details> : null}</article>;
}

function SearchMaintenance({ enabled, maintenance, locale, t }: { enabled: boolean; maintenance: { data?: AdminSearchMaintenance; isLoading: boolean; isError: boolean; error: Error | null; refetch: () => unknown }; locale: AdminLocale; t: Translate }) {
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const indexes = useQuery({ queryKey: ["admin", "search", "indexes"], queryFn: adminApi.searchIndexes, enabled, refetchInterval: maintenance.data?.active ? 5000 : 30_000 });
  const rebuild = useMutation({ mutationFn: adminApi.rebuildSearch, onSuccess: () => { setConfirm(false); toast.success(t("Пересборка поставлена в очередь", "Rebuild queued")); void client.invalidateQueries({ queryKey: ["admin", "search"] }); } });
  const job = maintenance.data?.active ?? maintenance.data?.latest;
  return <div className="space-y-5">
    <section className={`${panel} flex flex-wrap items-start justify-between gap-4`}><div className="max-w-2xl"><h2 className="font-semibold">{t("Обслуживание поиска", "Search maintenance")}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("Новые индексы собираются в фоне. Текущий поиск продолжает работать до переключения на готовую версию.", "New indexes build in the background. Current search stays available until the ready version takes over.")}</p></div><Button onClick={() => { rebuild.reset(); setConfirm(true); }} disabled={!enabled || Boolean(maintenance.data?.active) || maintenance.isLoading || maintenance.isError || maintenance.data?.status !== "configured"}><RefreshCw className="size-4" aria-hidden />{t("Пересобрать индексы", "Rebuild indexes")}</Button></section>
    <QueryBlock query={maintenance} t={t}><section className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{t("Последняя операция", "Latest operation")}</h2><StateBadge state={maintenance.data?.status} locale={locale} /></div><div className="mt-4 flex flex-wrap gap-6"><Metric label={t("Заданий в очереди", "Queue backlog")} value={maintenance.data?.backlog} /><Metric label={t("Проверено", "Checked")} value={dateLabel(maintenance.data?.checkedAt, locale)} /></div>{job ? <RebuildJob job={job} checkedAt={maintenance.data?.checkedAt} locale={locale} t={t} /> : <p className="mt-4 text-sm text-muted-foreground">{t("Пересборка ещё не запускалась.", "No rebuild has run yet.")}</p>}{maintenance.data?.lastError ? <p role="alert" className="mt-3 break-words text-sm text-destructive">{maintenance.data.lastError}</p> : null}</section></QueryBlock>
    <QueryBlock query={indexes} t={t}><section className={panel}><h2 className="mb-4 font-semibold">{t("Рабочие индексы", "Live indexes")}</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{indexes.data?.items.map(index => <article key={index.name} className="min-w-0 rounded-lg border bg-background/50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-all font-medium">{index.name}</h3><StateBadge state={!index.available ? "unavailable" : index.raw?.isIndexing ? "active" : "healthy"} locale={locale} /></div><div className="mt-4"><Metric label={t("Документы", "Documents")} value={index.raw?.numberOfDocuments?.toLocaleString(locale)} /></div>{index.error ? <p className="mt-2 break-words text-xs text-destructive">{index.error}</p> : null}</article>)}</div></section></QueryBlock>
    <Modal open={confirm} onOpenChange={open => { if (!rebuild.isPending) setConfirm(open); }} title={t("Пересобрать все индексы?", "Rebuild all indexes?")} description={t("Вакансии, задачи, профили, списки наблюдения и база знаний будут заново проиндексированы. Операция выполняется в фоне и может занять несколько минут.", "Opportunities, tasks, profiles, watchlists and knowledge will be indexed again. This background operation may take several minutes.")}>
      <div className="rounded-lg border bg-muted/50 p-3 text-sm"><ShieldCheck className="mb-2 size-5 text-primary" aria-hidden />{t("Текущие индексы заменяются только после успешной подготовки новых.", "Current indexes are replaced only after the new ones are ready.")}</div>{rebuild.isError ? <p role="alert" className="mt-3 break-words text-sm text-destructive">{rebuild.error.message}</p> : null}<div className="mt-5 flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={rebuild.isPending} onClick={() => setConfirm(false)}>{t("Отмена", "Cancel")}</Button><Button loading={rebuild.isPending} onClick={() => rebuild.mutate()}>{t("Запустить пересборку", "Start rebuild")}</Button></div>
    </Modal>
  </div>;
}

function RebuildJob({ job, checkedAt, locale, t }: { job: AdminJobItem; checkedAt?: string; locale: AdminLocale; t: Translate }) {
  const progress = progressRecord(job.progress);
  const percent = progressPercentage(job.progress);
  return <div aria-live="polite" className="mt-5 rounded-lg border bg-background/50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="min-w-0 flex-1 font-medium">{t("Пересборка", "Rebuild")} <span className="mt-1 block break-all font-mono text-xs text-muted-foreground">#{job.id}</span></p><StateBadge state={job.state} locale={locale} /></div><p className="mt-3 text-sm text-muted-foreground">{rebuildStageLabel(progress.stage, locale)}{typeof progress.index === "string" ? ` · ${progress.index}` : ""}</p>{typeof progress.processed === "number" ? <p className="mt-2 text-sm tabular-nums">{progress.processed.toLocaleString(locale)}{typeof progress.total === "number" ? ` / ${progress.total.toLocaleString(locale)}` : ""} {t("документов", "documents")}</p> : null}{percent !== undefined ? <div className="mt-4"><div className="mb-2 text-right text-xs text-muted-foreground">{progress.index ? `${t("Текущий индекс", "Current index")}: ` : ""}{Math.floor(percent)}%</div><div role="progressbar" aria-label={t("Прогресс пересборки", "Rebuild progress")} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-muted"><div style={{ width: `${percent}%` }} className="h-full rounded-full bg-primary transition-all" /></div></div> : null}<div className="mt-4 grid gap-4 sm:grid-cols-3"><Metric label={t("Создано", "Created")} value={dateLabel(job.createdAt, locale)} /><Metric label={t("Начато", "Started")} value={dateLabel(job.startedAt ?? undefined, locale)} /><Metric label={t("Длительность", "Duration")} value={durationLabel(job.state === "active" && job.startedAt && checkedAt ? Date.parse(checkedAt) - Date.parse(job.startedAt) : job.durationMs, locale)} /></div>{Object.keys(progress).length ? <details className="mt-4 text-xs"><summary className="cursor-pointer text-muted-foreground">{t("Подробный прогресс", "Detailed progress")}</summary><pre className="mt-2 max-h-72 overflow-auto rounded bg-muted p-3">{safeJson(progress)}</pre></details> : null}{job.failedReason ? <p role={job.state === "failed" ? "alert" : undefined} className={`mt-3 break-words text-sm ${job.state === "failed" ? "text-destructive" : "text-muted-foreground"}`}>{job.state !== "failed" ? `${t("Предыдущая попытка", "Previous attempt")}: ` : ""}{job.failedReason}</p> : null}</div>;
}

function Backups({ summary, locale, t }: { summary: AdminBackupSummary; locale: AdminLocale; t: Translate }) {
  return <div className="space-y-5"><section className={panel}><div className="flex items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="font-semibold">{t("Резервное копирование", "Backup history")}</h2><StateBadge state={summary.status} locale={locale} /></div><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("История формируется при запуске резервного копирования Restic на сервере.", "History is recorded when the server runs a Restic backup.")}</p></div><Image src="/brand/knowledge-library.png" alt="" width={144} height={144} className="size-24 shrink-0 object-contain sm:size-32" /></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><Metric label={t("Хранилище", "Repository")} value={summary.repositoryLabel} /><Metric label={t("Расписание cron", "Cron schedule")} value={summary.schedule} /><Metric label={t("Проверено", "Checked")} value={dateLabel(summary.checkedAt, locale)} /></div></section>
    {summary.status === "unconfigured" ? <EmptyNotice icon={<Archive className="size-6" aria-hidden />} title={t("История копий ещё не подключена", "Backup history is not connected yet")} text={t("Укажите серверную директорию отчётов и настройте расписание резервного копирования. После первого запуска здесь появится его результат.", "Configure the server receipt directory and backup schedule. The first run will appear here when it starts.")} /> : summary.status === "unavailable" ? <EmptyNotice icon={<AlertTriangle className="size-6" aria-hidden />} title={t("История недоступна", "History unavailable")} text={t("Не удалось прочитать серверные отчёты резервного копирования.", "Server backup receipts could not be read.")} /> : !summary.items.length ? <EmptyNotice icon={<Archive className="size-6" aria-hidden />} title={t("Запусков пока нет", "No runs yet")} text={t("Директория отчётов подключена. История появится после первого запуска резервного копирования.", "The receipt directory is connected. History will appear after the first backup starts.")} /> : <section className="space-y-3" aria-label={t("Запуски резервного копирования", "Backup runs")}>{summary.items.map(run => <article key={run.id} className={panel}><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{dateLabel(run.startedAt, locale)}</h3><StateBadge state={run.status} locale={locale} /></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><Metric label={t("Завершено", "Finished")} value={dateLabel(run.finishedAt, locale)} /><Metric label={t("Длительность", "Duration")} value={durationLabel(run.durationMs, locale)} /><Metric label={t("Снимков в хранилище", "Repository snapshots")} value={run.snapshotCount} /></div>{run.snapshotId ? <p className="mt-3 break-all font-mono text-xs text-muted-foreground">{t("Снимок", "Snapshot")}: {run.snapshotId}</p> : null}{run.error ? <p role="alert" className="mt-3 break-words text-sm text-destructive">{run.error}</p> : null}</article>)}</section>}
    <section className={`${panel} text-sm`}><h2 className="font-semibold">{t("Восстановление", "Restoring data")}</h2><p className="mt-2 leading-relaxed text-muted-foreground">{t("Восстановление выполняется на сервере по инструкции резервного копирования: выбрать снимок, остановить запись, восстановить MongoDB и файлы MinIO, затем проверить данные и поиск.", "Restore on the server using the backup runbook: choose a snapshot, stop writes, restore MongoDB and MinIO files, then verify data and search.")}</p></section>
  </div>;
}

function EmptyNotice({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <section className={`${panel} flex flex-col items-center py-10 text-center`}><span className="mb-4 rounded-2xl bg-primary/10 p-4 text-primary">{icon}</span><h2 className="font-semibold">{title}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{text}</p></section>;
}

function Logs({ enabled, locale, t }: { enabled: boolean; locale: AdminLocale; t: Translate }) {
  const [draft, setDraft] = useState<AdminLogFilters>({});
  const [filters, setFilters] = useState<AdminLogFilters>({});
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const [selected, setSelected] = useState<AdminLogEntry | null>(null);
  const cursor = cursors[cursors.length - 1];
  const logs = useQuery({ queryKey: ["admin", "logs", filters, cursor], queryFn: () => adminApi.logs({ ...filters, cursor, limit: 50 }), enabled });
  const update = (key: keyof AdminLogFilters, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const apply = (event: FormEvent) => {
    event.preventDefault();
    const next = { ...draft };
    for (const key of ["from", "to"] as const) if (next[key]) next[key] = new Date(next[key]!).toISOString();
    setFilters(next); setCursors([undefined]);
  };
  const fields: Array<{ key: keyof AdminLogFilters; label: string }> = [
    { key: "service", label: t("Сервис", "Service") }, { key: "context", label: t("Контекст", "Context") },
    { key: "requestId", label: "Request ID" }, { key: "jobId", label: "Job ID" }, { key: "sourceId", label: t("ID источника", "Source ID") },
  ];
  return <div className="space-y-5"><form onSubmit={apply} className={panel}><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{t("Структурированные логи", "Structured logs")}</h2><Badge intent="neutral">{t("Хранение: 30 дней", "Retention: 30 days")}</Badge></div><div className="grid items-end gap-3 sm:grid-cols-3"><Field label={t("Поиск по тексту", "Search text")}><Input value={draft.query ?? ""} onChange={event => update("query", event.target.value)} placeholder={t("Сообщение или значение поля", "Message or field value")} /></Field><Field label={t("Уровень", "Level")}><select className={selectClass} value={draft.level ?? ""} onChange={event => update("level", event.target.value)}><option value="">{t("Все уровни", "All levels")}</option>{["trace", "debug", "info", "warn", "error", "fatal"].map(level => <option key={level}>{level}</option>)}</select></Field><Button variant="outline" type="button" loading={logs.isFetching} onClick={() => logs.refetch()}><RefreshCw className="size-4" aria-hidden />{t("Обновить", "Refresh")}</Button></div><details className="mt-4"><summary className="cursor-pointer text-sm text-muted-foreground">{t("Период и идентификаторы", "Time range and identifiers")}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(field => <Field key={field.key} label={field.label}><Input value={String(draft[field.key] ?? "")} onChange={event => update(field.key, event.target.value)} /></Field>)}<Field label={t("С даты", "From")}><Input type="datetime-local" value={draft.from ?? ""} max={draft.to || undefined} onChange={event => update("from", event.target.value)} /></Field><Field label={t("До даты", "To")}><Input type="datetime-local" value={draft.to ?? ""} min={draft.from || undefined} onChange={event => update("to", event.target.value)} /></Field></div></details><div className="mt-4 flex flex-wrap gap-2"><Button type="submit"><Search className="size-4" aria-hidden />{t("Применить фильтры", "Apply filters")}</Button><Button variant="ghost" type="button" onClick={() => { setDraft({}); setFilters({}); setCursors([undefined]); }}>{t("Сбросить", "Reset")}</Button></div></form>
    <QueryBlock query={logs} t={t}>{logs.data?.status === "unconfigured" ? <EmptyNotice icon={<FileText className="size-6" aria-hidden />} title={t("Хранение логов ещё не подключено", "Log storage is not connected yet")} text={t("Подключите серверную директорию структурированных логов. Новые записи появятся после запуска сервиса.", "Configure the server structured-log directory. New entries appear after the service starts.")} /> : logs.data?.status === "unavailable" ? <EmptyNotice icon={<AlertTriangle className="size-6" aria-hidden />} title={t("Логи недоступны", "Logs unavailable")} text={t("Не удалось прочитать серверное хранилище логов.", "Server log storage could not be read.")} /> : <section className={panel}><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{t("Записи", "Entries")} <span className="text-muted-foreground">· {logs.data?.items.length ?? 0}</span></h2><p className="text-xs text-muted-foreground">{t("Проверено", "Checked")}: {dateLabel(logs.data?.checkedAt, locale)}</p></div><div className="space-y-2">{logs.data?.items.map(entry => <button type="button" key={entry.id} onClick={() => setSelected(entry)} className="flex w-full min-w-0 flex-col gap-2 rounded-lg border bg-background/50 p-3 text-left transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-start"><div className="flex shrink-0 flex-wrap items-center gap-2 sm:w-44"><Badge intent={["error", "fatal"].includes(entry.level) ? "danger" : entry.level === "warn" ? "warning" : "neutral"}>{entry.level}</Badge><span className="text-xs text-muted-foreground">{dateLabel(entry.time, locale)}</span></div><div className="min-w-0 flex-1"><p className="break-words text-sm [overflow-wrap:anywhere]">{entry.message || t("Без сообщения", "No message")}</p><p className="mt-1 break-words text-xs text-muted-foreground">{[entry.service, entry.context, entry.jobId ? `Job ${entry.jobId}` : undefined].filter(Boolean).join(" · ")}</p></div><ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden /></button>)}{!logs.data?.items.length ? <p className="py-8 text-center text-sm text-muted-foreground">{t("Записей по выбранным фильтрам нет.", "No entries match these filters.")}</p> : null}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{t("Страница", "Page")} {cursors.length}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={cursors.length === 1 || logs.isFetching} onClick={() => setCursors(current => current.slice(0, -1))}>{t("Назад", "Previous")}</Button><Button size="sm" variant="outline" disabled={!logs.data?.nextCursor || logs.isFetching} onClick={() => { if (logs.data?.nextCursor) setCursors(current => [...current, logs.data!.nextCursor!]); }}>{t("Далее", "Next")}</Button></div></div></section>}</QueryBlock>
    <Modal open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }} placement="drawer" title={t("Запись лога", "Log entry")} description={t("Структурированные поля и связанные операции.", "Structured fields and related operations.")}>
      {selected ? <div className="space-y-5"><div className="flex flex-wrap items-center gap-3"><Badge intent={["error", "fatal"].includes(selected.level) ? "danger" : "neutral"}>{selected.level}</Badge><span className="text-sm text-muted-foreground">{dateLabel(selected.time, locale)}</span></div><p className="break-words text-sm [overflow-wrap:anywhere]">{selected.message}</p><div className="grid gap-4 sm:grid-cols-2">{[[t("Сервис", "Service"), selected.service], [t("Контекст", "Context"), selected.context], ["Request ID", selected.requestId], ["Job ID", selected.jobId]].map(([name, value]) => <Metric key={name} label={name!} value={value} />)}</div>{selected.sourceId ? <Button variant="outline" asChild><Link href={`/admin/sources/${encodeURIComponent(selected.sourceId)}`}>{t("Открыть источник", "Open source")}<ArrowRight className="size-4" aria-hidden /></Link></Button> : null}<div><h3 className="mb-2 font-semibold">{t("Поля записи", "Entry fields")}</h3><pre className="max-h-[60dvh] overflow-auto rounded-lg border bg-muted p-3 text-xs">{safeJson(selected.fields)}</pre></div></div> : null}
    </Modal>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 space-y-1.5 text-sm"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
