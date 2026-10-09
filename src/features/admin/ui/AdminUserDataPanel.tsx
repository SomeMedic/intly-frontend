"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, ArrowRight, Bot, Database, Eye, FileText, FolderKanban, ListChecks, Loader2, RefreshCcw, Search, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { documentToMarkdown } from "@/components/intly/rich-text-editor";
import {
  adminUserInspectorApi,
  adminUserInspectorSections,
  aiUsageCostState,
  compactInspectorLabel,
  extractAiUsageSummary,
  inspectorItemId,
  pickInspectorTitle,
  redactInspectorValue,
  type AdminUserInspectorItem,
  type AdminUserInspectorOverview,
  type AdminUserInspectorSection,
} from "../api/admin-user-inspector-api";
import type { AdminLocale, Localized } from "./admin-locale";
import { commonAdminCopy, useAdminLocale } from "./admin-locale";

const sectionIcons: Record<AdminUserInspectorSection, typeof UserRound> = {
  profiles: UserRound,
  resumes: FileText,
  adaptations: RefreshCcw,
  knowledge: Database,
  watchlists: ListChecks,
  opportunities: Search,
  responses: FileText,
  tasks: Activity,
  boards: FolderKanban,
  aiRuns: Bot,
};

type InspectorCopy = {
  title: string;
  description: string;
  chooseUser: string;
  overview: string;
  currentMonth: string;
  aiRuns: string;
  aiCost: string;
  unknownCost: string;
  knownCost: string;
  costUnknownRun: string;
  costUnknownRuns: string;
  period: string;
  section: string;
  inspect: string;
  detailTitle: string;
  detailDescription: string;
  emptySection: string;
  loadError: string;
  contentError: string;
  previous: string;
  next: string;
  page: string;
  loading: string;
  itemId: string;
  metadata: string;
  noPreview: string;
  noReadableContent: string;
  readOnly: string;
  booleanLabels: { true: string; false: string };
  fields: Record<string, string>;
  counts: Record<AdminUserInspectorSection | "watchlistHits" | "opportunityStates" | "tasksAssigned" | "tasksReported", string>;
  sections: Record<AdminUserInspectorSection, string>;
};

const inspectorCopy: Localized<InspectorCopy> = {
  ru: {
    title: "Данные пользователя",
    description: "Просмотр личных данных выбранного пользователя: профили, резюме, отклики, задачи, база знаний и AI-история. Записи открываются только для чтения.",
    chooseUser: "Выберите пользователя, чтобы открыть инспектор данных.",
    overview: "Сводка",
    currentMonth: "Текущий месяц",
    aiRuns: "AI-запуски",
    aiCost: "Стоимость AI",
    unknownCost: "Стоимость неизвестна",
    knownCost: "Известная стоимость",
    costUnknownRun: "запуск без стоимости",
    costUnknownRuns: "запусков без стоимости",
    period: "Период",
    section: "Раздел данных",
    inspect: "Открыть содержимое",
    detailTitle: "Содержимое записи",
    detailDescription: "Запись показана полностью и доступна только для просмотра.",
    emptySection: "В этом разделе нет записей пользователя.",
    loadError: "Не удалось загрузить раздел инспектора.",
    contentError: "Не удалось загрузить содержимое записи.",
    previous: "Назад",
    next: "Далее",
    page: "Страница",
    loading: "Загрузка данных пользователя…",
    itemId: "ID записи",
    metadata: "Метаданные",
    noPreview: "Нет полей для предпросмотра.",
    noReadableContent: "Текст и заполненные поля отсутствуют. Сведения о записи доступны в метаданных.",
    readOnly: "Только чтение",
    booleanLabels: { true: "Да", false: "Нет" },
    fields: {
      documentJson: "Документ", markdownCache: "Текст документа", extractedText: "Текст документа", structuredExperienceSummary: "Опыт работы", structuredOutput: "Результат AI",
      id: "ID", _id: "ID", title: "Название", name: "Имя", summary: "Описание", status: "Статус", pipelineStatus: "Статус воронки", taskType: "Тип задачи", type: "Тип", kind: "Вид", profileId: "ID профиля", opportunityId: "ID возможности", provider: "Провайдер", modelId: "Модель", updatedAt: "Обновлено", createdAt: "Создано",
      targetRoles: "Целевые роли", seniority: "Уровень", technologies: "Технологии", compensationPreferences: "Ожидания по оплате", locations: "Локации", remotePreferences: "Удалённая работа", employmentTypes: "Тип занятости", sourceIds: "Источники", matchWeights: "Вес критериев", aiPreferences: "AI-настройки", profile: "Профиль", min: "От", max: "До", currency: "Валюта", period: "Период", money: "Матч по оплате", remoteLocation: "Локация и формат работы", employment: "Занятость", freshness: "Свежесть", source: "Источник", language: "Язык", coverLetter: "Сопроводительное письмо", customPrompt: "Дополнительный промпт", userPreferences: "Предпочтения пользователя", promptPreview: "Предпросмотр промпта",
      headline: "Заголовок", skills: "Навыки", experience: "Опыт", projects: "Проекты", education: "Образование", languages: "Языки", links: "Ссылки",
      content: "Содержимое", text: "Текст", body: "Текст", description: "Описание", resume: "Резюме", response: "Отклик", opportunity: "Возможность", paragraphs: "Абзацы", metadata: "Метаданные", currentMonthAiUsage: "AI за месяц", inputTokens: "Входные токены", outputTokens: "Выходные токены", totalTokens: "Всего токенов", estimatedCost: "Оценка стоимости"
    },
    counts: {
      profiles: "Профили",
      resumes: "Резюме",
      adaptations: "Адаптации",
      knowledge: "База знаний",
      watchlists: "Правила",
      watchlistHits: "Срабатывания правил",
      opportunityStates: "Личные состояния возможностей",
      responses: "Отклики",
      tasks: "Задачи",
      tasksAssigned: "Назначено задач",
      tasksReported: "Создано задач",
      boards: "Доски",
      aiRuns: "AI-запуски",
      opportunities: "Возможности",
    },
    sections: {
      profiles: "Профили",
      resumes: "Резюме",
      adaptations: "Адаптации",
      knowledge: "База знаний",
      watchlists: "Правила",
      opportunities: "Возможности",
      responses: "Отклики",
      tasks: "Задачи",
      boards: "Доски",
      aiRuns: "AI-запуски",
    },
  },
  en: {
    title: "User data",
    description: "Review the selected user's personal data: profiles, resumes, responses, tasks, knowledge and AI history. Records are read-only.",
    chooseUser: "Select a user to open the data inspector.",
    overview: "Overview",
    currentMonth: "Current month",
    aiRuns: "AI runs",
    aiCost: "AI cost",
    unknownCost: "Cost unknown",
    knownCost: "Known cost",
    costUnknownRun: "run cost unknown",
    costUnknownRuns: "runs cost unknown",
    period: "Period",
    section: "Data section",
    inspect: "Open content",
    detailTitle: "Record content",
    detailDescription: "The record is shown in full and is available for viewing only.",
    emptySection: "This user has no records in this section.",
    loadError: "Could not load this inspector section.",
    contentError: "Could not load this record content.",
    previous: "Previous",
    next: "Next",
    page: "Page",
    loading: "Loading user data…",
    itemId: "Record ID",
    metadata: "Metadata",
    noPreview: "No preview fields available.",
    noReadableContent: "No text or populated fields are available. Record details are available in metadata.",
    readOnly: "Read-only",
    booleanLabels: { true: "Yes", false: "No" },
    fields: {
      documentJson: "Document", markdownCache: "Document text", extractedText: "Document text", structuredExperienceSummary: "Work experience", structuredOutput: "AI result",
      id: "ID", _id: "ID", title: "Title", name: "Name", summary: "Summary", status: "Status", pipelineStatus: "Pipeline status", taskType: "Task type", type: "Type", kind: "Kind", profileId: "Profile ID", opportunityId: "Opportunity ID", provider: "Provider", modelId: "Model", updatedAt: "Updated", createdAt: "Created",
      targetRoles: "Target roles", seniority: "Seniority", technologies: "Technologies", compensationPreferences: "Compensation preferences", locations: "Locations", remotePreferences: "Remote preferences", employmentTypes: "Employment types", sourceIds: "Sources", matchWeights: "Match weights", aiPreferences: "AI preferences", profile: "Profile", min: "From", max: "To", currency: "Currency", period: "Period", money: "Compensation match", remoteLocation: "Location and work format", employment: "Employment", freshness: "Freshness", source: "Source", language: "Language", coverLetter: "Cover letter", customPrompt: "Custom prompt", userPreferences: "User preferences", promptPreview: "Prompt preview",
      headline: "Headline", skills: "Skills", experience: "Experience", projects: "Projects", education: "Education", languages: "Languages", links: "Links",
      content: "Content", text: "Text", body: "Body", description: "Description", resume: "Resume", response: "Response", opportunity: "Opportunity", paragraphs: "Paragraphs", metadata: "Metadata", currentMonthAiUsage: "Monthly AI usage", inputTokens: "Input tokens", outputTokens: "Output tokens", totalTokens: "Total tokens", estimatedCost: "Estimated cost"
    },
    counts: {
      profiles: "Profiles",
      resumes: "Resumes",
      adaptations: "Adaptations",
      knowledge: "Knowledge",
      watchlists: "Watchlists",
      watchlistHits: "Watchlist hits",
      opportunityStates: "Personal opportunity states",
      responses: "Responses",
      tasks: "Tasks",
      tasksAssigned: "Assigned tasks",
      tasksReported: "Reported tasks",
      boards: "Boards",
      aiRuns: "AI runs",
      opportunities: "Opportunities",
    },
    sections: {
      profiles: "Profiles",
      resumes: "Resumes",
      adaptations: "Adaptations",
      knowledge: "Knowledge",
      watchlists: "Watchlists",
      opportunities: "Opportunities",
      responses: "Responses",
      tasks: "Tasks",
      boards: "Boards",
      aiRuns: "AI runs",
    },
  },
};

const previewKeys = ["title", "name", "summary", "status", "pipelineStatus", "taskType", "type", "kind", "profileId", "opportunityId", "provider", "modelId", "updatedAt", "createdAt"];

type SelectedInspectorItem = { section: AdminUserInspectorSection; id: string; title: string };

export function AdminUserDataPanel({ userId, userLabel, enabled = true, initialOverview }: { userId: string | null | undefined; userLabel?: string; enabled?: boolean; initialOverview?: AdminUserInspectorOverview }) {
  const locale = useAdminLocale();
  const text = inspectorCopy[locale];
  const common = commonAdminCopy[locale];
  const [section, setSection] = useState<AdminUserInspectorSection>("profiles");
  const [cursorsBySection, setCursorsBySection] = useState<Partial<Record<AdminUserInspectorSection, Array<string | null>>>>({ profiles: [null] });
  const [selected, setSelected] = useState<SelectedInspectorItem | null>(null);
  const cursorStack = cursorsBySection[section] ?? [null];
  const cursor = cursorStack.at(-1) ?? null;
  const canQuery = enabled && Boolean(userId);

  const overview = useQuery({
    queryKey: ["admin", "users", "inspector", userId, "overview"],
    queryFn: () => adminUserInspectorApi.overview(userId!),
    enabled: canQuery,
    initialData: initialOverview,
  });

  const page = useQuery({
    queryKey: ["admin", "users", "inspector", userId, section, cursor],
    queryFn: () => adminUserInspectorApi.list(userId!, section, { limit: 25, cursor }),
    enabled: canQuery,
  });

  const content = useQuery({
    queryKey: ["admin", "users", "inspector", userId, selected?.section, selected?.id, "content"],
    queryFn: () => adminUserInspectorApi.content(userId!, selected!.section, selected!.id),
    enabled: canQuery && Boolean(selected),
  });

  const overviewCards = useMemo(() => overview.data ? buildOverviewCards(overview.data, text, locale) : [], [locale, overview.data, text]);

  const selectSection = (next: AdminUserInspectorSection) => {
    setSection(next);
    setSelected(null);
    setCursorsBySection((value) => value[next] ? value : { ...value, [next]: [null] });
  };

  if (!userId) {
    return <section className="rounded-lg border bg-card p-[var(--card-padding)] text-sm text-muted-foreground">{text.chooseUser}</section>;
  }

  return (
    <section className="min-w-0 rounded-lg border bg-card p-[var(--card-padding)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 truncate text-lg font-semibold">{text.title}</h2>
            <Badge intent="primary">{text.readOnly}</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{userLabel ? `${userLabel} · ` : ""}{text.description}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { overview.refetch(); page.refetch(); }} disabled={!canQuery || overview.isFetching || page.isFetching}>
          {overview.isFetching || page.isFetching ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCcw className="size-4" />}
          {common.retry}
        </Button>
      </div>

      <div aria-live="polite" className="sr-only">{overview.isLoading || page.isLoading ? text.loading : page.isError ? text.loadError : ""}</div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {overview.isLoading ? <MetricSkeleton /> : null}
        {overview.isError ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{common.loadingError}</p> : null}
        {overviewCards.map((card) => <MetricCard key={card.label} label={card.label} value={card.value} hint={card.hint} muted={card.muted} />)}
      </div>

      <div className="mt-5">
        <label className="block text-xs font-medium text-muted-foreground" htmlFor="admin-user-inspector-section">{text.section}</label>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label={text.section}>
          {adminUserInspectorSections.map((item) => {
            const Icon = sectionIcons[item];
            return (
              <button key={item} type="button" aria-pressed={section === item} className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${section === item ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted"}`} onClick={() => selectSection(item)}>
                <Icon className="size-4" />{text.sections[item]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 min-w-0">
        {page.isLoading ? <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">{text.loading}</div> : null}
        {page.isError ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{text.loadError}</div> : null}
        {!page.isLoading && !page.isError && !page.data?.items.length ? <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">{text.emptySection}</div> : null}
        <div className="grid gap-3 lg:grid-cols-2">
          {(page.data?.items ?? []).map((item) => <InspectorItemCard key={inspectorItemId(item) ?? JSON.stringify(item)} item={item} section={section} locale={locale} text={text} onOpen={(next) => setSelected(next)} />)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{text.page} {cursorStack.length}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={cursorStack.length === 1 || page.isFetching} onClick={() => setCursorsBySection((value) => ({ ...value, [section]: cursorStack.slice(0, -1) }))}><ArrowLeft className="size-4" />{text.previous}</Button>
          <Button size="sm" variant="outline" disabled={!page.data?.nextCursor || page.isFetching} onClick={() => {
            const nextCursor = page.data?.nextCursor;
            if (nextCursor) setCursorsBySection((value) => ({ ...value, [section]: [...cursorStack, nextCursor] }));
          }}>{text.next}<ArrowRight className="size-4" /></Button>
        </div>
      </div>

      <Modal open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }} title={selected?.title ?? text.detailTitle} description={text.detailDescription} placement="drawer" wide>
        {content.isLoading ? <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">{text.loading}</div> : null}
        {content.isError ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{text.contentError}</div> : null}
        {content.data?.item ? <InspectorContent item={content.data.item} locale={locale} text={text} /> : null}
      </Modal>
    </section>
  );
}

function buildOverviewCards(overview: AdminUserInspectorOverview, text: InspectorCopy, locale: AdminLocale) {
  const cost = aiUsageCostState(overview.currentMonthAiUsage);
  const summary = extractAiUsageSummary(overview.currentMonthAiUsage);
  const nf = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US");
  const period = `${formatDate(overview.period.dateFrom, locale)} — ${formatDate(overview.period.dateTo, locale)}`;
  const tasksTotal = overview.counts.tasks;
  return [
    { label: text.counts.profiles, value: nf.format(overview.counts.profiles), hint: text.overview },
    { label: text.counts.opportunityStates, value: nf.format(overview.counts.opportunityStates), hint: statusBreakdown(overview.breakdowns.opportunitiesByPipelineStatus, locale) },
    { label: text.counts.responses, value: nf.format(overview.counts.responses), hint: text.overview },
    { label: text.aiRuns, value: nf.format(summary.runs), hint: text.currentMonth },
    { label: text.aiCost, value: cost.known ? cost.label : text.unknownCost, hint: [period, costCoverageHint(summary, text, locale)].filter(Boolean).join(" · "), muted: !cost.known },
    { label: text.counts.knowledge, value: nf.format(overview.counts.knowledge), hint: statusBreakdown(overview.breakdowns.knowledgeByStatus, locale) },
    { label: text.counts.watchlists, value: nf.format(overview.counts.watchlists), hint: `${text.counts.watchlistHits}: ${nf.format(overview.counts.watchlistHits)}` },
    { label: text.counts.tasks, value: nf.format(tasksTotal), hint: `${text.counts.tasksAssigned}: ${nf.format(overview.counts.tasksAssigned)} · ${text.counts.tasksReported}: ${nf.format(overview.counts.tasksReported)}` },
  ];
}


function costCoverageHint(summary: ReturnType<typeof extractAiUsageSummary>, text: InspectorCopy, locale: AdminLocale) {
  if (!summary.costUnknownRuns) return summary.estimatedCost === null ? text.unknownCost : text.knownCost;
  const numberFormat = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US");
  const unknownLabel = summary.costUnknownRuns === 1 ? text.costUnknownRun : text.costUnknownRuns;
  return summary.estimatedCost === null ? `${text.unknownCost} · ${numberFormat.format(summary.costUnknownRuns)} ${unknownLabel}` : `${text.knownCost} · ${numberFormat.format(summary.costUnknownRuns)} ${unknownLabel}`;
}

function statusBreakdown(value: Record<string, number>, locale: AdminLocale) {
  const entries = Object.entries(value);
  if (!entries.length) return "—";
  return entries.map(([key, count]) => `${localizedVisibleValue(key, locale)}: ${count}`).join(" · ");
}

function MetricSkeleton() {
  return Array.from({ length: 4 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-md border bg-muted/40" />);
}

function MetricCard({ label, value, hint, muted }: { label: string; value: string; hint?: string; muted?: boolean }) {
  return <div className="min-w-0 rounded-md border p-3"><p className="truncate text-xs text-muted-foreground">{label}</p><p className={`mt-1 truncate text-lg font-semibold ${muted ? "text-muted-foreground" : ""}`}>{value}</p>{hint ? <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{hint}</p> : null}</div>;
}

function InspectorItemCard({ item, section, locale, text, onOpen }: { item: AdminUserInspectorItem; section: AdminUserInspectorSection; locale: AdminLocale; text: InspectorCopy; onOpen: (item: SelectedInspectorItem) => void }) {
  const id = inspectorItemId(item);
  const rawTitle = pickInspectorTitle(item, section);
  const title = item.title || item.name || item.summary ? rawTitle : localizedVisibleValue(rawTitle, locale);
  const preview = previewEntries(item);
  return (
    <article className="min-w-0 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="min-w-0 truncate font-medium">{title}</h3>
          <p className="mt-1 break-all text-xs text-muted-foreground">{text.itemId}: {id ?? "—"}</p>
        </div>
        <Button size="sm" variant="outline" disabled={!id} onClick={() => id && onOpen({ section, id, title })}><Eye className="size-4" />{text.inspect}</Button>
      </div>
      {preview.length ? <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">{preview.map(([key, value]) => <div key={key} className="min-w-0 rounded-md bg-muted/40 p-2"><dt className="truncate text-muted-foreground">{fieldLabel(key, text, locale)}</dt><dd className="mt-0.5 break-words font-medium">{formatInspectorValue(value, locale, text)}</dd></div>)}</dl> : <p className="mt-3 text-sm text-muted-foreground">{text.noPreview}</p>}
    </article>
  );
}

function InspectorContent({ item, locale, text }: { item: AdminUserInspectorItem; locale: AdminLocale; text: InspectorCopy }) {
  const safe = redactInspectorValue(item) as Record<string, unknown>;
  const { primary } = buildInspectorReadableContent(safe, locale);
  return (
    <div className="space-y-4">
      {primary.length ? <div className="space-y-3">{primary.map((entry) => <DocumentReadBlock key={entry.key} label={fieldLabel(entry.key, text, locale)} value={entry.value} />)}</div> : <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">{text.noReadableContent}</p>}
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{text.metadata}</summary>
        <pre className="mt-3 max-h-[34rem] overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">{JSON.stringify(safe, null, 2)}</pre>
      </details>
    </div>
  );
}

function DocumentReadBlock({ label, value }: { label: string; value: string }) {
  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <h4 className="text-xs font-medium tracking-wide text-muted-foreground">{label}</h4>
      <div className="mt-3 max-h-[42rem] overflow-auto whitespace-pre-wrap break-words text-sm leading-7">{value}</div>
    </section>
  );
}

export function buildInspectorReadableContent(item: Record<string, unknown>, locale: AdminLocale) {
  const text = inspectorCopy[locale];
  const primary: Array<{ key: string; value: string }> = [];
  const primaryKeys = new Set<string>();
  const documentText = richDocumentText(item.documentJson) ?? structuredResumeText(item.documentJson, locale, text);
  if (documentText) {
    primary.push({ key: "documentJson", value: documentText });
    primaryKeys.add("documentJson");
    primaryKeys.add("markdownCache");
  }
  for (const key of ["content", "text", "body", "description", "summary", "response", "resume", "opportunity", "extractedText", "structuredExperienceSummary"]) {
    if (primaryKeys.has(key)) continue;
    const value = item[key];
    const textValue = readablePrimaryText(value, locale, text);
    if (textValue) {
      primary.push({ key, value: textValue });
      primaryKeys.add(key);
    }
  }
  const structuredProfile = structuredProfileText(item, locale, text, primaryKeys);
  if (structuredProfile) primary.push({ key: "profile", value: structuredProfile });
  if (!primary.length) {
    const fallback = fallbackStructuredText(item, locale, text);
    if (fallback) primary.push({ key: "content", value: fallback });
  }
  return { primary };
}

const importantReadableKeys = new Set([
  "targetRoles",
  "seniority",
  "technologies",
  "compensationPreferences",
  "locations",
  "remotePreferences",
  "employmentTypes",
  "sourceIds",
  "matchWeights",
  "aiPreferences",
  "structuredExperienceSummary",
]);

const technicalPrimaryKeys = new Set(["id", "_id", "userId", "createdAt", "updatedAt", "deletedAt", "revision", "__v", "profileId"]);

function structuredProfileText(item: Record<string, unknown>, locale: AdminLocale, text: InspectorCopy, usedKeys: Set<string>) {
  const lines = Array.from(importantReadableKeys).flatMap((key) => {
    if (usedKeys.has(key) || !(key in item)) return [];
    const value = readableStructuredValue(item[key], locale, text);
    return value ? [`${fieldLabel(key, text, locale)}: ${value}`] : [];
  });
  return lines.length ? lines.join("\n") : null;
}

function fallbackStructuredText(item: Record<string, unknown>, locale: AdminLocale, text: InspectorCopy) {
  const lines = Object.entries(item).flatMap(([key, value]) => {
    if (technicalPrimaryKeys.has(key)) return [];
    const formatted = readableStructuredValue(value, locale, text);
    return formatted ? [`${fieldLabel(key, text, locale)}: ${formatted}`] : [];
  });
  return lines.length ? lines.join("\n") : null;
}

function richDocumentText(value: unknown) {
  if (!isRecordValue(value) || value.type !== "doc") return null;
  const markdown = documentToMarkdown(value);
  return markdown.trim() || null;
}

function structuredResumeText(value: unknown, locale: AdminLocale, text: InspectorCopy) {
  if (!isRecordValue(value) || value.type === "doc") return null;
  const priority = ["headline", "summary", "skills", "experience", "projects", "education", "languages", "links"];
  const keys = [...priority, ...Object.keys(value).filter((key) => !priority.includes(key) && !technicalPrimaryKeys.has(key))];
  const lines = keys.flatMap((key) => {
    if (!(key in value)) return [];
    const formatted = readableStructuredValue(value[key], locale, text);
    return formatted ? [`${fieldLabel(key, text, locale)}: ${formatted}`] : [];
  });
  return lines.length ? lines.join("\n") : null;
}

function readablePrimaryText(value: unknown, locale: AdminLocale, text: InspectorCopy): string | null {
  if (typeof value === "string") return localizedVisibleValue(value.trim(), locale) || null;
  const documentText = richDocumentText(value);
  if (documentText) return documentText;
  if (Array.isArray(value)) {
    const parts = value.flatMap((item) => {
      const formatted = readableStructuredValue(item, locale, text);
      return formatted ? [formatted] : [];
    });
    return parts.length ? parts.join("\n") : null;
  }
  if (isRecordValue(value)) {
    const direct = ["content", "text", "body", "description", "summary", "title", "name"].flatMap((key) => typeof value[key] === "string" && value[key].trim() ? [localizedVisibleValue(value[key].trim(), locale)] : []);
    if (direct.length) return direct.join("\n\n");
    return readableStructuredValue(value, locale, text);
  }
  return null;
}

function readableStructuredValue(value: unknown, locale: AdminLocale, text: InspectorCopy): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return localizedVisibleValue(value, locale);
  if (typeof value === "number") return Number.isFinite(value) ? new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US").format(value) : null;
  if (typeof value === "boolean") return text.booleanLabels[value ? "true" : "false"];
  if (Array.isArray(value)) {
    const parts = value.flatMap((item) => {
      const formatted = readableStructuredValue(item, locale, text);
      return formatted ? [formatted] : [];
    });
    return parts.length ? parts.join(", ") : null;
  }
  if (isRecordValue(value)) {
    if (typeof value.text === "string" && Object.keys(value).every((key) => ["id", "text"].includes(key))) return localizedVisibleValue(value.text, locale);
    if (typeof value.label === "string" && typeof value.url === "string") return `${localizedVisibleValue(value.label, locale)} (${value.url})`;
    const lines = Object.entries(value).flatMap(([key, item]) => {
      if (key === "id" && "text" in value) return [];
      const formatted = readableStructuredValue(item, locale, text);
      return formatted ? [`${fieldLabel(key, text, locale)}: ${formatted}`] : [];
    });
    return lines.length ? lines.join("; ") : null;
  }
  return null;
}

function previewEntries(item: AdminUserInspectorItem) {
  const safe = redactInspectorValue(item) as Record<string, unknown>;
  return previewKeys.flatMap((key) => key in safe ? [[key, safe[key]] as const] : []).slice(0, 8);
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fieldLabel(key: string, text: InspectorCopy, locale: AdminLocale) {
  if (/^\d+$/.test(key)) return `#${key}`;
  const known = text.fields[key];
  if (known) return known;
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!words) return key;
  return locale === "ru" ? words : words.charAt(0).toUpperCase() + words.slice(1);
}

function formatInspectorValue(value: unknown, locale: AdminLocale, text: InspectorCopy, maxLength = 220) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return text.booleanLabels[value ? "true" : "false"];
  if (typeof value === "string" && looksLikeDate(value)) return formatDate(value, locale);
  if (typeof value === "string") {
    const localized = localizedVisibleValue(value, locale);
    return localized.length > maxLength && maxLength > 0 ? `${localized.slice(0, maxLength - 1)}…` : localized;
  }
  const compact = compactInspectorLabel(value, maxLength || 0);
  return maxLength > 0 && compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}…` : compact;
}

function localizedVisibleValue(value: string, locale: AdminLocale) {
  const labels: Record<AdminLocale, Record<string, string>> = {
    ru: {
      draft: "Черновик", base: "Базовое", career: "Карьерное", mixed: "Смешанный", New: "Новая", new: "Новая", Reviewed: "Просмотрено", Shortlisted: "Интересно", Indexed: "Проиндексировано", indexed: "Проиндексировано", completed: "Завершено", complete: "Завершено", pending: "Ожидает", Pending: "Ожидает", processing: "Обрабатывается", Processing: "Обрабатывается", other: "Другое", Other: "Другое", failed: "Ошибка", Failed: "Ошибка", active: "Активно", archived: "В архиве",
      ru: "Русский", en: "Английский", intern: "Стажёр", junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead", principal: "Principal", remote: "Удалённо", hybrid: "Гибрид", office: "Офис", month: "месяц", hour: "час", day: "день", week: "неделя", year: "год", project: "проект", full_time: "Полная занятость", "full-time": "Полная занятость", part_time: "Частичная занятость", "part-time": "Частичная занятость", contract: "Контракт", contractor: "Контрактор",
      opportunity_analysis: "Анализ возможности", response_generation: "Подготовка отклика", resume_adaptation: "Адаптация резюме", document_extraction: "Обработка документа", tender_document_analysis: "Анализ тендерного документа", editor_transform: "Редактирование текста"
    },
    en: {
      draft: "Draft", base: "Base", career: "Career", mixed: "Mixed", New: "New", new: "New", Reviewed: "Reviewed", Shortlisted: "Interested", Indexed: "Indexed", indexed: "Indexed", completed: "Completed", complete: "Complete", pending: "Pending", Pending: "Pending", processing: "Processing", Processing: "Processing", other: "Other", Other: "Other", failed: "Failed", Failed: "Failed", active: "Active", archived: "Archived",
      ru: "Russian", en: "English", intern: "Intern", junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead", principal: "Principal", remote: "Remote", hybrid: "Hybrid", office: "Office", month: "month", hour: "hour", day: "day", week: "week", year: "year", project: "project", full_time: "Full-time", "full-time": "Full-time", part_time: "Part-time", "part-time": "Part-time", contract: "Contract", contractor: "Contractor",
      opportunity_analysis: "Opportunity analysis", response_generation: "Response generation", resume_adaptation: "Resume adaptation", document_extraction: "Document processing", tender_document_analysis: "Tender document analysis", editor_transform: "Text editing"
    },
  };
  return labels[locale][value] ?? value;
}

function formatDate(value: string, locale: AdminLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function looksLikeDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}
