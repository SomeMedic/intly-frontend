"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, GitMerge, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/intly/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { descriptionPreviewText } from "@/components/intly/opportunity-card/description-preview";
import { useAuth } from "@/features/auth";
import type { AdminDedupOpportunityPreview, AdminDedupResolveDecision, AdminDedupReviewDetail, AdminDedupReviewListItem, AdminDedupReviewPair, AdminDedupStatusRun } from "@/types/admin-dedup";
import { adminDedupApi } from "../api/admin-dedup-api";
import { dateLabel } from "./admin-format";
import type { AdminLocale, Localized } from "./admin-locale";
import { useAdminLocale } from "./admin-locale";
import { confidenceLabel, dedupReasonSummary, numberLabel } from "./admin-dedup-labels";

const pageLimit = 50;

type DedupCopy = {
  title: string;
  description: string;
  search: string;
  searchPlaceholder: string;
  pending: string;
  needsReview: string;
  latestRun: string;
  scanned: string;
  merged: string;
  missing: string;
  checkedAt: string;
  status: string;
  candidates: string;
  open: string;
  recheck: string;
  refresh: string;
  loading: string;
  emptyTitle: string;
  emptyDescription: string;
  next: string;
  previous: string;
  shown: (count: number, total?: number) => string;
  detailTitle: string;
  original: string;
  candidate: string;
  sources: string;
  descriptionText: string;
  reasons: string;
  semantic: string;
  titleMinimumSimilarity: string;
  bodyMinimumSimilarity: string;
  bodyAverageSimilarity: string;
  canonical: string;
  canonicalHint: string;
  merge: string;
  distinct: string;
  confirmMergeTitle: string;
  confirmDistinctTitle: string;
  confirmMergeDescription: string;
  confirmDistinctDescription: string;
  reason: string;
  reasonPlaceholder: string;
  cancel: string;
  confirm: string;
  unavailable: string;
  noPairs: string;
  resolvedNoPairs: string;
  noOpportunity: string;
  staleError: string;
  actionSuccess: string;
  recheckQueued: string;
  conflictHint: string;
  adminOnly: string;
  opportunityOpen: string;
  externalSource: string;
  preserving: string;
  overflowHint: string;
  statusLabels: Record<string, string>;
  typeLabels: Record<string, string>;
};

const copy: Localized<DedupCopy> = {
  ru: {
    title: "Возможные дубли",
    description: "Ручное решение спорных совпадений: сравнение полных текстов, источников и канонической записи перед объединением.",
    search: "Поиск",
    searchPlaceholder: "название, компания, ID возможности",
    pending: "Ожидают",
    needsReview: "На проверке",
    latestRun: "Последний прогон",
    scanned: "Проверено",
    merged: "Объединено",
    missing: "Пропущено",
    checkedAt: "Проверено",
    status: "Статус",
    candidates: "Кандидаты",
    open: "Разобрать",
    recheck: "Проверить заново",
    refresh: "Обновить",
    loading: "Загрузка…",
    emptyTitle: "Спорных дублей нет",
    emptyDescription: "Очередь ручной проверки пуста или фильтр не нашёл записей.",
    next: "Дальше",
    previous: "Назад",
    shown: (count, total) => `Показано ${count}${typeof total === "number" ? ` из ${total}` : ""}.`,
    detailTitle: "Разбор дубля",
    original: "Исходная запись",
    candidate: "Кандидат",
    sources: "Источники",
    descriptionText: "Полный текст",
    reasons: "Почему попало в проверку",
    semantic: "AI-сравнение",
    titleMinimumSimilarity: "Мин. название",
    bodyMinimumSimilarity: "Мин. текст",
    bodyAverageSimilarity: "Сред. текст",
    canonical: "Каноническая запись",
    canonicalHint: "При объединении связанные отклики, задачи, избранное, тендерные документы и история будут сохранены за выбранной канонической записью.",
    merge: "Объединить",
    distinct: "Разные публикации",
    confirmMergeTitle: "Объединить записи?",
    confirmDistinctTitle: "Пометить разными публикациями?",
    confirmMergeDescription: "После подтверждения главный вариант останется в карточке, а связанная работа сохранится за ним.",
    confirmDistinctDescription: "Пара останется проверенной вручную: эти же факты не вернутся в очередь, пока текст или источники не изменятся.",
    reason: "Комментарий решения",
    reasonPlaceholder: "Что сравнили и почему это решение корректно",
    cancel: "Отмена",
    confirm: "Подтвердить",
    unavailable: "Недоступные кандидаты",
    noPairs: "Для этой записи нет пары для объединения. Можно поставить повторную проверку.",
    resolvedNoPairs: "Решение сохранено. Все пары разобраны.",
    noOpportunity: "Исходная запись недоступна или уже объединена.",
    staleError: "Данные пары устарели. Обновляю карточку перед следующим действием.",
    actionSuccess: "Решение сохранено.",
    recheckQueued: "Повторная проверка поставлена в очередь.",
    conflictHint: "Сервер отклонил действие: возможно, запись уже изменилась или связана с конфликтующими данными. Карточка обновлена.",
    adminOnly: "Инструмент доступен только администраторам.",
    opportunityOpen: "Открыть карточку",
    externalSource: "Источник",
    preserving: "Личные заметки, статусы, отклики, задачи, документы и аудит не удаляются. Главная карточка остаётся основной, связанная работа сохраняется за ней.",
    overflowHint: "Кандидата для merge нет: это служебная проверка переполнения или повторного скана.",
    statusLabels: { queued: "В очереди", running: "В работе", retrying: "Повтор", completed: "Завершён", open: "Открыт", resolved: "Решён", stale: "Устарел" },
    typeLabels: { vacancy: "Вакансия", freelance: "Фриланс", tender: "Тендер", project: "Проект" },
  },
  en: {
    title: "Possible duplicates",
    description: "Manual review for ambiguous matches: compare full text, sources and canonical target before merging.",
    search: "Search",
    searchPlaceholder: "title, company, opportunity ID",
    pending: "Pending",
    needsReview: "Needs review",
    latestRun: "Latest run",
    scanned: "Scanned",
    merged: "Merged",
    missing: "Missing",
    checkedAt: "Checked",
    status: "Status",
    candidates: "Candidates",
    open: "Review",
    recheck: "Recheck",
    refresh: "Refresh",
    loading: "Loading…",
    emptyTitle: "No duplicate reviews",
    emptyDescription: "The manual queue is empty or the filter did not match anything.",
    next: "Next",
    previous: "Previous",
    shown: (count, total) => `Showing ${count}${typeof total === "number" ? ` of ${total}` : ""}.`,
    detailTitle: "Duplicate review",
    original: "Original record",
    candidate: "Candidate",
    sources: "Sources",
    descriptionText: "Full text",
    reasons: "Why it needs review",
    semantic: "AI comparison",
    titleMinimumSimilarity: "Title minimum",
    bodyMinimumSimilarity: "Body minimum",
    bodyAverageSimilarity: "Body average",
    canonical: "Canonical record",
    canonicalHint: "When merging, responses, tasks, favorites, tender documents and history are preserved on the selected canonical record.",
    merge: "Merge",
    distinct: "Different postings",
    confirmMergeTitle: "Merge records?",
    confirmDistinctTitle: "Mark as different postings?",
    confirmMergeDescription: "After confirmation the main card is kept, and linked work remains attached to it.",
    confirmDistinctDescription: "This pair stays manually reviewed: the same facts will not return until the text or sources change.",
    reason: "Decision note",
    reasonPlaceholder: "What was compared and why this decision is correct",
    cancel: "Cancel",
    confirm: "Confirm",
    unavailable: "Unavailable candidates",
    noPairs: "This record has no merge pair. You can queue a recheck.",
    resolvedNoPairs: "Decision saved. No candidates remain.",
    noOpportunity: "The original record is unavailable or already merged.",
    staleError: "This pair is stale. Refreshing the review before the next action.",
    actionSuccess: "Decision saved.",
    recheckQueued: "Recheck queued.",
    conflictHint: "The server rejected the action: the record may have changed or related data may conflict. The review has been refreshed.",
    adminOnly: "This tool is available to admins only.",
    opportunityOpen: "Open record",
    externalSource: "Source",
    preserving: "Notes, states, responses, tasks, documents and audit are not deleted. The main card stays primary, and linked work remains attached to it.",
    overflowHint: "No merge candidate is available: this is an overflow or re-scan review.",
    statusLabels: { queued: "Queued", running: "Running", retrying: "Retrying", completed: "Completed", open: "Open", resolved: "Resolved", stale: "Stale" },
    typeLabels: { vacancy: "Vacancy", freelance: "Freelance", tender: "Tender", project: "Project" },
  },
};

type ConfirmState = {
  pair: AdminDedupReviewPair;
  decision: AdminDedupResolveDecision;
  targetId?: string;
  targetTitle?: string;
  reason: string;
};

export function AdminDuplicateReviewsPanel({ initialReviewId }: { initialReviewId?: string | null }) {
  const locale = useAdminLocale();
  const text = copy[locale];
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(initialReviewId ?? "");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [initialSelectionDismissed, setInitialSelectionDismissed] = useState(false);
  const [notice, setNotice] = useState("");

  const isAdmin = user?.role === "Admin";
  const status = useQuery({ queryKey: ["admin", "dedup", "status"], queryFn: adminDedupApi.status, enabled: isAdmin });
  const reviews = useQuery({ queryKey: ["admin", "dedup", "reviews", search, cursor], queryFn: () => adminDedupApi.reviews({ limit: pageLimit, cursor, query: search }), enabled: isAdmin });
  const items = reviews.data?.items ?? [];
  const matchedInitialReviewId = !selectedId && !initialSelectionDismissed && initialReviewId ? items.find((item) => item.id === initialReviewId || item.opportunity?.id === initialReviewId)?.id ?? null : null;
  const activeReviewId = selectedId ?? matchedInitialReviewId;
  const detail = useQuery({ queryKey: ["admin", "dedup", "review", activeReviewId], queryFn: () => adminDedupApi.review(activeReviewId!), enabled: isAdmin && Boolean(activeReviewId) });

  const invalidate = (opportunityId?: string) => {
    for (const key of [
      ["admin", "dedup"],
      ["admin", "reports"],
      ["opportunity"],
      ["opportunities"],
      ["dashboard"],
      ["pipelines"],
      ["analytics"],
      ["responses"],
      ["response"],
      ["tasks"],
      ["calendar"],
      ["watchlists"],
      ["tender-documents"],
      ["ai-runs"],
      ["notifications"],
    ]) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
    if (opportunityId) void queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] });
  };
  const resolve = useMutation({
    mutationFn: ({ reviewId, body }: { reviewId: string; body: Parameters<typeof adminDedupApi.resolve>[1] }) => adminDedupApi.resolve(reviewId, body),
    onSuccess: (result) => {
      setNotice(text.actionSuccess);
      invalidate(result.opportunityId ?? result.targetId);
    },
    onError: () => {
      setNotice(text.conflictHint);
      void detail.refetch();
      invalidate(detail.data?.opportunity?.id);
    },
  });
  const recheck = useMutation({
    mutationFn: (reviewId: string) => adminDedupApi.recheck(reviewId),
    onSuccess: (result) => {
      setNotice(text.recheckQueued);
      invalidate(result.opportunityId);
    },
  });

  if (!isAdmin) return <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">{text.adminOnly}</p>;

  return (
    <section className="space-y-4">
      <StatusStrip status={status.data} loading={status.isLoading} text={text} locale={locale} />
      <section className="rounded-lg border bg-card p-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="min-w-0 space-y-1 text-sm">
            <span className="font-medium">{text.search}</span>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setCursor(null); setCursorHistory([]); setInitialSelectionDismissed(true); }} placeholder={text.searchPlaceholder} /></div>
          </label>
          <div className="flex items-end gap-2">
            <Button size="sm" variant="outline" onClick={() => { status.refetch(); reviews.refetch(); }}><RefreshCw className="size-4" aria-hidden />{text.refresh}</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><p>{text.shown(items.length, reviews.data?.total)}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!cursorHistory.length} onClick={() => { const history = [...cursorHistory]; const previous = history.pop() ?? null; setCursor(previous); setCursorHistory(history); }}><ChevronLeft className="size-4" aria-hidden />{text.previous}</Button><Button size="sm" variant="outline" disabled={!reviews.data?.hasMore && !reviews.data?.nextCursor} onClick={() => { if (reviews.data?.nextCursor) { setCursorHistory((value) => [...value, cursor ?? ""]); setCursor(reviews.data.nextCursor); } }}>{text.next}<ChevronRight className="size-4" aria-hidden /></Button></div></div>
      </section>

      <div aria-live="polite">{notice ? <p role="status" className="rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success">{notice}</p> : null}{resolve.error || recheck.error ? <p role="alert" className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{resolve.error ? text.conflictHint : errorMessage(recheck.error)}</p> : null}</div>
      {reviews.isLoading ? <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{text.loading}</p> : reviews.isError ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{errorMessage(reviews.error)}</p> : <ReviewList items={items} text={text} locale={locale} selectedId={activeReviewId} onOpen={(id) => { setSelectedId(id); setInitialSelectionDismissed(true); }} />}
      {activeReviewId ? <ReviewDrawer reviewId={activeReviewId} detail={detail.data} loading={detail.isLoading} error={detail.isError ? errorMessage(detail.error) : null} saving={resolve.isPending || recheck.isPending} text={text} locale={locale} onClose={() => { setSelectedId(null); setInitialSelectionDismissed(true); }} onRecheck={() => recheck.mutate(activeReviewId)} onResolve={(state) => {
        if (!detail.data?.opportunity?.id) {
          setNotice(text.staleError);
          void detail.refetch();
          return;
        }
        resolve.mutate({ reviewId: activeReviewId, body: { candidateId: state.pair.candidate.id, decision: state.decision, targetId: state.targetId, reviewToken: state.pair.reviewToken, reason: state.reason } });
      }} /> : null}
    </section>
  );
}

function StatusStrip({ status, loading, text, locale }: { status?: { pending: number; review: number; runs: AdminDedupStatusRun[] }; loading: boolean; text: DedupCopy; locale: AdminLocale }) {
  const latest = status?.runs?.[0];
  const stats = [
    { label: text.pending, value: loading ? "…" : numberLabel(status?.pending, locale) },
    { label: text.needsReview, value: loading ? "…" : numberLabel(status?.review, locale) },
    { label: text.scanned, value: numberLabel(latest?.scanned, locale) },
    { label: text.merged, value: numberLabel(latest?.merged, locale) },
    { label: text.missing, value: numberLabel(latest?.missing, locale) },
  ];
  return <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">{stats.map((item) => <article key={item.label} className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-semibold">{item.value}</p></article>)}<article className="col-span-2 rounded-lg border bg-card p-3 xl:col-span-5"><div className="flex flex-wrap items-center gap-2"><Badge intent={latest?.status === "completed" ? "success" : latest ? "primary" : "neutral"}>{statusLabel(latest?.status, text)}</Badge><p className="text-sm font-medium">{text.latestRun}: {latest?.id ?? "—"}</p></div><p className="mt-1 text-xs text-muted-foreground">{dateLabel(latest?.updatedAt ?? latest?.finishedAt ?? latest?.startedAt, locale)}{latest?.lastError ? ` · ${latest.lastError}` : ""}</p></article></section>;
}

function ReviewList({ items, text, locale, selectedId, onOpen }: { items: AdminDedupReviewListItem[]; text: DedupCopy; locale: AdminLocale; selectedId: string | null; onOpen: (id: string) => void }) {
  if (!items.length) return <EmptyState title={text.emptyTitle} description={text.emptyDescription} illustration="workflow" />;
  return <section className="grid gap-3 lg:grid-cols-2">{items.map((item) => <button key={item.id} type="button" onClick={() => onOpen(item.id)} className={`min-w-0 rounded-lg border bg-card p-4 text-left transition hover:border-primary/60 ${selectedId === item.id ? "border-primary" : ""}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="line-clamp-2 font-semibold">{item.opportunity?.title ?? item.id}</p><p className="mt-1 text-sm text-muted-foreground">{item.opportunity?.companyOrClient ?? "—"} · {typeLabel(item.opportunity?.type, text)}</p></div><Badge intent={item.status === "resolved" ? "success" : "warning"}>{statusLabel(item.status, text)}</Badge></div><div className="mt-3 flex flex-wrap gap-2">{uniqueReasonLabels(item.review.flatMap((candidate) => candidate.reasons), locale).slice(0, 4).map((reason) => <Badge key={reason} intent="neutral">{reason}</Badge>)}</div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{text.candidates}: {item.review.length}</span><span>{text.checkedAt}: {dateLabel(item.checkedAt, locale)}</span></div></button>)}</section>;
}

function ReviewDrawer({ reviewId, detail, loading, error, saving, text, locale, onClose, onRecheck, onResolve }: { reviewId: string; detail?: AdminDedupReviewDetail; loading: boolean; error: string | null; saving: boolean; text: DedupCopy; locale: AdminLocale; onClose: () => void; onRecheck: () => void; onResolve: (state: ConfirmState) => void }) {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [canonicalByPair, setCanonicalByPair] = useState<Record<string, string>>({});
  const originalId = detail?.opportunity?.id;
  const selectedCanonical = (pair: AdminDedupReviewPair) => canonicalByPair[pair.candidate.id] ?? originalId ?? pair.candidate.id;
  const selectedCanonicalTitle = (pair: AdminDedupReviewPair) => selectedCanonical(pair) === detail?.opportunity?.id ? detail.opportunity?.title : pair.candidate.title;

  return <Modal open onOpenChange={(open) => !open && onClose()} title={text.detailTitle} description={reviewId} placement="drawer" wide>{loading ? <p className="text-sm text-muted-foreground">{text.loading}</p> : error ? <p role="alert" className="text-sm text-destructive">{error}</p> : detail ? <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/60 p-3"><div className="flex flex-wrap items-center gap-2"><Badge intent={detail.status === "resolved" ? "success" : "warning"}>{statusLabel(detail.status, text)}</Badge><span className="text-sm text-muted-foreground">{text.checkedAt}: {dateLabel(detail.checkedAt, locale)}</span></div><Button size="sm" variant="outline" onClick={onRecheck} loading={saving}><RefreshCw className="size-4" aria-hidden />{text.recheck}</Button></div>{!detail.pairs.length && detail.opportunity ? <OpportunityPreview title={text.original} item={detail.opportunity} text={text} locale={locale} /> : null}{!detail.opportunity ? <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">{text.noOpportunity}</p> : null}{detail.unavailableCandidates.length ? <section className="rounded-lg border bg-card p-3"><h3 className="font-semibold">{text.unavailable}</h3><p className="mt-2 break-all text-sm text-muted-foreground">{detail.unavailableCandidates.join(", ")}</p></section> : null}{detail.pairs.length ? detail.pairs.map((pair) => <section key={`${pair.candidate.id}:${pair.reviewToken}`} className="rounded-lg border bg-card p-3"><div className="grid min-w-0 gap-3 xl:grid-cols-2"><OpportunityPreview title={text.original} item={detail.opportunity} text={text} locale={locale} /><OpportunityPreview title={text.candidate} item={pair.candidate} text={text} locale={locale} /></div><PairDecision pair={pair} original={detail.opportunity} text={text} locale={locale} canonical={selectedCanonical(pair)} saving={saving} onCanonical={(id) => setCanonicalByPair((current) => ({ ...current, [pair.candidate.id]: id }))} onConfirm={(decision) => setConfirm({ pair, decision, targetId: decision === "merge" ? selectedCanonical(pair) : undefined, targetTitle: decision === "merge" ? selectedCanonicalTitle(pair) : undefined, reason: "" })} /></section>) : <section className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">{detail.status === "resolved" ? text.resolvedNoPairs : text.noPairs}</p>{detail.status === "resolved" ? null : <p className="mt-2 text-xs text-muted-foreground">{text.overflowHint}</p>}</section>}{confirm ? <ConfirmDecisionModal state={confirm} text={text} loading={saving} onChange={setConfirm} onCancel={() => setConfirm(null)} onConfirm={() => { const current = confirm; setConfirm(null); onResolve(current); }} /> : null}</div> : null}</Modal>;
}

function PairDecision({ pair, original, text, locale, canonical, saving, onCanonical, onConfirm }: { pair: AdminDedupReviewPair; original: AdminDedupOpportunityPreview | null; text: DedupCopy; locale: AdminLocale; canonical: string; saving: boolean; onCanonical: (id: string) => void; onConfirm: (decision: AdminDedupResolveDecision) => void }) {
  const originalId = original?.id;
  return <div className="mt-4 space-y-3 rounded-lg border bg-background/60 p-3"><div><h3 className="font-semibold">{text.reasons}</h3><div className="mt-2 flex flex-wrap gap-2">{uniqueReasonLabels(pair.reasons, locale).map((reason) => <Badge key={reason} intent="neutral">{reason}</Badge>)}</div></div><SemanticBlock pair={pair} text={text} locale={locale} /><div className="rounded-md border bg-card p-3"><h3 className="font-semibold">{text.canonical}</h3><p className="mt-1 text-sm text-muted-foreground">{text.canonicalHint}</p><div className="mt-3 grid gap-2 md:grid-cols-2">{originalId ? <CanonicalButton active={canonical === originalId} label={original?.title ?? originalId} id={originalId} onClick={() => onCanonical(originalId)} /> : null}<CanonicalButton active={canonical === pair.candidate.id} label={pair.candidate.title} id={pair.candidate.id} onClick={() => onCanonical(pair.candidate.id)} /></div><p className="mt-3 text-xs text-muted-foreground">{text.preserving}</p></div><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" loading={saving} onClick={() => onConfirm("distinct")}><CheckCircle2 className="size-4" aria-hidden />{text.distinct}</Button><Button loading={saving} disabled={!originalId || !canonical} onClick={() => onConfirm("merge")}><GitMerge className="size-4" aria-hidden />{text.merge}</Button></div></div>;
}

function CanonicalButton({ active, label, id, onClick }: { active: boolean; label: string; id: string; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`min-w-0 rounded-md border p-3 text-left transition hover:border-primary/60 ${active ? "border-primary bg-primary/10" : "bg-background/70"}`}><span className="line-clamp-2 text-sm font-medium">{label}</span><span className="mt-1 block break-all text-xs text-muted-foreground">{id}</span></button>;
}

function SemanticBlock({ pair, text, locale }: { pair: AdminDedupReviewPair; text: DedupCopy; locale: AdminLocale }) {
  const semantic = pair.semantic;
  if (!semantic) return null;
  return <section className="rounded-md border bg-card p-3"><h3 className="font-semibold">{text.semantic}</h3><div className="mt-2 grid gap-2 text-sm sm:grid-cols-3"><Metric label={text.titleMinimumSimilarity} value={confidenceLabel(semantic.title?.minimum, locale)} /><Metric label={text.bodyMinimumSimilarity} value={confidenceLabel(semantic.description?.minimum, locale)} /><Metric label={text.bodyAverageSimilarity} value={confidenceLabel(semantic.description?.weightedMean, locale)} /></div>{semantic.model ? <p className="mt-2 text-xs text-muted-foreground">{semantic.model}</p> : null}</section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <p className="rounded-md bg-muted p-2"><span className="block text-xs text-muted-foreground">{label}</span><span className="font-medium">{value}</span></p>;
}

function OpportunityPreview({ title, item, text, locale }: { title: string; item: AdminDedupOpportunityPreview | null; text: DedupCopy; locale: AdminLocale }) {
  if (!item) return <section className="min-w-0 rounded-lg border bg-background/60 p-4"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{text.noOpportunity}</p></section>;
  const description = item.description ? descriptionPreviewText(item.description) : "";
  return <section className="min-w-0 rounded-lg border bg-background/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold">{title}</h3><p className="mt-2 break-words text-base font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.companyOrClient ?? "—"} · {typeLabel(item.type, text)} · {item.location ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">{dateLabel(item.publishedAt, locale)}</p></div><Button size="sm" variant="outline" asChild><Link href={`/opportunities/${encodeURIComponent(item.id)}`}><ExternalLink className="size-4" aria-hidden />{text.opportunityOpen}</Link></Button></div><div className="mt-4"><h4 className="text-sm font-semibold">{text.descriptionText}</h4><div className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-card p-3 text-sm leading-6">{description || "—"}</div></div><Sources items={item.sourceOccurrences ?? []} text={text} /></section>;
}

function Sources({ items, text }: { items: NonNullable<AdminDedupOpportunityPreview["sourceOccurrences"]>; text: DedupCopy }) {
  return <div className="mt-4"><h4 className="text-sm font-semibold">{text.sources}</h4><div className="mt-2 grid gap-2">{items.length ? items.map((source, index) => <div key={`${source.sourceId}:${source.externalId ?? index}`} className="min-w-0 rounded-md border bg-card p-2 text-xs"><p className="break-all font-medium">{source.sourceId}{source.externalId ? ` · ${source.externalId}` : ""}</p>{source.url ? <a className="mt-1 inline-flex items-center gap-1 break-all text-primary" href={source.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3" aria-hidden />{text.externalSource}</a> : null}</div>) : <p className="text-sm text-muted-foreground">—</p>}</div></div>;
}

function ConfirmDecisionModal({ state, text, loading, onChange, onCancel, onConfirm }: { state: ConfirmState; text: DedupCopy; loading: boolean; onChange: (state: ConfirmState) => void; onCancel: () => void; onConfirm: () => void }) {
  const merge = state.decision === "merge";
  return <Modal open onOpenChange={(open) => !open && !loading && onCancel()} title={merge ? text.confirmMergeTitle : text.confirmDistinctTitle} description={merge ? text.confirmMergeDescription : text.confirmDistinctDescription}><div className="space-y-4"><p className="flex items-start gap-2 rounded-md border bg-muted/60 p-3 text-sm"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{merge ? text.canonicalHint : text.confirmDistinctDescription}</p>{merge ? <div className="flex items-start gap-2 break-all rounded-md border bg-card p-3 text-sm"><ArrowRightLeft className="mt-0.5 size-4 shrink-0" aria-hidden /><p><span className="font-medium">{text.canonical}: {state.targetTitle ?? state.targetId}</span><br /><span className="text-xs text-muted-foreground">{state.targetId}</span></p></div> : null}<label className="block space-y-1 text-sm"><span className="font-medium">{text.reason}</span><Textarea maxLength={2000} value={state.reason} onChange={(event) => onChange({ ...state, reason: event.target.value })} placeholder={text.reasonPlaceholder} /></label><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={loading} onClick={onCancel}>{text.cancel}</Button><Button loading={loading} onClick={onConfirm}>{text.confirm}</Button></div></div></Modal>;
}

function statusLabel(status: string | null | undefined, text: DedupCopy) {
  if (!status) return "—";
  return text.statusLabels[status] ?? status;
}

function typeLabel(type: string | null | undefined, text: DedupCopy) {
  if (!type) return "—";
  return text.typeLabels[type] ?? type;
}

function uniqueReasonLabels(reasons: string[] | undefined, locale: AdminLocale) {
  return Array.from(new Set(dedupReasonSummary(reasons, locale)));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : error ? String(error) : "";
}
