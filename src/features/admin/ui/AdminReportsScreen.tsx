"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, ChevronLeft, ChevronRight, ExternalLink, Search, ShieldCheck, XCircle } from "lucide-react";
import { EmptyState } from "@/components/intly/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import type { AdminBulkReportResult, AdminReport, AdminReportDetail, AdminUser } from "@/types";
import { adminApi } from "../api/admin-api";
import { AdminFrame, AdminQueryState } from "./AdminShared";
import { AdminDuplicateReviewsPanel } from "./AdminDuplicateReviewsPanel";
import { dateLabel, label, localizedLabel, runStatusLabels, runtimeLabels, safeJson } from "./admin-format";
import type { AdminLocale, Localized } from "./admin-locale";
import { useAdminLocale } from "./admin-locale";
import { canBulkTriage, failedBulkIds, reportAssigneePayload, reportStatusIntent, selectedReportTypes, selectedReports, summarizeBulkResult, type ReportBulkIntent } from "./admin-reports-helpers";

const selectClass = "h-[var(--control-height)] rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const pageLimit = 50;

type ReportsCopy = {
  title: string;
  description: string;
  search: string;
  searchPlaceholder: string;
  all: string;
  category: string;
  shown: (count: number, total?: number) => string;
  open: string;
  cancel: string;
  confirm: string;
  actions: string;
  created: string;
  issue: string;
  opportunity: string;
  reporter: string;
  assignee: string;
  unassigned: string;
  reason: string;
  reasonPlaceholder: string;
  resolve: string;
  dismiss: string;
  select: string;
  status: string;
  priority: string;
  noText: string;
  grouped: (count: number) => string;
  emptyTitle: string;
  emptyDescription: string;
  detail: string;
  loading: string;
  adminNotes: string;
  saveTriage: string;
  resolution: string;
  lastResolution: string;
  currentFields: string;
  sourceOccurrences: string;
  sourceDiagnostics: string;
  source: string;
  sourceOpen: string;
  opportunityOpen: string;
  externalSource: string;
  relatedReports: string;
  noRelatedReports: string;
  next: string;
  previous: string;
  page: (page: number) => string;
  bulkTitle: string;
  bulkHint: string;
  bulkMixed: (types: string) => string;
  bulkConfirmTitle: string;
  bulkConfirmDescription: (action: string, count: number, type: string) => string;
  singleConfirmTitle: string;
  singleConfirmDescription: (action: string) => string;
  bulkSuccess: (done: number, failed: number) => string;
  failedSelected: string;
  saved: string;
  resolved: string;
  dismissed: string;
  latestRun: string;
  enabled: string;
  disabled: string;
  unknown: string;
  reportsTab: string;
  duplicatesTab: string;
  duplicateTools: string;
  duplicateToolsHint: string;
};

const copy: Localized<ReportsCopy> = {
  ru: {
    title: "Обращения по возможностям",
    description: "Очередь пользовательских обращений: дубликаты, закрытые записи, деньги, формат работы, битые ссылки и неверные категории.",
    search: "Поиск",
    searchPlaceholder: "текст, ID автора или ID возможности",
    all: "Все",
    category: "Категория",
    shown: (count, total) => `Показано ${count}${typeof total === "number" ? ` из ${total}` : ""}.`,
    open: "Открыть",
    cancel: "Отменить",
    confirm: "Подтвердить",
    actions: "Действия",
    created: "Создано",
    issue: "Обращение",
    opportunity: "Возможность",
    reporter: "Автор",
    assignee: "Ответственный",
    unassigned: "Не назначен",
    reason: "Причина",
    reasonPlaceholder: "Что проверено и почему решение корректно",
    resolve: "Решить",
    dismiss: "Отклонить",
    select: "Выбор",
    status: "Статус",
    priority: "Приоритет",
    noText: "Без текста",
    grouped: (count) => `В группе обращений: ${count}`,
    emptyTitle: "Обращений не найдено",
    emptyDescription: "Измени фильтры или проверь следующую страницу, если очередь длиннее первого блока.",
    detail: "Детали обращения",
    loading: "Загрузка…",
    adminNotes: "Заметки администратора",
    saveTriage: "Сохранить триаж",
    resolution: "Решение",
    lastResolution: "Последнее решение",
    currentFields: "Текущие нормализованные поля",
    sourceOccurrences: "Найденные источники",
    sourceDiagnostics: "Диагностика коннекторов",
    source: "Источник",
    sourceOpen: "Открыть источник",
    opportunityOpen: "Открыть карточку INTLY",
    externalSource: "Открыть внешнюю ссылку",
    relatedReports: "Похожие обращения",
    noRelatedReports: "Других обращений по этой возможности нет.",
    next: "Дальше",
    previous: "Назад",
    page: (page) => `Страница ${page}`,
    bulkTitle: "Групповое решение",
    bulkHint: "Групповые действия доступны только для выбранных обращений одной категории и требуют отдельного подтверждения.",
    bulkMixed: (types) => `Выбраны разные категории: ${types}. Оставь одну категорию для группового действия.`,
    bulkConfirmTitle: "Подтвердить групповое действие?",
    bulkConfirmDescription: (action, count, type) => `${action}: ${count} обращ. категории «${type}». Канонические данные возможности автоматически не меняются.`,
    singleConfirmTitle: "Подтвердить действие?",
    singleConfirmDescription: (action) => `${action}. Канонические данные возможности автоматически не меняются.`,
    bulkSuccess: (done, failed) => `Групповое действие: успешно ${done}, ошибок ${failed}.`,
    failedSelected: "Ошибочные обращения оставлены выбранными для повтора.",
    saved: "Изменения сохранены.",
    resolved: "Обращение решено.",
    dismissed: "Обращение отклонено.",
    latestRun: "Последний запуск",
    enabled: "Включён",
    disabled: "Отключён",
    unknown: "Неизвестно",
    reportsTab: "Обращения",
    duplicatesTab: "Возможные дубли",
    duplicateTools: "Открыть инструменты дублей",
    duplicateToolsHint: "Реальное объединение выполняется в отдельной панели с полным сравнением и подтверждением.",
  },
  en: {
    title: "Reports and issues",
    description: "Triage queue for duplicate, closed, compensation, remote/location, broken-link and category reports.",
    search: "Search",
    searchPlaceholder: "text, reporter ID or opportunity ID",
    all: "All",
    category: "Category",
    shown: (count, total) => `Showing ${count}${typeof total === "number" ? ` of ${total}` : ""}.`,
    open: "Open",
    cancel: "Cancel",
    confirm: "Confirm",
    actions: "Actions",
    created: "Created",
    issue: "Issue",
    opportunity: "Opportunity",
    reporter: "Reporter",
    assignee: "Assignee",
    unassigned: "Unassigned",
    reason: "Reason",
    reasonPlaceholder: "What was checked and why this decision is correct",
    resolve: "Resolve",
    dismiss: "Dismiss",
    select: "Select",
    status: "Status",
    priority: "Priority",
    noText: "No text",
    grouped: (count) => `Reports in group: ${count}`,
    emptyTitle: "No reports found",
    emptyDescription: "Change filters or move to the next page if this queue has more results.",
    detail: "Report detail",
    loading: "Loading…",
    adminNotes: "Admin notes",
    saveTriage: "Save triage",
    resolution: "Resolution",
    lastResolution: "Last resolution",
    currentFields: "Current normalized fields",
    sourceOccurrences: "Source occurrences",
    sourceDiagnostics: "Connector diagnostics",
    source: "Source",
    sourceOpen: "Open source",
    opportunityOpen: "Open INTLY record",
    externalSource: "Open external link",
    relatedReports: "Related reports",
    noRelatedReports: "No other reports for this opportunity.",
    next: "Next",
    previous: "Previous",
    page: (page) => `Page ${page}`,
    bulkTitle: "Bulk triage",
    bulkHint: "Bulk actions are available only for selected reports in one category and require a separate confirmation.",
    bulkMixed: (types) => `Selected categories differ: ${types}. Keep one category for a bulk action.`,
    bulkConfirmTitle: "Confirm bulk action?",
    bulkConfirmDescription: (action, count, type) => `${action}: ${count} reports in “${type}”. Opportunity data is not changed automatically.`,
    singleConfirmTitle: "Confirm action?",
    singleConfirmDescription: (action) => `${action}. Opportunity data is not changed automatically.`,
    bulkSuccess: (done, failed) => `Bulk action: ${done} succeeded, ${failed} failed.`,
    failedSelected: "Failed reports stay selected for retry.",
    saved: "Changes saved.",
    resolved: "Report resolved.",
    dismissed: "Report dismissed.",
    latestRun: "Latest run",
    enabled: "Enabled",
    disabled: "Disabled",
    unknown: "Unknown",
    reportsTab: "Reports",
    duplicatesTab: "Possible duplicates",
    duplicateTools: "Open duplicate tools",
    duplicateToolsHint: "Actual merging happens in a separate panel with full comparison and confirmation.",
  },
} as const;

const reportTypes = ["duplicate", "closed", "money", "remote_location", "broken_link", "technology_category", "wrong_data", "spam", "other"];
const reportStatuses = ["Open", "In review", "Resolved", "Dismissed"];
const reportTypeLabels: Localized<Record<string, string>> = {
  ru: { duplicate: "Дубликат", closed: "Закрыто", money: "Оплата", remote_location: "Формат работы или локация", broken_link: "Битая ссылка", technology_category: "Технологии или категория", wrong_data: "Неверные данные", spam: "Спам", other: "Другое" },
  en: { duplicate: "Duplicate", closed: "Closed", money: "Compensation", remote_location: "Remote or location", broken_link: "Broken link", technology_category: "Technology or category", wrong_data: "Wrong data", spam: "Spam", other: "Other" },
};
const reportStatusLabels: Localized<Record<string, string>> = {
  ru: { Open: "Открыт", "In review": "В работе", Resolved: "Решён", Dismissed: "Отклонён" },
  en: { Open: "Open", "In review": "In review", Resolved: "Resolved", Dismissed: "Dismissed" },
};
const priorityLabels: Localized<Record<string, string>> = {
  ru: { low: "Низкий", normal: "Обычный", high: "Высокий", urgent: "Срочный" },
  en: { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" },
};

export function AdminReportsScreen() {
  const locale = useAdminLocale();
  const text = copy[locale];
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const activeTab = params.get("tab") === "duplicates" ? "duplicates" : "reports";
  const initialReviewId = params.get("review");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkIntent, setBulkIntent] = useState<ReportBulkIntent | null>(null);
  const [singleIntent, setSingleIntent] = useState<{ action: "resolve" | "dismiss"; reason: string } | null>(null);
  const [bulkResult, setBulkResult] = useState<AdminBulkReportResult[] | null>(null);
  const [notice, setNotice] = useState("");

  const resetPagingAndSelection = () => {
    setCursor(null);
    setCursorHistory([]);
    setSelectedIds([]);
  };
  const setSearchFilter = (value: string) => {
    resetPagingAndSelection();
    setSearch(value);
  };
  const setStatusFilter = (value: string) => {
    resetPagingAndSelection();
    setStatus(value);
  };
  const setTypeFilter = (value: string) => {
    resetPagingAndSelection();
    setType(value);
  };

  const query = useQuery({ queryKey: ["admin", "reports", search, status, type, cursor], queryFn: () => adminApi.reports.list({ query: search, status, type, cursor: cursor ?? undefined, limit: pageLimit }) });
  const detail = useQuery({ queryKey: ["admin", "reports", selectedId], queryFn: () => adminApi.reports.detail(selectedId!), enabled: Boolean(selectedId) });
  const admins = useQuery({ queryKey: ["admin", "users", "admins"], queryFn: () => adminApi.users.list({ role: "Admin" }) });

  const reports = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const adminItems = admins.data?.items ?? [];
  const chosenReports = useMemo(() => selectedReports(reports, selectedIds), [reports, selectedIds]);
  const chosenTypes = selectedReportTypes(chosenReports);
  const canBulk = canBulkTriage(chosenReports);
  const pageNumber = cursorHistory.length + 1;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
  };
  const rememberDetail = (updated: AdminReportDetail) => {
    queryClient.setQueryData(["admin", "reports", updated.id], updated);
    setNotice(text.saved);
    invalidate();
  };

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Omit<Partial<AdminReport>, "assignedAdminId"> & { assignedAdminId?: string | null } }) => adminApi.reports.update(id, body),
    onSuccess: rememberDetail,
  });
  const resolve = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.reports.resolve(id, { reason, action: "admin_triage" }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "reports", updated.id], updated);
      setNotice(text.resolved);
      invalidate();
    },
  });
  const dismiss = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.reports.dismiss(id, { reason, action: "invalid_or_no_action" }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "reports", updated.id], updated);
      setNotice(text.dismissed);
      invalidate();
    },
  });
  const bulk = useMutation({
    mutationFn: (intent: ReportBulkIntent) => adminApi.reports.bulk({ ...intent, confirmed: true }),
    onSuccess: (result) => {
      const failed = failedBulkIds(result.items);
      const summary = summarizeBulkResult(result.items);
      setBulkResult(result.items);
      setSelectedIds(failed);
      setBulkReason(failed.length ? bulkReason : "");
      setNotice(`${text.bulkSuccess(summary.succeeded, summary.failed)}${failed.length ? ` ${text.failedSelected}` : ""}`);
      setBulkIntent(null);
      invalidate();
    },
  });

  const mutationError = errorMessage(update.error ?? resolve.error ?? dismiss.error ?? bulk.error);

  const requestBulk = (action: "resolve" | "dismiss") => {
    if (!canBulk) {
      setNotice(chosenTypes.length > 1 ? text.bulkMixed(chosenTypes.map((item) => label(reportTypeLabels[locale], item)).join(", ")) : text.bulkHint);
      return;
    }
    setBulkIntent({ action, ids: selectedIds, reason: bulkReason });
  };

  return (
    <AdminFrame title={text.title} description={text.description}>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={text.title}>
        <Button type="button" variant={activeTab === "reports" ? "primary" : "outline"} size="sm" role="tab" aria-selected={activeTab === "reports"} onClick={() => router.replace("/admin/issues")}>{text.reportsTab}</Button>
        <Button type="button" variant={activeTab === "duplicates" ? "primary" : "outline"} size="sm" role="tab" aria-selected={activeTab === "duplicates"} onClick={() => router.replace("/admin/issues?tab=duplicates")}>{text.duplicatesTab}</Button>
      </div>
      {activeTab === "duplicates" ? <AdminDuplicateReviewsPanel initialReviewId={initialReviewId} /> : (
      <AdminQueryState isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()}>
        <section className="mb-4 rounded-lg border bg-card p-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_14rem]">
            <label className="min-w-0 space-y-1 text-sm"><span className="font-medium">{text.search}</span><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input className="pl-9" value={search} onChange={(event) => setSearchFilter(event.target.value)} placeholder={text.searchPlaceholder} /></div></label>
            <label className="space-y-1 text-sm"><span className="font-medium">{text.status}</span><select className={`${selectClass} w-full min-w-0`} value={status} onChange={(event) => setStatusFilter(event.target.value)}><option value="">{text.all}</option>{reportStatuses.map((item) => <option key={item} value={item}>{label(reportStatusLabels[locale], item)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span className="font-medium">{text.category}</span><select className={`${selectClass} w-full min-w-0`} value={type} onChange={(event) => setTypeFilter(event.target.value)}><option value="">{text.all}</option>{reportTypes.map((item) => <option key={item} value={item}>{label(reportTypeLabels[locale], item)}</option>)}</select></label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><p>{text.shown(reports.length, query.data?.total)} {text.page(pageNumber)}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!cursorHistory.length} onClick={() => { const history = [...cursorHistory]; const previous = history.pop() ?? null; setCursor(previous); setCursorHistory(history); }}><ChevronLeft className="size-4" aria-hidden />{text.previous}</Button><Button size="sm" variant="outline" disabled={!query.data?.nextCursor} onClick={() => { if (query.data?.nextCursor) { setCursorHistory((value) => [...value, cursor ?? ""]); setCursor(query.data.nextCursor); } }}>{text.next}<ChevronRight className="size-4" aria-hidden /></Button></div></div>
        </section>

        <section className="mb-4 rounded-lg border bg-card p-3">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{text.bulkTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{chosenReports.length ? canBulk ? text.bulkHint : text.bulkMixed(chosenTypes.map((item) => label(reportTypeLabels[locale], item)).join(", ")) : text.bulkHint}</p></div><Badge intent={canBulk ? "primary" : "neutral"}>{selectedIds.length}</Badge></div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 space-y-1 text-sm sm:min-w-64"><span className="font-medium">{text.reason}</span><Input value={bulkReason} onChange={(event) => setBulkReason(event.target.value)} placeholder={text.reasonPlaceholder} /></label>
            <Button loading={bulk.isPending} disabled={!selectedIds.length || !canBulk} onClick={() => requestBulk("resolve")}><ShieldCheck className="size-4" aria-hidden />{text.resolve}</Button>
            <Button variant="outline" loading={bulk.isPending} disabled={!selectedIds.length || !canBulk} onClick={() => requestBulk("dismiss")}><XCircle className="size-4" aria-hidden />{text.dismiss}</Button>
          </div>
        </section>

        <LiveMessages notice={notice} error={mutationError} />
        {bulkResult ? <BulkResultPanel result={bulkResult} text={text} /> : null}
        <ReportsList reports={reports} selectedIds={selectedIds} text={text} locale={locale} onToggle={(id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onOpen={setSelectedId} />
        {selectedId ? <ReportDrawer openId={selectedId} detail={detail.data} admins={adminItems} text={text} locale={locale} loading={detail.isLoading} error={detail.isError ? errorMessage(detail.error) : null} saving={update.isPending || resolve.isPending || dismiss.isPending} onClose={() => setSelectedId(null)} onSave={(body) => update.mutate({ id: selectedId, body })} onAction={(action, reason) => setSingleIntent({ action, reason })} /> : null}
        {bulkIntent ? <ConfirmModal title={text.bulkConfirmTitle} description={text.bulkConfirmDescription(label({ resolve: text.resolve, dismiss: text.dismiss }, bulkIntent.action), bulkIntent.ids.length, label(reportTypeLabels[locale], chosenTypes[0]))} text={text} loading={bulk.isPending} onCancel={() => setBulkIntent(null)} onConfirm={() => bulk.mutate(bulkIntent)} /> : null}
        {singleIntent && selectedId ? <ConfirmModal title={text.singleConfirmTitle} description={text.singleConfirmDescription(singleIntent.action === "resolve" ? text.resolve : text.dismiss)} text={text} loading={resolve.isPending || dismiss.isPending} onCancel={() => setSingleIntent(null)} onConfirm={() => { const intent = singleIntent; setSingleIntent(null); if (intent.action === "resolve") resolve.mutate({ id: selectedId, reason: intent.reason }); else dismiss.mutate({ id: selectedId, reason: intent.reason }); }} /> : null}
      </AdminQueryState>)}
    </AdminFrame>
  );
}

function LiveMessages({ notice, error }: { notice: string; error?: string }) {
  return <div className="mb-4 space-y-2" aria-live="polite">{notice ? <p role="status" className="rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success">{notice}</p> : null}{error ? <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}</div>;
}

function BulkResultPanel({ result, text }: { result: AdminBulkReportResult[]; text: ReportsCopy }) {
  const summary = summarizeBulkResult(result);
  return <section className="mb-4 rounded-lg border bg-card p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{text.bulkSuccess(summary.succeeded, summary.failed)}</h2><Badge intent={summary.failed ? "warning" : "success"}>{summary.total}</Badge></div>{summary.failed ? <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">{result.filter((item) => !item.success).map((item) => <p key={item.id} className="rounded-md border bg-background/70 p-2 text-xs"><span className="font-mono">{item.id}</span><br /><span className="text-destructive">{item.error ?? "Failed"}</span></p>)}</div> : null}</section>;
}

function ReportsList({ reports, selectedIds, text, locale, onToggle, onOpen }: { reports: AdminReport[]; selectedIds: string[]; text: ReportsCopy; locale: AdminLocale; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  if (!reports.length) return <EmptyState title={text.emptyTitle} description={text.emptyDescription} illustration="workflow" />;
  return <section className="overflow-hidden rounded-lg border bg-card"><div className="hidden overflow-x-auto 2xl:block"><ReportsTable reports={reports} selectedIds={selectedIds} text={text} locale={locale} onToggle={onToggle} onOpen={onOpen} /></div><div className="grid gap-3 p-3 md:grid-cols-2 2xl:hidden">{reports.map((report) => <ReportCard key={report.id} report={report} selected={selectedIds.includes(report.id)} text={text} locale={locale} onToggle={onToggle} onOpen={onOpen} />)}</div></section>;
}

function ReportsTable({ reports, selectedIds, text, locale, onToggle, onOpen }: { reports: AdminReport[]; selectedIds: string[]; text: ReportsCopy; locale: AdminLocale; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return <table className="w-full min-w-[64rem] table-fixed text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="w-12 px-3 py-2"><span className="sr-only">{text.select}</span></th><th className="w-[18%] px-3 py-2">{text.issue}</th><th className="w-[20%] px-3 py-2">{text.opportunity}</th><th className="w-[15%] px-3 py-2">{text.reporter}</th><th className="w-[14%] px-3 py-2">{text.assignee}</th><th className="w-36 px-3 py-2">{text.status}</th><th className="w-36 px-3 py-2">{text.created}</th><th className="w-28 px-3 py-2 text-right">{text.actions}</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id} className="border-b last:border-0"><td className="px-3 py-3 align-top"><input aria-label={`${text.select} ${report.id}`} type="checkbox" checked={selectedIds.includes(report.id)} onChange={() => onToggle(report.id)} /></td><td className="px-3 py-3 align-top"><ReportIssue report={report} text={text} locale={locale} /></td><td className="px-3 py-3 align-top"><OpportunitySummary report={report} text={text} /></td><td className="px-3 py-3 align-top text-xs text-muted-foreground"><UserCell user={report.reporter} fallback={report.userId} /></td><td className="px-3 py-3 align-top text-xs text-muted-foreground">{report.assignee ? <UserCell user={report.assignee} fallback={report.assignedAdminId ?? ""} /> : text.unassigned}</td><td className="px-3 py-3 align-top"><ReportStatus report={report} text={text} locale={locale} /></td><td className="px-3 py-3 align-top text-xs text-muted-foreground">{dateLabel(report.createdAt, locale)}</td><td className="px-3 py-3 align-top text-right"><Button size="sm" variant="outline" onClick={() => onOpen(report.id)}>{text.open}</Button></td></tr>)}</tbody></table>;
}

function ReportCard({ report, selected, text, locale, onToggle, onOpen }: { report: AdminReport; selected: boolean; text: ReportsCopy; locale: AdminLocale; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return <article className="rounded-md border bg-background/70 p-3 text-sm"><div className="flex items-start justify-between gap-3"><ReportIssue report={report} text={text} locale={locale} /><input className="mt-1 size-5" aria-label={`${text.select} ${report.id}`} type="checkbox" checked={selected} onChange={() => onToggle(report.id)} /></div><div className="mt-3"><OpportunitySummary report={report} text={text} /></div><div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2"><p>{text.reporter}: <UserCell user={report.reporter} fallback={report.userId} /></p><p>{text.assignee}: {report.assignee ? <UserCell user={report.assignee} fallback={report.assignedAdminId ?? ""} /> : text.unassigned}</p><p>{text.created}: {dateLabel(report.createdAt, locale)}</p><ReportStatus report={report} text={text} locale={locale} /></div><div className="mt-3 flex justify-end"><Button size="sm" variant="outline" onClick={() => onOpen(report.id)}>{text.open}</Button></div></article>;
}

function ReportIssue({ report, text, locale }: { report: AdminReport; text: ReportsCopy; locale: AdminLocale }) {
  return <div className="min-w-0"><Badge intent={reportStatusIntent(report.status)}>{label(reportTypeLabels[locale], report.type)}</Badge><p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{report.comment || text.noText}</p>{(report.duplicateGroupCount ?? 0) > 1 ? <p className="mt-1 text-xs text-muted-foreground">{text.grouped(report.duplicateGroupCount ?? 0)}</p> : null}</div>;
}

function OpportunitySummary({ report, text }: { report: AdminReport; text: ReportsCopy }) {
  return <div className="min-w-0"><p className="line-clamp-2 font-medium">{report.opportunity?.title ?? report.opportunityId}</p><p className="text-xs text-muted-foreground">{report.opportunity?.type ?? "—"} · {report.opportunity?.sourceStatus ?? "—"}</p><div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="ghost" asChild><Link href={`/opportunities/${encodeURIComponent(report.opportunityId)}`}><ExternalLink className="size-4" aria-hidden />{text.opportunityOpen}</Link></Button>{report.type === "duplicate" ? <Button size="sm" variant="outline" asChild><Link href={`/admin/issues?tab=duplicates&review=${encodeURIComponent(report.opportunityId)}`} title={text.duplicateToolsHint}><ArrowRightLeft className="size-4" aria-hidden />{text.duplicateTools}</Link></Button> : null}</div></div>;
}

function ReportStatus({ report, text, locale }: { report: AdminReport; text: ReportsCopy; locale: AdminLocale }) {
  return <div><Badge intent={reportStatusIntent(report.status)}>{label(reportStatusLabels[locale], report.status)}</Badge><p className="mt-1 text-xs text-muted-foreground">{text.priority}: {label(priorityLabels[locale], report.priority)}</p></div>;
}

function UserCell({ user, fallback }: { user?: AdminReport["reporter"]; fallback: string }) {
  return user ? <span><span className="font-medium text-foreground">{user.name}</span><br />{user.email}</span> : <span>{fallback || "—"}</span>;
}

function ReportDrawer({ openId, detail, admins, text, locale, loading, error, saving, onClose, onSave, onAction }: { openId: string; detail?: AdminReportDetail; admins: AdminUser[]; text: ReportsCopy; locale: AdminLocale; loading: boolean; error: string | null; saving: boolean; onClose: () => void; onSave: (body: Omit<Partial<AdminReport>, "assignedAdminId"> & { assignedAdminId?: string | null }) => void; onAction: (action: "resolve" | "dismiss", reason: string) => void }) {
  const draftKey = detail ? `${detail.id}:${detail.updatedAt ?? detail.status}` : openId;
  return <Modal open onOpenChange={(open) => !open && onClose()} title={text.detail} description={openId} placement="drawer">{loading ? <p className="text-sm text-muted-foreground">{text.loading}</p> : error ? <p role="alert" className="text-sm text-destructive">{error}</p> : detail ? <ReportDrawerContent key={draftKey} report={detail} admins={admins} text={text} locale={locale} saving={saving} onSave={onSave} onAction={onAction} /> : null}</Modal>;
}

function ReportDrawerContent({ report, admins, text, locale, saving, onSave, onAction }: { report: AdminReportDetail; admins: AdminUser[]; text: ReportsCopy; locale: AdminLocale; saving: boolean; onSave: (body: Omit<Partial<AdminReport>, "assignedAdminId"> & { assignedAdminId?: string | null }) => void; onAction: (action: "resolve" | "dismiss", reason: string) => void }) {
  const [status, setStatus] = useState(report.status ?? "Open");
  const [priority, setPriority] = useState(report.priority ?? "normal");
  const [assignedAdminId, setAssignedAdminId] = useState(report.assignedAdminId ?? "");
  const [adminComment, setAdminComment] = useState(report.adminComment ?? "");
  const [reason, setReason] = useState("");

  return <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]"><section className="min-w-0 space-y-4"><div className="rounded-lg border bg-background/60 p-4"><div className="flex flex-wrap items-center gap-2"><Badge intent={reportStatusIntent(report.status)}>{label(reportTypeLabels[locale], report.type)}</Badge><Badge intent={reportStatusIntent(report.status)}>{label(reportStatusLabels[locale], report.status)}</Badge></div><p className="mt-3 break-words whitespace-pre-wrap text-sm">{report.comment || text.noText}</p><p className="mt-2 break-all text-xs text-muted-foreground">{text.reporter}: {report.reporter ? `${report.reporter.name} · ${report.reporter.email}` : report.userId} · {dateLabel(report.createdAt, locale)}</p></div><div className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border bg-background/60 p-4 md:grid-cols-2"><label className="space-y-1 text-sm"><span className="font-medium">{text.status}</span><select className={`${selectClass} w-full min-w-0`} value={status} onChange={(event) => setStatus(event.target.value)}>{reportStatuses.map((item) => <option key={item} value={item}>{label(reportStatusLabels[locale], item)}</option>)}</select></label><label className="space-y-1 text-sm"><span className="font-medium">{text.priority}</span><select className={`${selectClass} w-full min-w-0`} value={priority} onChange={(event) => setPriority(event.target.value)}>{Object.entries(priorityLabels[locale]).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label><label className="space-y-1 text-sm md:col-span-2"><span className="font-medium">{text.assignee}</span><select className={`${selectClass} w-full min-w-0`} value={assignedAdminId} onChange={(event) => setAssignedAdminId(event.target.value)}><option value="">{text.unassigned}</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name} · {admin.email}</option>)}</select></label><label className="space-y-1 text-sm md:col-span-2"><span className="font-medium">{text.adminNotes}</span><Textarea value={adminComment} onChange={(event) => setAdminComment(event.target.value)} /></label><div className="md:col-span-2"><Button loading={saving} onClick={() => onSave({ status, priority, assignedAdminId: reportAssigneePayload(assignedAdminId), adminComment })}>{text.saveTriage}</Button></div></div><ResolutionBlock report={report} text={text} locale={locale} /><div className="rounded-lg border bg-background/60 p-4"><h3 className="font-semibold">{text.resolution}</h3><Textarea aria-label={text.reason} className="mt-2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={text.reasonPlaceholder} /><div className="mt-3 flex flex-wrap gap-2"><Button loading={saving} onClick={() => onAction("resolve", reason)}><ShieldCheck className="size-4" aria-hidden />{text.resolve}</Button><Button variant="outline" loading={saving} onClick={() => onAction("dismiss", reason)}><XCircle className="size-4" aria-hidden />{text.dismiss}</Button></div></div><JsonBlock title={text.currentFields} value={report.currentFields} /><JsonBlock title={text.sourceOccurrences} value={report.sourceOccurrences} /><SourceDiagnostics items={report.sourceDiagnostics ?? []} text={text} locale={locale} /></section><aside className="min-w-0 space-y-3"><OpportunityPanel report={report} text={text} /><RelatedReports report={report} text={text} locale={locale} /></aside></div>;
}

function ResolutionBlock({ report, text, locale }: { report: AdminReportDetail; text: ReportsCopy; locale: AdminLocale }) {
  const reason = resolutionReason(report.resolution);
  if (!reason) return null;
  const date = resolutionDate(report.resolution);
  return <section className="rounded-lg border bg-background/60 p-4"><h3 className="font-semibold">{text.lastResolution}</h3>{date ? <p className="mt-1 text-xs text-muted-foreground">{dateLabel(date, locale)}</p> : null}<p className="mt-3 break-words whitespace-pre-wrap text-sm">{reason}</p></section>;
}

function OpportunityPanel({ report, text }: { report: AdminReportDetail; text: ReportsCopy }) {
  return <div className="rounded-lg border bg-card p-4 text-sm"><h3 className="font-semibold">{text.opportunity}</h3><p className="mt-2 font-medium">{report.opportunity?.title ?? report.opportunityId}</p><p className="text-muted-foreground">{report.opportunity?.companyOrClient ?? "—"}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" asChild><Link href={`/opportunities/${encodeURIComponent(report.opportunityId)}`}><ExternalLink className="size-4" aria-hidden />{text.opportunityOpen}</Link></Button>{report.type === "duplicate" ? <Button size="sm" variant="outline" asChild><Link href={`/admin/issues?tab=duplicates&review=${encodeURIComponent(report.opportunityId)}`} title={text.duplicateToolsHint}><ArrowRightLeft className="size-4" aria-hidden />{text.duplicateTools}</Link></Button> : null}{report.opportunity?.url ? <Button size="sm" variant="ghost" asChild><a href={report.opportunity.url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" aria-hidden />{text.externalSource}</a></Button> : null}</div><p className="mt-3 break-all text-xs text-muted-foreground">ID: {report.opportunityId}</p>{report.type === "duplicate" ? <p className="mt-2 text-xs text-muted-foreground">{text.duplicateToolsHint}</p> : null}</div>;
}

function RelatedReports({ report, text, locale }: { report: AdminReportDetail; text: ReportsCopy; locale: AdminLocale }) {
  return <div className="rounded-lg border bg-card p-4 text-sm"><h3 className="font-semibold">{text.relatedReports}</h3>{report.relatedReports?.length ? report.relatedReports.map((item) => <div key={item.id} className="mt-2 rounded-md border bg-background/70 p-2"><p>{label(reportTypeLabels[locale], item.type)} · {label(reportStatusLabels[locale], item.status)}</p><p className="text-xs text-muted-foreground">{dateLabel(item.createdAt, locale)}</p></div>) : <p className="mt-2 text-muted-foreground">{text.noRelatedReports}</p>}</div>;
}

function SourceDiagnostics({ items, text, locale }: { items: NonNullable<AdminReportDetail["sourceDiagnostics"]>; text: ReportsCopy; locale: AdminLocale }) {
  return <section className="rounded-lg border bg-background/60 p-4"><h3 className="font-semibold">{text.sourceDiagnostics}</h3><div className="mt-3 grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">{items.map((item) => {
    const enabledLabel = item.enabled === undefined ? text.unknown : item.enabled ? text.enabled : text.disabled;
    const runtimeLabel = localizedLabel(runtimeLabels, item.runtimeState, locale);
    const runStatus = localizedLabel(runStatusLabels, item.latestRun?.status, locale);
    return <article key={item.sourceId} className="min-w-0 rounded-md border bg-card p-3 text-sm"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{item.name ?? item.sourceId}</p><p className="text-xs text-muted-foreground">{runtimeLabel} · {enabledLabel}</p></div><Button size="sm" variant="outline" asChild><Link href={`/admin/sources/${encodeURIComponent(item.sourceId)}`}>{text.sourceOpen}</Link></Button></div><p className="mt-2 text-xs text-muted-foreground">{text.latestRun}: {item.latestRun ? `${runStatus} · ${dateLabel(item.latestRun.startedAt ?? item.latestRun.finishedAt, locale)}` : "—"}</p>{item.latestRun?.stats ? <pre className="mt-2 max-h-28 overflow-auto rounded bg-muted p-2 text-xs">{safeJson(item.latestRun.stats)}</pre> : null}</article>;
  })}{!items.length ? <p className="text-sm text-muted-foreground">—</p> : null}</div></section>;
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return <div className="min-w-0 rounded-lg border bg-background/60 p-4"><h3 className="font-semibold">{title}</h3><pre className="mt-3 max-h-72 max-w-full overflow-auto rounded bg-muted p-3 text-xs">{safeJson(value ?? {})}</pre></div>;
}

function ConfirmModal({ title, description, text, loading, onCancel, onConfirm }: { title: string; description: string; text: ReportsCopy; loading: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <Modal open onOpenChange={(open) => !open && !loading && onCancel()} title={title} description={description}><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={loading} onClick={onCancel}>{text.cancel}</Button><Button loading={loading} onClick={onConfirm}>{text.confirm}</Button></div></Modal>;
}

function resolutionReason(resolution: AdminReportDetail["resolution"]) {
  if (!resolution || typeof resolution !== "object") return "";
  for (const key of ["reason", "message", "comment", "note"]) {
    const value = resolution[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function resolutionDate(resolution: AdminReportDetail["resolution"]) {
  if (!resolution || typeof resolution !== "object") return undefined;
  for (const key of ["resolvedAt", "dismissedAt", "createdAt", "updatedAt", "at"]) {
    const value = resolution[key];
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : error ? String(error) : "";
}
