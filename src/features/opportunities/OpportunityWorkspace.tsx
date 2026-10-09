"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ExternalLink, Flag, Heart, EyeOff, MessageSquare, Pin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { useProfiles, getPublicSources } from "@/features/profiles";
import { useActiveProfileStore } from "@/hooks/use-active-profile";
import { normalizePipelineStatus, stagesForPipeline } from "@/lib/pipeline-model";
import { api } from "@/services/api";
import { AppShell } from "@/components/intly/app-shell";
import { MatchScore } from "@/components/intly/match-score";
import { EmptyState } from "@/components/intly/empty-state";
import { ErrorState } from "@/components/intly/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import {
  plainOpportunityDescription,
  selectClass,
  sourceUrl,
  type OpportunityRecord
} from "./contracts";
import { AiAnalysisPanel } from "./AiAnalysisPanel";
import { ResponsePanel } from "./ResponsePanel";
import { OpportunityFacts } from "./OpportunityFacts";
import { TenderWorkspace } from "./TenderWorkspace";
import {
  commonTabLabels,
  factValueLabel,
  formatOpportunityDate,
  formatOpportunityFieldDate,
  moneyLabelForLocale,
  opportunityTypeLabels,
  pipelineStageLabels,
  resolveOpportunityLocale,
  sourceStatusLabels,
  tenderTabLabels,
  type OpportunityLocale
} from "./opportunity-workspace-labels";
import { editorTargetTabForOpportunity } from "./opportunity-editor-entry";
import {
  isOpportunityViewReady,
  opportunityDetailPath,
  opportunityDetailQueryKey,
  opportunityViewBody,
  opportunityViewIntentKey,
  opportunityViewIntentRetry,
  opportunityViewOpenContextKey,
  opportunityViewPath,
  resolveOpportunityViewIntentState,
  resolveOpportunityWorkspaceProfileId,
  syncOpportunityViewCaches
} from "./opportunity-view-intent";

type Comment = {
  id: string;
  authorId: string;
  authorEmail: string;
  body: string;
  createdAt: string;
};
const commonTabs = [
  "description",
  "facts",
  "ai",
  "response",
  "notes",
  "comments",
  "sources"
] as const;
const tenderTabs = [
  "description",
  "facts",
  "documents",
  "eligibility",
  "requirements",
  "application",
  "risks",
  "ai",
  "notes",
  "comments",
  "sources"
] as const;
const allTabValues = new Set<string>([...commonTabs, ...tenderTabs]);

const workspaceCopy = {
  ru: {
    backToOpportunities: "← Все возможности",
    loadingOpportunity: "Загрузка возможности",
    companyMissing: "Компания / заказчик не указан",
    deadline: "Срок",
    pipelineStageAria: "Этап отклика",
    favoriteOn: "В избранном",
    favoriteOff: "В избранное",
    showRecord: "Показать запись",
    hideRecord: "Скрыть запись",
    restoreFromArchive: "Вернуть из архива",
    archive: "В архив",
    source: "Источник",
    fullPage: "Полная страница →",
    reportProblem: "Сообщить о проблеме",
    contentAria: "Содержание возможности",
    description: "Описание",
    descriptionMissing: "Описание не опубликовано.",
    skills: "Навыки",
    notSpecified: "Не указаны",
    firstSeen: "Впервые собрана",
    published: "Опубликована",
    sharedRecordHint: "Общая запись. Личные действия относятся к выбранному профилю.",
    profileContextError: "Не удалось определить профиль для просмотра.",
    chooseProfileTitle: "Выберите профиль",
    chooseProfileNotesDescription: "Личные заметки сохраняются отдельно для каждого профиля.",
    sourcesHint:
      "Общая запись объединяет публикации разных источников. Основной источник определяет канонические значения.",
    manualImport: "Ручной импорт",
    primary: "Основной",
    checked: "Проверено",
    openPublication: "Открыть публикацию",
    manualRecord: "Ручная запись",
    notesHint:
      "Эти заметки доступны вам и администратору. Другие пользователи видят только общее обсуждение.",
    privateNote: "Личная заметка",
    tagsComma: "Теги через запятую",
    savePrivateData: "Сохранить личные данные",
    discussionHint: "Обсуждение доступно всем пользователям.",
    delete: "Удалить",
    commentAria: "Общий комментарий",
    commentPlaceholder: "Комментарий для команды…",
    publishComment: "Опубликовать комментарий",
    reportSent: "Сообщение отправлено администратору",
    reportTypeAria: "Тип проблемы",
    reportDescriptionAria: "Описание проблемы",
    send: "Отправить",
    reportTypes: {
      wrong_data: "Неверные данные",
      duplicate: "Дубликат",
      closed: "Закрытая запись",
      money: "Зарплата или бюджет",
      remote_location: "Удалёнка или локация",
      broken_link: "Битая ссылка",
      technology_category: "Технологии или категория",
      spam: "Спам",
      other: "Другое"
    }
  },
  en: {
    backToOpportunities: "← All opportunities",
    loadingOpportunity: "Loading opportunity",
    companyMissing: "Company / client is not specified",
    deadline: "Deadline",
    pipelineStageAria: "Response step",
    favoriteOn: "In favorites",
    favoriteOff: "Add to favorites",
    showRecord: "Show record",
    hideRecord: "Hide record",
    restoreFromArchive: "Restore from archive",
    archive: "Archive",
    source: "Source",
    fullPage: "Full page →",
    reportProblem: "Report a problem",
    contentAria: "Opportunity content",
    description: "Description",
    descriptionMissing: "Description has not been published.",
    skills: "Skills",
    notSpecified: "Not specified",
    firstSeen: "First collected",
    published: "Published",
    sharedRecordHint: "Shared record. Private actions apply to the selected profile.",
    profileContextError: "Could not resolve the profile for this view.",
    chooseProfileTitle: "Choose a profile",
    chooseProfileNotesDescription: "Private notes are saved separately for each profile.",
    sourcesHint:
      "The shared record combines publications from multiple sources. The primary source defines canonical values.",
    manualImport: "Manual import",
    primary: "Primary",
    checked: "Checked",
    openPublication: "Open publication",
    manualRecord: "Manual record",
    notesHint:
      "These notes are available to you and the administrator. Other users only see the shared discussion.",
    privateNote: "Private note",
    tagsComma: "Comma-separated tags",
    savePrivateData: "Save private data",
    discussionHint: "Discussion is available to all users.",
    delete: "Delete",
    commentAria: "Shared comment",
    commentPlaceholder: "Comment for the team…",
    publishComment: "Publish comment",
    reportSent: "Message sent to the administrator",
    reportTypeAria: "Problem type",
    reportDescriptionAria: "Problem description",
    send: "Send",
    reportTypes: {
      wrong_data: "Wrong data",
      duplicate: "Duplicate",
      closed: "Closed record",
      money: "Salary or budget",
      remote_location: "Remote or location",
      broken_link: "Broken link",
      technology_category: "Technology or category",
      spam: "Spam",
      other: "Other"
    }
  }
};

type WorkspaceCopy = (typeof workspaceCopy)[OpportunityLocale];
type OpportunityViewIntentResult =
  | { intentKey: string; status: "success"; data: OpportunityRecord }
  | { intentKey: string; status: "error"; error: Error };

export function OpportunityDetailScreen({ id }: { id: string }) {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p>Загружаем возможность…</p>
        </AppShell>
      }
    >
      <DetailRoute id={id} />
    </Suspense>
  );
}
function DetailRoute({ id }: { id: string }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  function navigateTab(tab: string) {
    const next = new URLSearchParams(params.toString());
    next.set("tab", tab);
    router.push(`${pathname}?${next.toString()}${window.location.hash}`, { scroll: false });
  }
  return (
    <AppShell>
      <OpportunityWorkspace
        id={id}
        initialTab={params.get("tab") ?? undefined}
        profileIdOverride={params.get("profileId") ?? undefined}
        onTabChange={navigateTab}
        showBackLink
      />
    </AppShell>
  );
}

export function OpportunityWorkspace({
  id,
  initialTab,
  compact = false,
  onUpdated,
  profileIdOverride,
  showBackLink = false,
  onOpenPipeline,
  onTabChange
}: {
  onOpenPipeline?: () => void;
  onTabChange?: (tab: string) => void;
  id: string;
  initialTab?: string;
  compact?: boolean;
  onUpdated?: () => void;
  profileIdOverride?: string;
  showBackLink?: boolean;
}) {
  const { user } = useAuth();
  const locale = resolveOpportunityLocale(user?.settings.locale);
  const copy = workspaceCopy[locale];
  const profiles = useProfiles();
  const selectedProfileId = useActiveProfileStore((state) => state.activeProfileId);
  const profileResolution = resolveOpportunityWorkspaceProfileId({
    profileIdOverride,
    selectedProfileId,
    profiles: profiles.data,
    profilesPending: profiles.isPending,
    profilesError: profiles.isError
  });
  const profileId = profileResolution.profileId;
  const userId = user?.id;
  const client = useQueryClient();
  const [viewRetryNonce, setViewRetryNonce] = useState(0);
  const [viewIntentState, setViewIntentState] = useState({
    contextKey: null as string | null,
    generation: 0,
    retryNonce: 0
  });
  const [viewIntentResult, setViewIntentResult] = useState<OpportunityViewIntentResult | null>(
    null
  );
  const initialSection = initialTab && allTabValues.has(initialTab) ? initialTab : "description";
  const [localTab, setLocalTab] = useState(initialSection);
  const tab = onTabChange ? initialSection : localTab;
  const [reporting, setReporting] = useState(false);
  function navigateTab(next: string) {
    const resume = () => {
      if (onTabChange) onTabChange(next);
      else setLocalTab(next);
    };
    const event = new CustomEvent("intly:response-navigation", {
      cancelable: true,
      detail: { resume }
    });
    if (window.document.dispatchEvent(event)) resume();
  }
  const detailQueryKey = useMemo(
    () => opportunityDetailQueryKey(id, userId, profileId),
    [id, profileId, userId]
  );
  const viewContextKey = userId
    ? opportunityViewOpenContextKey({ opportunityId: id, userId, profileId })
    : null;
  const nextViewIntentState = resolveOpportunityViewIntentState(
    viewIntentState,
    viewContextKey,
    viewRetryNonce
  );
  if (nextViewIntentState !== viewIntentState) setViewIntentState(nextViewIntentState);
  const viewIntentKey = opportunityViewIntentKey(nextViewIntentState);
  useEffect(() => {
    if (!userId || !profileResolution.ready || profileResolution.error || !viewIntentKey) return;
    let cancelled = false;
    async function markViewed() {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= opportunityViewIntentRetry; attempt += 1) {
        if (cancelled) return;
        try {
          const data = await api.post<OpportunityRecord>(
            opportunityViewPath(id),
            opportunityViewBody(profileId)
          );
          if (!cancelled) {
            syncOpportunityViewCaches(client, data, userId, profileId);
            setViewIntentResult({ intentKey: viewIntentKey!, status: "success", data });
          }
          return;
        } catch (error) {
          if (cancelled) return;
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }
      if (!cancelled)
        setViewIntentResult({
          intentKey: viewIntentKey!,
          status: "error",
          error: lastError ?? new Error("View failed")
        });
    }
    void markViewed();
    return () => {
      cancelled = true;
    };
  }, [
    client,
    id,
    profileId,
    profileResolution.error,
    profileResolution.ready,
    userId,
    viewIntentKey
  ]);
  const activeViewIntent = viewIntentResult?.intentKey === viewIntentKey ? viewIntentResult : null;
  const currentViewReady = isOpportunityViewReady(activeViewIntent?.status);
  const query = useQuery({
    queryKey: detailQueryKey,
    queryFn: () => api.get<OpportunityRecord>(opportunityDetailPath(id, profileId)),
    enabled: !!user && profileResolution.ready && currentViewReady,
    initialData: () => (currentViewReady ? activeViewIntent?.data : undefined)
  });
  const catalog = useQuery({
    queryKey: ["sources", "public"],
    queryFn: getPublicSources,
    enabled: !!user
  });
  const mutation = useMutation({
    mutationFn: (value: Record<string, unknown>) =>
      api.patch(`/opportunities/${id}/personal`, { ...value, profileId }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["opportunity", id] });
      client.invalidateQueries({ queryKey: ["opportunities"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
      onUpdated?.();
    },
    onError: (error) => toast.error(error.message)
  });
  if (profileResolution.error) return <ErrorState message={copy.profileContextError} />;
  if (activeViewIntent?.status === "error")
    return (
      <ErrorState
        message={activeViewIntent.error.message}
        onRetry={() => setViewRetryNonce((value) => value + 1)}
      />
    );
  if (!profileResolution.ready || !currentViewReady || query.isPending)
    return (
      <div
        className="h-64 animate-pulse rounded-lg bg-muted"
        aria-label={copy.loadingOpportunity}
      />
    );
  if (query.isError)
    return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
  const opportunity = query.data;
  const state = opportunity.personalState;
  const url = sourceUrl(opportunity);
  const typeStageLabels = stagesForPipeline(opportunity.type).map(
    (stage) => [stage, pipelineStageLabels[locale][stage] ?? stage] as const
  );
  const selectedPipelineStatus = normalizePipelineStatus(opportunity.type, state?.pipelineStatus);
  const activeTabs = opportunity.type === "tender" ? tenderTabs : commonTabs;
  const activeTabLabels =
    opportunity.type === "tender" ? tenderTabLabels[locale] : commonTabLabels[locale];
  const activeTab = activeTabs.includes(tab as never) ? tab : "description";
  const headerFactLabels = [
    opportunity.remoteType,
    opportunity.location,
    opportunity.seniority,
    opportunity.employmentType
  ].reduce<string[]>((labels, value) => {
    if (!value) return labels;
    const label = factValueLabel(String(value), locale);
    return labels.includes(label) ? labels : [...labels, label];
  }, []);
  return (
    <div>
      {showBackLink ? (
        <Link href="/opportunities" className="mb-4 inline-block text-sm text-muted-foreground">
          {copy.backToOpportunities}
        </Link>
      ) : null}
      <header>
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge intent="primary">{opportunityTypeLabels[locale][opportunity.type]}</Badge>
          <Badge intent={opportunity.sourceStatus === "Unknown" ? "warning" : "neutral"}>
            {sourceStatusLabels[locale][opportunity.sourceStatus]}
          </Badge>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className={compact ? "text-xl font-semibold" : "text-2xl font-semibold"}>
              {opportunity.title}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {opportunity.companyOrClient || copy.companyMissing}
            </p>
          </div>
          <MatchScore value={state?.matchScore ?? null} label={locale === "ru" ? "Подходит" : "Fit"} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Badge intent="primary">{moneyLabelForLocale(opportunity.money, locale)}</Badge>
          {headerFactLabels.map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
          {opportunity.deadline && (
            <Badge intent="warning">
              {copy.deadline}: {formatOpportunityFieldDate(opportunity, "deadline", locale)}
            </Badge>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant={state?.favorite ? "secondary" : "outline"}
            disabled={!profileId || mutation.isPending}
            onClick={() => mutation.mutate({ favorite: !state?.favorite })}
          >
            <Heart className="size-4" />
            {state?.favorite ? copy.favoriteOn : copy.favoriteOff}
          </Button>
          <select
            className={selectClass}
            aria-label={copy.pipelineStageAria}
            disabled={!profileId || mutation.isPending}
            value={selectedPipelineStatus}
            onChange={(event) => mutation.mutate({ pipelineStatus: event.target.value })}
          >
            {typeStageLabels.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            aria-label={state?.hidden ? copy.showRecord : copy.hideRecord}
            disabled={!profileId || mutation.isPending}
            onClick={() => mutation.mutate({ hidden: !state?.hidden })}
          >
            <EyeOff className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={state?.archived ? copy.restoreFromArchive : copy.archive}
            disabled={!profileId || mutation.isPending}
            onClick={() => mutation.mutate({ archived: !state?.archived })}
          >
            <Archive className="size-4" />
          </Button>
          {url && (
            <Button variant="outline" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                {copy.source}
              </a>
            </Button>
          )}
          {compact && (
            <Button variant="ghost" asChild>
              <Link
                href={`/opportunities/${id}?tab=${activeTab}${profileId ? `&profileId=${profileId}` : ""}`}
              >
                {copy.fullPage}
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={copy.reportProblem}
            onClick={() => setReporting(true)}
          >
            <Flag className="size-4" />
          </Button>
        </div>
      </header>
      <div className="my-5 md:hidden">
        <select
          className={`${selectClass} w-full min-w-0`}
          aria-label={copy.contentAria}
          value={activeTab}
          onChange={(event) => navigateTab(event.target.value)}
        >
          {activeTabs.map((value) => (
            <option key={value} value={value}>
              {activeTabLabels[value]}
            </option>
          ))}
        </select>
      </div>
      <nav
        className="my-5 hidden gap-1 overflow-x-auto border-b pb-2 md:flex"
        aria-label={copy.contentAria}
      >
        {activeTabs.map((value) => (
          <Button
            key={value}
            className="shrink-0 whitespace-nowrap"
            variant={activeTab === value ? "secondary" : "ghost"}
            onClick={() => navigateTab(value)}
          >
            {activeTabLabels[value]}
            {value === "notes" && <Pin className="size-3" />}
            {value === "comments" && <MessageSquare className="size-3" />}
          </Button>
        ))}
      </nav>
      {activeTab === "description" &&
        (opportunity.type === "tender" ? (
          <TenderWorkspace
            opportunity={opportunity}
            profileId={profileId}
            section="overview"
            locale={locale}
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <section className="min-w-0 rounded-lg border bg-card p-5">
              <h2 className="mb-3 font-semibold">{copy.description}</h2>
              <div className="whitespace-pre-wrap break-words text-sm leading-7">
                {plainOpportunityDescription(opportunity.description) || copy.descriptionMissing}
              </div>
              {opportunity.summary && (
                <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
                  {opportunity.summary}
                </p>
              )}
            </section>
            <aside className="space-y-4">
              <section className="rounded-lg border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold">{copy.skills}</h2>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set([...opportunity.skills, ...opportunity.technologies])].map(
                    (skill) => (
                      <Badge key={skill}>{skill}</Badge>
                    )
                  )}
                </div>
                {!opportunity.skills.length && !opportunity.technologies.length && (
                  <p className="text-sm text-muted-foreground">{copy.notSpecified}</p>
                )}
              </section>
              <section className="rounded-lg border bg-card p-4 text-xs text-muted-foreground">
                <p>
                  {copy.firstSeen}: {formatOpportunityDate(opportunity.firstSeenAt, locale, false)}
                </p>
                {opportunity.publishedAt && (
                  <p className="mt-2">
                    {copy.published}:{" "}
                    {formatOpportunityFieldDate(opportunity, "publishedAt", locale, false)}
                  </p>
                )}
                <p className="mt-3">{copy.sharedRecordHint}</p>
              </section>
            </aside>
          </div>
        ))}
      {activeTab === "documents" && (
        <TenderWorkspace
          opportunity={opportunity}
          profileId={profileId}
          section="documents"
          locale={locale}
        />
      )}
      {activeTab === "eligibility" && (
        <TenderWorkspace
          opportunity={opportunity}
          profileId={profileId}
          section="eligibility"
          locale={locale}
        />
      )}
      {activeTab === "requirements" && (
        <TenderWorkspace
          opportunity={opportunity}
          profileId={profileId}
          section="requirements"
          locale={locale}
        />
      )}
      {activeTab === "application" && (
        <TenderWorkspace
          opportunity={opportunity}
          profileId={profileId}
          section="application"
          locale={locale}
          onOpenPipeline={onOpenPipeline}
        />
      )}
      {activeTab === "risks" && (
        <TenderWorkspace
          opportunity={opportunity}
          profileId={profileId}
          section="risks"
          locale={locale}
        />
      )}
      {activeTab === "facts" && (
        <OpportunityFacts opportunity={opportunity} sources={catalog.data ?? []} locale={locale} />
      )}
      {activeTab === "ai" && (
        <AiAnalysisPanel
          opportunityId={id}
          opportunityType={opportunity.type}
          profileId={profileId}
          locale={locale}
          onOpenEditor={() => navigateTab(editorTargetTabForOpportunity(opportunity.type))}
        />
      )}
      {activeTab === "response" && (
        <ResponsePanel
          opportunity={opportunity}
          profileId={profileId}
          locale={locale}
          onOpenPipeline={onOpenPipeline}
        />
      )}
      {activeTab === "notes" &&
        (profileId ? (
          <PrivateNotes
            key={state?.id ?? profileId}
            opportunity={opportunity}
            onSave={(value) => mutation.mutate(value)}
            pending={mutation.isPending}
            copy={copy}
          />
        ) : (
          <EmptyState
            title={copy.chooseProfileTitle}
            description={copy.chooseProfileNotesDescription}
          />
        ))}
      {activeTab === "comments" && <Comments opportunityId={id} locale={locale} copy={copy} />}
      {activeTab === "sources" && (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">{copy.sourcesHint}</p>
          {opportunity.sourceOccurrences.length ? (
            opportunity.sourceOccurrences.map((source, index) => (
              <article
                key={`${source.sourceId}-${index}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
              >
                <div>
                  <p className="font-medium">
                    {catalog.data?.find((item) => item.id === source.sourceId)?.name ??
                      (source.sourceId === "manual" ? copy.manualImport : source.sourceId)}{" "}
                    {source.primary && <Badge intent="primary">{copy.primary}</Badge>}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {sourceStatusLabels[locale][source.status]}
                    {source.lastSeenAt
                      ? ` · ${copy.checked} ${formatOpportunityDate(source.lastSeenAt, locale)}`
                      : ""}
                  </p>
                </div>
                {/^https?:\/\//.test(source.url) && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" />
                      {copy.openPublication}
                    </a>
                  </Button>
                )}
              </article>
            ))
          ) : (
            <EmptyState title={copy.manualRecord} />
          )}
        </section>
      )}
      <Modal open={reporting} onOpenChange={setReporting} title={copy.reportProblem}>
        <ReportForm id={id} onSent={() => setReporting(false)} locale={locale} copy={copy} />
      </Modal>
    </div>
  );
}

function PrivateNotes({
  opportunity,
  onSave,
  pending,
  copy
}: {
  opportunity: OpportunityRecord;
  onSave: (value: Record<string, unknown>) => void;
  pending: boolean;
  copy: WorkspaceCopy;
}) {
  const [body, setBody] = useState(
    opportunity.personalState?.notes.map((note) => note.body).join("\n\n") ?? ""
  );
  const [tags, setTags] = useState(opportunity.personalState?.tags.join(", ") ?? "");
  return (
    <section className="space-y-4 rounded-lg border bg-card p-5">
      <p className="text-sm text-muted-foreground">{copy.notesHint}</p>
      <label className="block text-sm font-medium">
        {copy.privateNote}
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={5000}
          className="mt-2 min-h-48"
        />
      </label>
      <label className="block text-sm font-medium">
        {copy.tagsComma}
        <Input className="mt-2" value={tags} onChange={(event) => setTags(event.target.value)} />
      </label>
      <Button
        loading={pending}
        onClick={() =>
          onSave({
            notes: body.trim() ? [{ body: body.trim(), createdAt: new Date().toISOString() }] : [],
            tags: tags
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          })
        }
      >
        {copy.savePrivateData}
      </Button>
    </section>
  );
}
function Comments({
  opportunityId,
  locale,
  copy
}: {
  opportunityId: string;
  locale: OpportunityLocale;
  copy: WorkspaceCopy;
}) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const query = useQuery({
    queryKey: ["comments", opportunityId],
    queryFn: () => api.get<Comment[]>(`/opportunities/${opportunityId}/comments`)
  });
  const mutation = useMutation({
    mutationFn: (commentId?: string) =>
      commentId
        ? api.delete(`/opportunities/${opportunityId}/comments/${commentId}`)
        : api.post(`/opportunities/${opportunityId}/comments`, { body: body.trim() }),
    onSuccess: () => {
      setBody("");
      client.invalidateQueries({ queryKey: ["comments", opportunityId] });
    },
    onError: (error) => toast.error(error.message)
  });
  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">{copy.discussionHint}</p>
      {query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : (
        query.data?.map((comment) => (
          <article key={comment.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <p>
                {comment.authorEmail} · {formatOpportunityDate(comment.createdAt, locale)}
              </p>
              {(comment.authorId === user?.id || user?.role === "Admin") && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(comment.id)}
                >
                  {copy.delete}
                </Button>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{comment.body}</p>
          </article>
        ))
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(undefined);
        }}
        className="rounded-lg border bg-card p-4"
      >
        <Textarea
          aria-label={copy.commentAria}
          placeholder={copy.commentPlaceholder}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={5000}
        />
        <Button className="mt-3" type="submit" loading={mutation.isPending} disabled={!body.trim()}>
          {copy.publishComment}
        </Button>
      </form>
    </section>
  );
}
function ReportForm({
  id,
  onSent,
  copy
}: {
  id: string;
  onSent: () => void;
  locale: OpportunityLocale;
  copy: WorkspaceCopy;
}) {
  const [type, setType] = useState("wrong_data");
  const [comment, setComment] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.post(`/opportunities/${id}/report`, { type, comment }),
    onSuccess: () => {
      toast.success(copy.reportSent);
      onSent();
    },
    onError: (error) => toast.error(error.message)
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <select
        className={`${selectClass} w-full`}
        aria-label={copy.reportTypeAria}
        value={type}
        onChange={(event) => setType(event.target.value)}
      >
        {Object.entries(copy.reportTypes).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Textarea
        aria-label={copy.reportDescriptionAria}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={2000}
      />
      <Button type="submit" loading={mutation.isPending}>
        {copy.send}
      </Button>
    </form>
  );
}
