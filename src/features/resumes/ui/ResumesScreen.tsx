"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult
} from "@tanstack/react-query";
import { Check, Download, Eye, FileEdit, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/intly/app-shell";
import { BrandArt } from "@/components/intly/brand";
import { EmptyState } from "@/components/intly/empty-state";
import { ErrorState } from "@/components/intly/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth";
import { useProfiles } from "@/features/profiles";
import { downloadStoredFile } from "@/services/files/download-file";
import { ApiError } from "@/services/api";
import { resumesApi } from "../api/resumes-api";
import { useAdaptationDraft } from "../model/use-adaptation-draft";
import { useReorderUndo } from "../model/use-reorder-undo";
import { ResumePreview } from "./ResumePreview";
import {
  isResumeListObject,
  parseResumeList,
  resumeItemText as itemText,
  resumeListText as stringList
} from "../resume-list-editor";
import {
  emptyResumeDocument,
  type ExportFormat,
  type Resume,
  type ResumeAdaptation,
  type ResumeDocumentJson,
  type ResumeOpportunityOption,
  type ResumeSuggestion
} from "../contracts";
import {
  adaptationFailureLabel,
  adaptationStatusLabels,
  pendingSuggestionLabel,
  resolveResumeLocale,
  resumeKindLabels,
  resumeStatusLabels,
  suggestionStatusLabels,
  type ResumeLocale
} from "../resume-labels";

const selectClass =
  "h-[var(--control-height)] rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const resumeCopy = {
  ru: {
    title: "Резюме и адаптации",
    subtitle:
      "Базовые резюме остаются источником правды. Адаптации создаются отдельно под конкретные возможности и проходят проверку перед экспортом.",
    createAdaptation: "Создать адаптацию",
    baseResume: "Базовое резюме",
    tabsAria: "Разделы резюме",
    baseTab: "Базовые резюме",
    adaptationsTab: "Адаптации",
    trashTab: "Удалённые",
    trashTitle: "Удалённые адаптации",
    trashHint: "Здесь можно восстановить текст и решения по AI-предложениям.",
    emptyTrashTitle: "Удалённых адаптаций нет",
    emptyTrashHint: "Удалённые адаптации будут появляться здесь для восстановления.",
    deletedOn: "Удалено",
    restore: "Восстановить",
    restored: "Адаптация восстановлена",
    delete: "Удалить адаптацию",
    deleteTitle: "Переместить адаптацию в удалённые?",
    deleteHint: "Вы сможете восстановить эту адаптацию. Базовое резюме остаётся доступным.",
    deleteGeneratingHint:
      "Текущая AI-генерация будет отменена. При восстановлении вы сможете продолжить редактирование вручную.",
    deleteBlocked: "Сначала сохраните правки или загрузите актуальную версию.",
    keepAdaptation: "Оставить адаптацию",
    confirmDelete: "Переместить в удалённые",
    deleted: "Адаптация перемещена в удалённые",
    undoReorder: "Отменить перестановку",
    reorderUndone: "Порядок восстановлен, текст сохранён",
    reorderUnavailable: "Порядок уже изменился. Обновите адаптацию.",
    lifecycleConflict:
      "Адаптация изменилась в другой сессии. Список обновлён; проверьте актуальную версию и повторите действие.",
    profileFilter: "Фильтр по профилю",
    allProfiles: "Все профили",
    newBaseTitle: "Новое базовое резюме",
    createAdaptationTitle: "Создать AI-адаптацию",
    createAdaptationDescription:
      "Выберите вакансию или заказ и базовое резюме. AI создаст отдельную копию для проверки.",
    loadingResumes: "Загружаем резюме…",
    emptyResumesTitle: "Нет базовых резюме",
    emptyResumesDescription: "Создайте первое резюме или импортируйте документ в базу знаний.",
    version: "версия",
    resumeFallback: "Заполните краткое описание, навыки и опыт.",
    loadingAdaptations: "Загружаем адаптации…",
    emptyAdaptationsTitle: "Адаптаций пока нет",
    emptyAdaptationsDescription:
      "Создайте версию под конкретную возможность, затем проверьте предложенные правки перед экспортом.",
    resumeEditor: "Редактор базового резюме",
    resumeEditorHint: "Базовое резюме используется как источник для новых адаптаций.",
    savedResume: "Резюме сохранено",
    save: "Сохранить",
    savedAdaptation: "Адаптация сохранена",
    decisionSaved: "Решение сохранено",
    exportReady: "Экспорт готов",
    adaptation: "Адаптация",
    opportunity: "возможность",
    linkedOpportunity: "Связанная возможность",
    unavailableOpportunity: "Возможность недоступна",
    aiSuggestions: "AI-предложения",
    aiSuggestionFallback: "AI предложил структурное изменение резюме.",
    noSuggestions: "Предложения появятся после завершения AI-анализа.",
    noSuggestionsReady: "AI-предложений нет. Вы можете отредактировать резюме вручную.",
    accept: "Принять",
    reject: "Отклонить",
    saveAdaptation: "Сохранить адаптацию",
    baseCreated: "Базовое резюме создано",
    create: "Создать",
    adaptationCreated: "Адаптация создана, AI-анализ запущен",
    opportunityId: "Возможность",
    opportunityPlaceholder: "Поиск по роли, компании или навыку",
    opportunitySearchLoading: "Ищем возможности…",
    opportunityEmpty: "Подходящих вакансий и заказов не найдено",
    opportunityNoProfile: "Выберите профиль, чтобы увидеть доступные вакансии и фриланс-заказы.",
    opportunitySearchError: "Не удалось загрузить возможности.",
    opportunityRetry: "Повторить",
    opportunityUnsupported:
      "Для адаптации резюме доступны только вакансии и фриланс-заказы. Тендеры используют отдельный workflow.",
    selectedOpportunity: "Выбрана возможность",
    localeVacancy: "Вакансия",
    localeFreelance: "Проект",
    localeTender: "Тендер",
    profile: "Профиль",
    additionalAiInstruction: "Дополнительная инструкция AI",
    name: "Название",
    unbound: "Без привязки",
    status: "Статус",
    aiExportText: "Дополнительная текстовая версия",
    aiExportPlaceholder: "Необязательно. AI получит этот текст вместе с разделами резюме.",
    adaptationStatus: "Статус адаптации",
    exportText: "Запасная текстовая версия",
    exportTextHint: "Используется для экспорта, если разделы резюме не заполнены.",
    preview: "Предпросмотр",
    edit: "Редактировать",
    previewHint: "Проверьте текст и порядок разделов перед скачиванием.",
    headline: "Заголовок",
    summary: "Краткое описание",
    skills: "Навыки",
    experience: "Опыт",
    projects: "Проекты",
    education: "Образование",
    languages: "Языки",
    links: "Ссылки",
    oneItemPerLine: "Один пункт на строку",
    noProfile: "Без профиля",
    suggestionEvidence: "Подтверждение",
    suggestionSection: "Раздел",
    autosaving: "Автосохранение…",
    autosaved: "Изменения сохранены",
    unsavedChanges: "Есть несохранённые изменения",
    autosaveFailed: "Не удалось автосохранить адаптацию",
    localRecovery: "Восстановлены несохранённые правки из этого браузера.",
    saveErrorHint: "Правки остаются в редакторе. Проверьте соединение и сохраните ещё раз.",
    localDraftSaved: "Несохранённые правки сохранены в этом браузере.",
    localDraftUnavailable: "Локальная копия недоступна. Оставьте редактор открытым до сохранения.",
    conflictTitle: "Адаптация изменилась в другой сессии",
    conflictHint:
      "Ваши правки остаются в редакторе. Скопируйте нужный текст перед загрузкой актуальной версии.",
    loadLatest: "Загрузить актуальную версию",
    discardTitle: "Загрузить версию с сервера?",
    discardHint:
      "Несохранённые правки в этой адаптации будут заменены версией с сервера. Скопируйте нужный текст перед продолжением.",
    cancel: "Оставить мои правки",
    context: "Исходное резюме и возможность",
    contextHint: "Исходное резюме не меняется. Здесь вы редактируете отдельную адаптацию.",
    manualEditor: "Адаптированное резюме",
    chooseAdaptation: "Выбрать адаптацию",
    generatingHint: "Дождитесь завершения генерации, чтобы редактировать адаптацию.",
    exportUnavailable: "Экспорт будет доступен после готовности адаптации.",
    adaptationFailed: "AI не смог подготовить адаптацию.",
    fallbackResumeTitle: "Базовое резюме"
  },
  en: {
    title: "Resumes and adaptations",
    subtitle:
      "Base resumes stay the source of truth. Adaptations are created separately for specific opportunities and reviewed before export.",
    createAdaptation: "Create adaptation",
    baseResume: "Base resume",
    tabsAria: "Resume sections",
    baseTab: "Base resumes",
    adaptationsTab: "Adaptations",
    trashTab: "Deleted",
    trashTitle: "Deleted adaptations",
    trashHint: "Restore your resume text and AI suggestion decisions here.",
    emptyTrashTitle: "No deleted adaptations",
    emptyTrashHint: "Deleted adaptations will appear here for recovery.",
    deletedOn: "Deleted",
    restore: "Restore",
    restored: "Adaptation restored",
    delete: "Delete adaptation",
    deleteTitle: "Move this adaptation to deleted?",
    deleteHint: "You can restore this adaptation later. Your base resume stays available.",
    deleteGeneratingHint:
      "The current AI generation will be cancelled. After restoring, you can continue editing manually.",
    deleteBlocked: "Save your edits or load the latest version first.",
    keepAdaptation: "Keep adaptation",
    confirmDelete: "Move to deleted",
    deleted: "Adaptation moved to deleted",
    undoReorder: "Undo reorder",
    reorderUndone: "Order restored, text preserved",
    reorderUnavailable: "The order has changed. Refresh this adaptation.",
    lifecycleConflict:
      "This adaptation changed in another session. The list has been refreshed; review the latest version and try again.",
    profileFilter: "Profile filter",
    allProfiles: "All profiles",
    newBaseTitle: "New base resume",
    createAdaptationTitle: "Create AI adaptation",
    createAdaptationDescription:
      "Choose a vacancy or project and a base resume. AI will create a separate copy for review.",
    loadingResumes: "Loading resumes…",
    emptyResumesTitle: "No base resumes",
    emptyResumesDescription:
      "Create your first resume or import a document into the knowledge base.",
    version: "version",
    resumeFallback: "Fill in the summary, skills, and experience.",
    loadingAdaptations: "Loading adaptations…",
    emptyAdaptationsTitle: "No adaptations yet",
    emptyAdaptationsDescription:
      "Create a version for a specific opportunity, then review suggested edits before export.",
    resumeEditor: "Base resume editor",
    resumeEditorHint: "The base resume is used as the source for new adaptations.",
    savedResume: "Resume saved",
    save: "Save",
    savedAdaptation: "Adaptation saved",
    decisionSaved: "Decision saved",
    exportReady: "Export ready",
    adaptation: "Adaptation",
    opportunity: "opportunity",
    linkedOpportunity: "Linked opportunity",
    unavailableOpportunity: "Opportunity unavailable",
    aiSuggestions: "AI suggestions",
    aiSuggestionFallback: "AI suggested a structured resume change.",
    noSuggestions: "Suggestions will appear after AI analysis completes.",
    noSuggestionsReady: "There are no AI suggestions. You can edit the resume manually.",
    accept: "Accept",
    reject: "Reject",
    saveAdaptation: "Save adaptation",
    baseCreated: "Base resume created",
    create: "Create",
    adaptationCreated: "Adaptation created, AI analysis started",
    opportunityId: "Opportunity",
    opportunityPlaceholder: "Search by role, company, or skill",
    opportunitySearchLoading: "Searching opportunities…",
    opportunityEmpty: "No matching vacancies or freelance projects found",
    opportunityNoProfile: "Choose a profile to see available vacancies and freelance projects.",
    opportunitySearchError: "Could not load opportunities.",
    opportunityRetry: "Retry",
    opportunityUnsupported:
      "Resume adaptation supports only vacancies and freelance projects. Tenders use a separate workflow.",
    selectedOpportunity: "Selected opportunity",
    localeVacancy: "Vacancy",
    localeFreelance: "Project",
    localeTender: "Tender",
    profile: "Profile",
    additionalAiInstruction: "Additional AI instruction",
    name: "Name",
    unbound: "Unbound",
    status: "Status",
    aiExportText: "Additional text version",
    aiExportPlaceholder: "Optional. AI receives this text together with the resume sections.",
    adaptationStatus: "Adaptation status",
    exportText: "Fallback text version",
    exportTextHint: "Used for export when the resume sections are empty.",
    preview: "Preview",
    edit: "Edit",
    previewHint: "Review the text and section order before downloading.",
    headline: "Headline",
    summary: "Summary",
    skills: "Skills",
    experience: "Experience",
    projects: "Projects",
    education: "Education",
    languages: "Languages",
    links: "Links",
    oneItemPerLine: "One item per line",
    noProfile: "No profile",
    suggestionEvidence: "Evidence",
    suggestionSection: "Section",
    autosaving: "Autosaving…",
    autosaved: "Changes saved",
    unsavedChanges: "Unsaved changes",
    autosaveFailed: "Could not autosave adaptation",
    localRecovery: "Unsaved edits were recovered from this browser.",
    saveErrorHint: "Your edits remain in the editor. Check your connection and save again.",
    localDraftSaved: "Unsaved edits are saved in this browser.",
    localDraftUnavailable:
      "Local recovery is unavailable. Keep the editor open until your changes are saved.",
    conflictTitle: "This adaptation changed in another session",
    conflictHint:
      "Your edits remain in the editor. Copy any text you need before loading the latest version.",
    loadLatest: "Load latest version",
    discardTitle: "Load the server version?",
    discardHint:
      "Unsaved edits in this adaptation will be replaced with the server version. Copy any text you need before continuing.",
    cancel: "Keep my edits",
    context: "Original resume and opportunity",
    contextHint: "The original resume stays unchanged. You are editing a separate adaptation.",
    manualEditor: "Adapted resume",
    chooseAdaptation: "Choose an adaptation",
    generatingHint: "Wait for generation to finish before editing the adaptation.",
    exportUnavailable: "Export will be available after the adaptation is ready.",
    adaptationFailed: "AI could not prepare this adaptation.",
    fallbackResumeTitle: "Base resume"
  }
} satisfies Record<ResumeLocale, Record<string, string>>;

type ResumeCopy = (typeof resumeCopy)[ResumeLocale];

export function ResumesScreen() {
  const params = useSearchParams();
  const directOpportunityId = params.get("opportunityId") ?? params.get("opportunity");
  const { user, bootstrapped } = useAuth();
  const locale = resolveResumeLocale(user?.settings.locale);
  const copy = resumeCopy[locale];
  const profiles = useProfiles();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"base" | "adaptations" | "trash">("base");
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [selectedAdaptationId, setSelectedAdaptationId] = useState<string | null>(null);
  const [creatingResume, setCreatingResume] = useState(false);
  const [creatingAdaptation, setCreatingAdaptation] = useState(false);
  const [profileFilter, setProfileFilter] = useState("");

  const resumes = useQuery({
    queryKey: ["resumes", user?.id, profileFilter],
    queryFn: () => resumesApi.listResumes({ kind: "base", profileId: profileFilter || undefined }),
    enabled: bootstrapped && !!user
  });
  const adaptations = useQuery({
    queryKey: ["resume-adaptations", user?.id, profileFilter],
    queryFn: () => resumesApi.listAdaptations({ profileId: profileFilter || undefined }),
    enabled: bootstrapped && !!user,
    refetchInterval: (query) =>
      query.state.data?.items.some((item) => item.status === "generating") ? 2500 : false
  });
  const trash = useQuery({
    queryKey: ["resume-adaptation-trash", user?.id, profileFilter],
    queryFn: () =>
      resumesApi.listAdaptations({ profileId: profileFilter || undefined, deleted: "only" }),
    enabled: bootstrapped && !!user && tab === "trash"
  });
  const linkedOpportunityIds = [
    ...new Set(
      [...(adaptations.data?.items ?? []), ...(trash.data?.items ?? [])].map(
        (item) => item.opportunityId
      )
    )
  ];
  const linkedOpportunities = useQueries({
    queries: linkedOpportunityIds.map((id) => ({
      queryKey: ["resume-opportunity", id],
      queryFn: () => resumesApi.getOpportunity(id),
      enabled: bootstrapped && !!user,
      staleTime: 300_000
    }))
  });
  const opportunityNames = Object.fromEntries(
    linkedOpportunityIds.map((id, index) => [
      id,
      linkedOpportunities[index].data?.title ||
        (linkedOpportunities[index].isError ? copy.unavailableOpportunity : copy.linkedOpportunity)
    ])
  );

  const selectedResume =
    resumes.data?.items.find((resume) => resume.id === selectedResumeId) ??
    resumes.data?.items[0] ??
    null;
  const selectedAdaptation =
    adaptations.data?.items.find((adaptation) => adaptation.id === selectedAdaptationId) ??
    adaptations.data?.items[0] ??
    null;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["resumes"] });
    queryClient.invalidateQueries({ queryKey: ["resume-adaptations"] });
    queryClient.invalidateQueries({ queryKey: ["resume-adaptation-trash"] });
  };

  return (
    <AppShell>
      <header className="intly-page-header mb-5 flex flex-col items-start justify-between gap-4 md:flex-row">
        <div className="flex w-full min-w-0 items-center gap-4 md:flex-1">
          <BrandArt kind="resume" className="w-16 shrink-0 sm:w-28" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">{copy.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{copy.subtitle}</p>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <Button variant="outline" onClick={() => setCreatingAdaptation(true)}>
            <Sparkles className="size-4" />
            {copy.createAdaptation}
          </Button>
          <Button onClick={() => setCreatingResume(true)}>
            <Plus className="size-4" />
            {copy.baseResume}
          </Button>
        </div>
      </header>

      <section className="intly-toolbar mb-5 flex flex-wrap items-center justify-between gap-3 p-3">
        <nav className="flex flex-wrap gap-2" aria-label={copy.tabsAria}>
          <Button variant={tab === "base" ? "secondary" : "ghost"} onClick={() => setTab("base")}>
            {copy.baseTab}
          </Button>
          <Button
            variant={tab === "adaptations" ? "secondary" : "ghost"}
            onClick={() => setTab("adaptations")}
          >
            {copy.adaptationsTab}
          </Button>
          <Button variant={tab === "trash" ? "secondary" : "ghost"} onClick={() => setTab("trash")}>
            <Trash2 className="size-4" />
            {copy.trashTab}
          </Button>
        </nav>
        <select
          className={selectClass}
          value={profileFilter}
          onChange={(event) => setProfileFilter(event.target.value)}
          aria-label={copy.profileFilter}
        >
          <option value="">{copy.allProfiles}</option>
          {profiles.data?.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </section>

      {tab === "base" ? (
        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_34rem]">
          <ResumeList
            query={resumes}
            selectedId={selectedResume?.id}
            onSelect={setSelectedResumeId}
            profiles={profiles.data ?? []}
            locale={locale}
            copy={copy}
          />
          {selectedResume ? (
            <ResumeEditor
              key={`${selectedResume.id}:${selectedResume.revision}`}
              resume={selectedResume}
              profiles={profiles.data ?? []}
              locale={locale}
              copy={copy}
              onSaved={refresh}
            />
          ) : null}
        </section>
      ) : tab === "trash" ? (
        <AdaptationTrash
          query={trash}
          resumes={resumes.data?.items ?? []}
          profiles={profiles.data ?? []}
          opportunityNames={opportunityNames}
          locale={locale}
          copy={copy}
          onRestored={(adaptation) => {
            queryClient.setQueryData<{ items: ResumeAdaptation[]; nextCursor: string | null }>(
              ["resume-adaptations", user?.id, profileFilter],
              (data) =>
                data
                  ? {
                      ...data,
                      items: [adaptation, ...data.items.filter((item) => item.id !== adaptation.id)]
                    }
                  : { items: [adaptation], nextCursor: null }
            );
            setSelectedAdaptationId(adaptation.id);
            setTab("adaptations");
            refresh();
          }}
        />
      ) : (
        <section className="space-y-5">
          <details className="intly-section p-4" open={!selectedAdaptation}>
            <summary className="cursor-pointer text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {copy.chooseAdaptation} · {adaptations.data?.items.length ?? 0}
            </summary>
            <div className="mt-4">
              <AdaptationList
                query={adaptations}
                selectedId={selectedAdaptation?.id}
                onSelect={setSelectedAdaptationId}
                resumes={resumes.data?.items ?? []}
                profiles={profiles.data ?? []}
                opportunityNames={opportunityNames}
                locale={locale}
                copy={copy}
              />
            </div>
          </details>
          {selectedAdaptation ? (
            <AdaptationEditor
              key={selectedAdaptation.id}
              adaptation={selectedAdaptation}
              profiles={profiles.data ?? []}
              resumes={resumes.data?.items ?? []}
              opportunityName={opportunityNames[selectedAdaptation.opportunityId]}
              locale={locale}
              copy={copy}
              onSaved={refresh}
              onDeleted={() => {
                queryClient.setQueriesData<{
                  items: ResumeAdaptation[];
                  nextCursor: string | null;
                }>({ queryKey: ["resume-adaptations"] }, (data) =>
                  data
                    ? {
                        ...data,
                        items: data.items.filter((item) => item.id !== selectedAdaptation.id)
                      }
                    : data
                );
                setSelectedAdaptationId(null);
                setTab("trash");
                refresh();
              }}
            />
          ) : null}
        </section>
      )}

      <Modal open={creatingResume} onOpenChange={setCreatingResume} title={copy.newBaseTitle} wide>
        <CreateResumeForm
          profiles={profiles.data ?? []}
          locale={locale}
          copy={copy}
          onCreated={(resume) => {
            setCreatingResume(false);
            setSelectedResumeId(resume.id);
            setTab("base");
            refresh();
          }}
        />
      </Modal>

      <Modal
        open={creatingAdaptation}
        onOpenChange={setCreatingAdaptation}
        title={copy.createAdaptationTitle}
        description={copy.createAdaptationDescription}
        wide
      >
        <CreateAdaptationForm
          profiles={profiles.data ?? []}
          resumes={resumes.data?.items ?? []}
          profileFilter={profileFilter}
          initialOpportunityId={directOpportunityId ?? undefined}
          copy={copy}
          onCreated={(adaptation) => {
            setCreatingAdaptation(false);
            setSelectedAdaptationId(adaptation.id);
            setTab("adaptations");
            refresh();
          }}
        />
      </Modal>
    </AppShell>
  );
}

function ResumeList({
  query,
  selectedId,
  onSelect,
  profiles,
  locale,
  copy
}: {
  query: UseQueryResult<{ items: Resume[]; nextCursor: string | null }, Error>;
  selectedId?: string;
  onSelect: (id: string) => void;
  profiles: Array<{ id: string; name: string }>;
  locale: ResumeLocale;
  copy: ResumeCopy;
}) {
  if (query.isPending) return <p className="text-muted-foreground">{copy.loadingResumes}</p>;
  if (query.isError)
    return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
  if (!query.data.items.length)
    return <EmptyState title={copy.emptyResumesTitle} description={copy.emptyResumesDescription} />;
  return (
    <div className="grid gap-3">
      {query.data.items.map((resume) => (
        <button
          key={resume.id}
          className="rounded-lg border bg-card p-4 text-left transition hover:border-primary/60 data-[active=true]:border-primary"
          data-active={resume.id === selectedId}
          onClick={() => onSelect(resume.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{resume.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {profileName(profiles, resume.profileId, copy)} · {copy.version} {resume.revision}
              </p>
            </div>
            <Badge
              intent={
                resume.status === "ready"
                  ? "success"
                  : resume.status === "archived"
                    ? "neutral"
                    : "warning"
              }
            >
              {resumeStatusLabels[locale][resume.status]}
            </Badge>
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {resume.documentJson.summary || resume.markdownCache || copy.resumeFallback}
          </p>
        </button>
      ))}
    </div>
  );
}

function AdaptationList({
  query,
  selectedId,
  onSelect,
  resumes,
  profiles,
  opportunityNames,
  locale,
  copy
}: {
  query: UseQueryResult<{ items: ResumeAdaptation[]; nextCursor: string | null }, Error>;
  selectedId?: string;
  onSelect: (id: string) => void;
  resumes: Resume[];
  profiles: Array<{ id: string; name: string }>;
  opportunityNames: Record<string, string>;
  locale: ResumeLocale;
  copy: ResumeCopy;
}) {
  if (query.isPending) return <p className="text-muted-foreground">{copy.loadingAdaptations}</p>;
  if (query.isError)
    return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
  if (!query.data.items.length)
    return (
      <EmptyState
        title={copy.emptyAdaptationsTitle}
        description={copy.emptyAdaptationsDescription}
      />
    );
  return (
    <div className="grid gap-3">
      {query.data.items.map((adaptation) => (
        <button
          key={adaptation.id}
          className="rounded-lg border bg-card p-4 text-left transition hover:border-primary/60 data-[active=true]:border-primary"
          data-active={adaptation.id === selectedId}
          onClick={() => onSelect(adaptation.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">
                {resumeTitle(resumes, adaptation.baseResumeId, copy)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {profileName(profiles, adaptation.profileId, copy)} ·{" "}
                {opportunityNames[adaptation.opportunityId] || copy.linkedOpportunity}
              </p>
            </div>
            <Badge
              intent={
                adaptation.status === "ready" || adaptation.status === "exported"
                  ? "success"
                  : adaptation.status === "failed"
                    ? "danger"
                    : "ai"
              }
            >
              {adaptationStatusLabels[locale][adaptation.status]}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {pendingSuggestionLabel(
              adaptation.suggestions.filter((item) => item.status === "pending").length,
              locale
            )}{" "}
            · {copy.version} {adaptation.revision}
          </p>
        </button>
      ))}
    </div>
  );
}

function AdaptationTrash({
  query,
  resumes,
  profiles,
  opportunityNames,
  locale,
  copy,
  onRestored
}: {
  query: UseQueryResult<{ items: ResumeAdaptation[]; nextCursor: string | null }, Error>;
  resumes: Resume[];
  profiles: Array<{ id: string; name: string }>;
  opportunityNames: Record<string, string>;
  locale: ResumeLocale;
  copy: ResumeCopy;
  onRestored: (adaptation: ResumeAdaptation) => void;
}) {
  const restore = useMutation({
    mutationFn: (adaptation: ResumeAdaptation) =>
      resumesApi.restoreAdaptation(adaptation.id, adaptation.revision),
    onSuccess: (saved) => {
      toast.success(copy.restored);
      onRestored(saved);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError && error.status === 409 ? copy.lifecycleConflict : error.message
      );
      void query.refetch();
    }
  });
  if (query.isPending) return <p className="text-muted-foreground">{copy.loadingAdaptations}</p>;
  if (query.isError)
    return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
  return (
    <section className="space-y-4" aria-label={copy.trashTitle}>
      <div>
        <h2 className="font-semibold">{copy.trashTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.trashHint}</p>
      </div>
      {!query.data.items.length ? (
        <EmptyState title={copy.emptyTrashTitle} description={copy.emptyTrashHint} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {query.data.items.map((adaptation) => (
            <article
              key={adaptation.id}
              className="min-w-0 space-y-3 rounded-lg border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words font-semibold">
                    {String(
                      adaptation.documentJson.headline ||
                        resumeTitle(resumes, adaptation.baseResumeId, copy)
                    )}
                  </h3>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {resumeTitle(resumes, adaptation.baseResumeId, copy)} ·{" "}
                    {profileName(profiles, adaptation.profileId, copy)}
                  </p>
                </div>
                <Badge intent="neutral">{copy.trashTab}</Badge>
              </div>
              <p className="break-words text-sm text-muted-foreground">
                {opportunityNames[adaptation.opportunityId] || copy.linkedOpportunity}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {copy.deletedOn}
                  {adaptation.deletedAt
                    ? ` ${new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(adaptation.deletedAt))}`
                    : ""}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restore.isPending}
                  loading={restore.isPending && restore.variables?.id === adaptation.id}
                  onClick={() => restore.mutate(adaptation)}
                >
                  <RotateCcw className="size-3.5" />
                  {copy.restore}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ResumeEditor({
  resume,
  profiles,
  locale,
  copy,
  onSaved
}: {
  resume: Resume;
  profiles: Array<{ id: string; name: string }>;
  locale: ResumeLocale;
  copy: ResumeCopy;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(resume.title);
  const [profileId, setProfileId] = useState(resume.profileId ?? "");
  const [status, setStatus] = useState<Resume["status"]>(resume.status);
  const [documentJson, setDocumentJson] = useState<ResumeDocumentJson>(
    normalizeDocument(resume.documentJson)
  );
  const [markdownCache, setMarkdownCache] = useState(resume.markdownCache ?? "");
  const update = useMutation({
    mutationFn: () =>
      resumesApi.updateResume(resume.id, {
        revision: resume.revision,
        profileId: profileId || null,
        title: title.trim(),
        documentJson,
        markdownCache,
        status
      }),
    onSuccess: () => {
      toast.success(copy.savedResume);
      onSaved();
    },
    onError: (error) => toast.error(error.message)
  });
  return (
    <section className="intly-section p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{copy.resumeEditor}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.version} {resume.revision}. {copy.resumeEditorHint}
          </p>
        </div>
        <Badge>{resumeKindLabels[locale][resume.kind]}</Badge>
      </div>
      <fieldset className="min-w-0" disabled={update.isPending}>
        <ResumeDocumentForm
          title={title}
          profileId={profileId}
          status={status}
          documentJson={documentJson}
          markdownCache={markdownCache}
          profiles={profiles}
          locale={locale}
          copy={copy}
          onTitleChange={setTitle}
          onProfileChange={setProfileId}
          onStatusChange={setStatus}
          onDocumentChange={setDocumentJson}
          onMarkdownChange={setMarkdownCache}
        />
      </fieldset>
      <div className="mt-4 flex gap-2">
        <Button loading={update.isPending} disabled={!title.trim()} onClick={() => update.mutate()}>
          {copy.save}
        </Button>
      </div>
    </section>
  );
}

function AdaptationEditor({
  adaptation,
  profiles,
  resumes,
  opportunityName,
  locale,
  copy,
  onSaved,
  onDeleted
}: {
  adaptation: ResumeAdaptation;
  profiles: Array<{ id: string; name: string }>;
  resumes: Resume[];
  opportunityName?: string;
  locale: ResumeLocale;
  copy: ResumeCopy;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { user } = useAuth();
  const draft = useAdaptationDraft({ adaptation, ownerId: user?.id ?? "", onSaved });
  const reorderUndo = useReorderUndo({ ownerId: user?.id ?? "", adaptationId: adaptation.id });
  const [contextOpen, setContextOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const externalLock = useRef(false);
  const decide = useMutation({
    mutationFn: async ({
      suggestion,
      decision
    }: {
      suggestion: ResumeSuggestion;
      decision: "accept" | "reject";
    }) => {
      if (externalLock.current || !draft.canAct()) throw new Error(copy.unsavedChanges);
      externalLock.current = true;
      try {
        const beforeDocument = structuredClone(draft.documentJson);
        const saved = await (decision === "accept"
          ? resumesApi.acceptSuggestion(adaptation.id, suggestion.id, draft.revision)
          : resumesApi.rejectSuggestion(adaptation.id, suggestion.id, draft.revision));
        draft.acceptServer(saved);
        if (decision === "accept")
          reorderUndo.capture(suggestion, beforeDocument, saved.documentJson);
        return saved;
      } finally {
        externalLock.current = false;
      }
    },
    onSuccess: () => {
      toast.success(copy.decisionSaved);
      onSaved();
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError && error.status === 409 ? copy.lifecycleConflict : error.message
      );
      onSaved();
    }
  });
  const undo = useMutation({
    mutationFn: async (suggestion: ResumeSuggestion) => {
      if (externalLock.current || !draft.canAct()) throw new Error(copy.unsavedChanges);
      const order = reorderUndo.getOrder(suggestion, draft.documentJson);
      if (!order) throw new Error(copy.reorderUnavailable);
      externalLock.current = true;
      try {
        const saved = await resumesApi.undoReorder(
          adaptation.id,
          suggestion.id,
          draft.revision,
          order
        );
        draft.acceptServer(saved);
        reorderUndo.remove(suggestion.id);
        return saved;
      } finally {
        externalLock.current = false;
      }
    },
    onSuccess: () => {
      toast.success(copy.reorderUndone);
      onSaved();
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError && error.status === 409 ? copy.lifecycleConflict : error.message
      );
      onSaved();
    }
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (externalLock.current || !draft.canAct()) throw new Error(copy.unsavedChanges);
      externalLock.current = true;
      try {
        return await resumesApi.deleteAdaptation(adaptation.id, draft.revision);
      } finally {
        externalLock.current = false;
      }
    },
    onSuccess: () => {
      setDeleteOpen(false);
      toast.success(copy.deleted);
      onDeleted();
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError && error.status === 409 ? copy.lifecycleConflict : error.message
      );
      onSaved();
    }
  });
  const exportFile = useMutation({
    mutationFn: async (format: ExportFormat) => {
      if (externalLock.current || !draft.canAct()) throw new Error(copy.unsavedChanges);
      externalLock.current = true;
      try {
        const exported = await resumesApi.exportAdaptation(adaptation.id, format, draft.revision);
        const saved = await resumesApi.getAdaptation(adaptation.id);
        draft.acceptServer(saved);
        await downloadStoredFile(exported.fileId, exported.filename);
        return exported;
      } finally {
        externalLock.current = false;
      }
    },
    onSuccess: () => {
      toast.success(copy.exportReady);
      onSaved();
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError && error.status === 409 ? copy.lifecycleConflict : error.message
      );
      onSaved();
    }
  });
  const update = useMutation({
    mutationFn: () => (externalLock.current ? Promise.resolve(null) : draft.save()),
    onSuccess: (saved) => {
      if (saved) toast.success(copy.savedAdaptation);
    }
  });
  const reload = useMutation({
    mutationFn: () => resumesApi.getAdaptation(adaptation.id),
    onSuccess: (saved) => {
      draft.reloadServer(saved);
      setDiscardOpen(false);
      onSaved();
    },
    onError: (error) => toast.error(error.message)
  });
  const actionPending =
    decide.isPending ||
    undo.isPending ||
    remove.isPending ||
    exportFile.isPending ||
    reload.isPending;
  const deleteBlocked =
    draft.dirty || draft.saving || !!draft.conflict || !!draft.error || actionPending;
  const actionBlocked = deleteBlocked || draft.status === "generating";
  const exportable = isAdaptationExportable(draft.status);
  const autosaveStatus = draft.saving
    ? copy.autosaving
    : draft.conflict
      ? copy.conflictTitle
      : draft.error
        ? copy.autosaveFailed
        : draft.dirty
          ? copy.unsavedChanges
          : copy.autosaved;
  const generationFailed =
    draft.status === "failed" ||
    adaptation.generation?.status === "failed" ||
    adaptation.generation?.status === "cancelled";
  const failureSummary = generationFailed
    ? adaptationFailureLabel(adaptation.generation?.errorSummary, locale)
    : null;
  const baseResume = resumes.find((resume) => resume.id === adaptation.baseResumeId);
  const suggestions = (
    <AdaptationSuggestions
      adaptation={adaptation}
      status={draft.status}
      failureSummary={failureSummary}
      locale={locale}
      copy={copy}
      blocked={actionBlocked}
      pending={decide.isPending || undo.isPending}
      onDecision={(suggestion, decision) => decide.mutate({ suggestion, decision })}
      canUndo={(suggestion) => reorderUndo.canUndo(suggestion, draft.documentJson)}
      onUndo={(suggestion) => undo.mutate(suggestion)}
    />
  );
  const context = (
    <AdaptationContext
      adaptation={adaptation}
      baseResume={baseResume}
      opportunityName={opportunityName}
      copy={copy}
    />
  );

  return (
    <section className="min-w-0 space-y-4">
      <header className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="break-words font-semibold">
              {copy.adaptation}: {resumeTitle(resumes, adaptation.baseResumeId, copy)}
            </h2>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {profileName(profiles, adaptation.profileId, copy)} ·{" "}
              {opportunityName || copy.linkedOpportunity} · {copy.version} {draft.revision}
            </p>
          </div>
          <Badge intent={draft.status === "failed" ? "danger" : "ai"}>
            {adaptationStatusLabels[locale][draft.status]}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`text-xs ${draft.error || draft.conflict ? "text-destructive" : "text-muted-foreground"}`}
            role="status"
          >
            {autosaveStatus}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="2xl:hidden"
              onClick={() => setContextOpen(true)}
            >
              {copy.context}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="xl:hidden"
              onClick={() => setSuggestionsOpen(true)}
            >
              <Sparkles className="size-3.5" />
              {copy.aiSuggestions} ·{" "}
              {adaptation.suggestions.filter((item) => item.status === "pending").length}
            </Button>
            {exportable ? (
              (["txt", "docx", "pdf"] as ExportFormat[]).map((format) => (
                <Button
                  key={format}
                  variant="outline"
                  size="sm"
                  loading={exportFile.isPending}
                  disabled={actionBlocked}
                  onClick={() => exportFile.mutate(format)}
                >
                  <Download className="size-3.5" />
                  {format.toUpperCase()}
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{copy.exportUnavailable}</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={deleteBlocked}
              title={deleteBlocked ? copy.deleteBlocked : undefined}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-3.5" />
              {copy.delete}
            </Button>
          </div>
        </div>
        {draft.recovered ? (
          <p className="rounded-md border bg-muted/50 p-3 text-sm" role="status">
            {copy.localRecovery}
          </p>
        ) : null}
        {draft.conflict ? (
          <div
            className="space-y-3 rounded-md border border-warning/40 bg-warning/10 p-3"
            role="alert"
          >
            <p className="text-sm font-medium">{copy.conflictTitle}</p>
            <p className="text-sm text-muted-foreground">{copy.conflictHint}</p>
            <Button
              variant="outline"
              size="sm"
              disabled={draft.saving || actionPending}
              onClick={() => setDiscardOpen(true)}
            >
              {copy.loadLatest}
            </Button>
          </div>
        ) : draft.error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {copy.saveErrorHint}
          </p>
        ) : null}
      </header>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[minmax(12rem,.65fr)_minmax(0,1.7fr)_minmax(16rem,.9fr)]">
        <aside
          className="intly-section hidden min-w-0 space-y-4 p-4 2xl:block"
          aria-label={copy.context}
        >
          <h3 className="text-sm font-semibold">{copy.context}</h3>
          {context}
        </aside>
        <section className="intly-section min-w-0 p-4" aria-label={copy.manualEditor}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{copy.manualEditor}</h3>
            <Button
              variant="outline"
              size="sm"
              aria-pressed={previewOpen}
              onClick={() => setPreviewOpen((value) => !value)}
            >
              <Eye className="size-3.5" />
              {previewOpen ? copy.edit : copy.preview}
            </Button>
          </div>
          {draft.status === "generating" ? (
            <p className="mb-4 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              {copy.generatingHint}
            </p>
          ) : null}
          {previewOpen ? (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-muted-foreground">{copy.previewHint}</p>
              <ResumePreview
                document={draft.documentJson}
                fallbackText={draft.markdownCache}
                fallbackTitle={baseResume?.title || copy.fallbackResumeTitle}
              />
            </div>
          ) : (
            <>
              <fieldset
                className="min-w-0"
                disabled={actionPending || draft.status === "generating"}
              >
                <AdaptationDocumentForm
                  status={draft.status}
                  documentJson={draft.documentJson}
                  markdownCache={draft.markdownCache}
                  locale={locale}
                  copy={copy}
                  onStatusChange={draft.setStatus}
                  onDocumentChange={draft.setDocument}
                  onMarkdownChange={draft.setMarkdown}
                />
              </fieldset>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  loading={draft.saving || update.isPending}
                  disabled={
                    !draft.dirty ||
                    !!draft.conflict ||
                    actionPending ||
                    draft.status === "generating"
                  }
                  onClick={() => update.mutate()}
                >
                  <FileEdit className="size-4" />
                  {copy.saveAdaptation}
                </Button>
                {draft.dirty ? (
                  <span
                    className={`text-xs ${draft.localPersisted ? "text-muted-foreground" : "text-destructive"}`}
                  >
                    {draft.localPersisted ? copy.localDraftSaved : copy.localDraftUnavailable}
                  </span>
                ) : null}
              </div>
            </>
          )}
        </section>
        <aside
          className="intly-section hidden min-w-0 space-y-4 p-4 xl:block"
          aria-label={copy.aiSuggestions}
        >
          <h3 className="text-sm font-semibold">{copy.aiSuggestions}</h3>
          {suggestions}
        </aside>
      </div>
      <Modal
        open={contextOpen}
        onOpenChange={setContextOpen}
        title={copy.context}
        placement="drawer"
      >
        {context}
      </Modal>
      <Modal
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
        title={copy.aiSuggestions}
        placement="drawer"
      >
        {suggestions}
      </Modal>
      <Modal
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title={copy.discardTitle}
        description={copy.discardHint}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={reload.isPending}
            onClick={() => setDiscardOpen(false)}
          >
            {copy.cancel}
          </Button>
          <Button loading={reload.isPending} onClick={() => reload.mutate()}>
            {copy.loadLatest}
          </Button>
        </div>
      </Modal>
      <Modal
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!remove.isPending) setDeleteOpen(open);
        }}
        title={copy.deleteTitle}
        description={copy.deleteHint}
      >
        {draft.status === "generating" ? (
          <p className="mb-4 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            {copy.deleteGeneratingHint}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={remove.isPending}
            onClick={() => setDeleteOpen(false)}
          >
            {copy.keepAdaptation}
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            disabled={deleteBlocked}
            onClick={() => remove.mutate()}
          >
            <Trash2 className="size-4" />
            {copy.confirmDelete}
          </Button>
        </div>
      </Modal>
    </section>
  );
}

function AdaptationContext({
  adaptation,
  baseResume,
  opportunityName,
  copy
}: {
  adaptation: ResumeAdaptation;
  baseResume?: Resume;
  opportunityName?: string;
  copy: ResumeCopy;
}) {
  return (
    <div className="space-y-5 text-sm">
      <p className="rounded-md bg-primary/5 p-3 leading-relaxed text-muted-foreground">
        {copy.contextHint}
      </p>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.opportunityId}
        </h3>
        <a
          className="mt-2 block break-words font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={`/opportunities/${adaptation.opportunityId}?profileId=${adaptation.profileId}`}
        >
          {opportunityName || copy.linkedOpportunity}
        </a>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.baseResume}
        </h3>
        <p className="mt-2 break-words font-medium">
          {baseResume?.title || copy.fallbackResumeTitle}
        </p>
        {baseResume?.documentJson.headline ? (
          <p className="mt-1 break-words text-muted-foreground">
            {String(baseResume.documentJson.headline)}
          </p>
        ) : null}
      </div>
      {baseResume?.documentJson.summary ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.summary}
          </h3>
          <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">
            {String(baseResume.documentJson.summary)}
          </p>
        </div>
      ) : null}
      {Array.isArray(baseResume?.documentJson.skills) && baseResume.documentJson.skills.length ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.skills}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {baseResume.documentJson.skills.map((item, index) => (
              <Badge key={isResumeListObject(item) ? item.id : index}>{itemText(item)}</Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdaptationSuggestions({
  adaptation,
  status,
  failureSummary,
  locale,
  copy,
  blocked,
  pending,
  onDecision,
  canUndo,
  onUndo
}: {
  adaptation: ResumeAdaptation;
  status: ResumeAdaptation["status"];
  failureSummary: string | null;
  locale: ResumeLocale;
  copy: ResumeCopy;
  blocked: boolean;
  pending: boolean;
  onDecision: (suggestion: ResumeSuggestion, decision: "accept" | "reject") => void;
  canUndo: (suggestion: ResumeSuggestion) => boolean;
  onUndo: (suggestion: ResumeSuggestion) => void;
}) {
  return (
    <div className="space-y-3">
      {adaptation.suggestions.length ? (
        groupedSuggestions(adaptation.suggestions).map((group) => (
          <section key={group.section} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {sectionLabel(group.section, copy)}
            </h4>
            {group.items.map((suggestion) => (
              <article key={suggestion.id} className="rounded-lg border bg-background p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong className="min-w-0 break-words text-sm">{suggestion.title}</strong>
                  <Badge
                    intent={
                      suggestion.status === "accepted"
                        ? "success"
                        : suggestion.status === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {suggestionStatusLabels[locale][suggestion.status]}
                  </Badge>
                </div>
                <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">
                  {suggestion.rationale || copy.aiSuggestionFallback}
                </p>
                {suggestion.evidence ? (
                  <p className="mt-2 whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium">{copy.suggestionEvidence}:</span>{" "}
                    {suggestion.evidence}
                  </p>
                ) : null}
                {suggestion.status === "pending" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      loading={pending}
                      disabled={blocked}
                      onClick={() => onDecision(suggestion, "accept")}
                    >
                      <Check className="size-3.5" />
                      {copy.accept}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={pending}
                      disabled={blocked}
                      onClick={() => onDecision(suggestion, "reject")}
                    >
                      <X className="size-3.5" />
                      {copy.reject}
                    </Button>
                  </div>
                ) : null}
                {canUndo(suggestion) ? (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    disabled={blocked}
                    loading={pending}
                    onClick={() => onUndo(suggestion)}
                  >
                    <RotateCcw className="size-3.5" />
                    {copy.undoReorder}
                  </Button>
                ) : null}
              </article>
            ))}
          </section>
        ))
      ) : failureSummary ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {failureSummary}
        </p>
      ) : (
        <p className="rounded-md border p-3 text-sm text-muted-foreground">
          {status === "generating" ? copy.noSuggestions : copy.noSuggestionsReady}
        </p>
      )}
    </div>
  );
}

function CreateResumeForm({
  profiles,
  locale,
  copy,
  onCreated
}: {
  profiles: Array<{ id: string; name: string }>;
  locale: ResumeLocale;
  copy: ResumeCopy;
  onCreated: (resume: Resume) => void;
}) {
  const [title, setTitle] = useState("");
  const [profileId, setProfileId] = useState("");
  const [documentJson, setDocumentJson] = useState<ResumeDocumentJson>(emptyResumeDocument);
  const [markdownCache, setMarkdownCache] = useState("");
  const create = useMutation({
    mutationFn: () =>
      resumesApi.createResume({
        title: title.trim(),
        profileId: profileId || undefined,
        documentJson,
        markdownCache
      }),
    onSuccess: (resume) => {
      toast.success(copy.baseCreated);
      onCreated(resume);
    },
    onError: (error) => toast.error(error.message)
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate();
      }}
    >
      <ResumeDocumentForm
        title={title}
        profileId={profileId}
        status="draft"
        documentJson={documentJson}
        markdownCache={markdownCache}
        profiles={profiles}
        locale={locale}
        copy={copy}
        onTitleChange={setTitle}
        onProfileChange={setProfileId}
        onStatusChange={() => undefined}
        onDocumentChange={setDocumentJson}
        onMarkdownChange={setMarkdownCache}
      />
      <div className="mt-4">
        <Button type="submit" loading={create.isPending} disabled={!title.trim()}>
          {copy.create}
        </Button>
      </div>
    </form>
  );
}

function CreateAdaptationForm({
  profiles,
  resumes,
  profileFilter,
  initialOpportunityId,
  copy,
  onCreated
}: {
  profiles: Array<{ id: string; name: string }>;
  resumes: Resume[];
  profileFilter?: string;
  initialOpportunityId?: string;
  copy: ResumeCopy;
  onCreated: (adaptation: ResumeAdaptation) => void;
}) {
  const [opportunitySearch, setOpportunitySearch] = useState("");
  const [selectedOpportunity, setSelectedOpportunity] = useState<ResumeOpportunityOption | null>(
    null
  );
  const [baseResumeId, setBaseResumeId] = useState(resumes[0]?.id ?? "");
  const [profileId, setProfileId] = useState(
    resumes[0]?.profileId || profileFilter || profiles[0]?.id || ""
  );
  const [customPrompt, setCustomPrompt] = useState("");
  const search = useQuery({
    queryKey: ["resume-opportunity-search", opportunitySearch, profileId],
    queryFn: () =>
      resumesApi.searchOpportunities({
        query: opportunitySearch.trim() || undefined,
        profileId: profileId || undefined,
        types: "vacancy,freelance"
      }),
    enabled: !!profileId
  });
  const direct = useQuery({
    queryKey: ["resume-opportunity", initialOpportunityId, profileId],
    queryFn: () => resumesApi.getOpportunity(initialOpportunityId!, profileId || undefined),
    enabled: !!initialOpportunityId && !!profileId
  });
  const directOpportunity = !opportunitySearch.trim() ? (direct.data ?? null) : null;
  const chosenOpportunity = selectedOpportunity ?? directOpportunity;
  const opportunityInputValue = selectedOpportunity
    ? opportunityOptionLabel(selectedOpportunity)
    : opportunitySearch || (directOpportunity ? opportunityOptionLabel(directOpportunity) : "");
  const options = (search.data?.items ?? []).filter(isAdaptableOpportunity);
  const unsupportedSelected = chosenOpportunity?.type === "tender";
  const opportunitiesLoading =
    (search.isLoading ||
      search.isFetching ||
      (!!initialOpportunityId && (direct.isLoading || direct.isFetching))) &&
    !search.isError &&
    !direct.isError;
  const opportunitiesError = search.error ?? direct.error;
  const create = useMutation({
    mutationFn: () =>
      resumesApi.createAdaptation(chosenOpportunity!.id, {
        baseResumeId,
        profileId,
        customPrompt: customPrompt.trim() || undefined
      }),
    onSuccess: (adaptation) => {
      toast.success(copy.adaptationCreated);
      onCreated(adaptation);
    },
    onError: (error) => toast.error(error.message)
  });
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (chosenOpportunity && !unsupportedSelected) create.mutate();
      }}
    >
      <Field label={copy.opportunityId} id="adapt-opportunity-search">
        <Input
          id="adapt-opportunity-search"
          value={opportunityInputValue}
          onChange={(event) => {
            setOpportunitySearch(event.target.value);
            setSelectedOpportunity(null);
          }}
          required
          placeholder={copy.opportunityPlaceholder}
        />
      </Field>
      {chosenOpportunity ? (
        <input type="hidden" name="opportunityId" value={chosenOpportunity.id} />
      ) : null}
      <div className="rounded-lg border bg-muted/30 p-3">
        {!profileId ? (
          <p className="text-sm text-muted-foreground">{copy.opportunityNoProfile}</p>
        ) : opportunitiesError ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">
              {copy.opportunitySearchError} {opportunitiesError.message}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void search.refetch();
                if (initialOpportunityId) void direct.refetch();
              }}
            >
              {copy.opportunityRetry}
            </Button>
          </div>
        ) : opportunitiesLoading ? (
          <p className="text-sm text-muted-foreground">{copy.opportunitySearchLoading}</p>
        ) : options.length ? (
          <div
            className="grid max-h-72 gap-2 overflow-y-auto pr-1"
            role="listbox"
            aria-label={copy.opportunityId}
          >
            {options.map((opportunity) => (
              <button
                key={opportunity.id}
                role="option"
                aria-selected={opportunity.id === chosenOpportunity?.id}
                type="button"
                className="rounded-md border bg-card p-3 text-left transition hover:border-primary/60 aria-selected:border-primary"
                onClick={() => setSelectedOpportunity(opportunity)}
              >
                <span className="block text-sm font-medium">{opportunity.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {opportunityTypeLabel(opportunity.type, copy)} ·{" "}
                  {opportunity.companyOrClient || "—"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{copy.opportunityEmpty}</p>
        )}
      </div>
      {chosenOpportunity ? (
        <p className="text-sm text-muted-foreground">
          {copy.selectedOpportunity}: {opportunityOptionLabel(chosenOpportunity)}
        </p>
      ) : null}
      {unsupportedSelected ? (
        <p role="alert" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          {copy.opportunityUnsupported}
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={copy.baseResume} id="adapt-base">
          <select
            id="adapt-base"
            className={selectClass}
            value={baseResumeId}
            onChange={(event) => setBaseResumeId(event.target.value)}
            required
          >
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.profile} id="adapt-profile">
          <select
            id="adapt-profile"
            className={selectClass}
            value={profileId}
            onChange={(event) => {
              setProfileId(event.target.value);
              setSelectedOpportunity(null);
              setOpportunitySearch("");
            }}
            required
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={copy.additionalAiInstruction} id="adapt-prompt">
        <Textarea
          id="adapt-prompt"
          className="min-h-32"
          maxLength={4000}
          value={customPrompt}
          onChange={(event) => setCustomPrompt(event.target.value)}
        />
      </Field>
      <Button
        type="submit"
        loading={create.isPending}
        disabled={!chosenOpportunity || unsupportedSelected || !baseResumeId || !profileId}
      >
        {copy.createAdaptation}
      </Button>
    </form>
  );
}

function ResumeDocumentForm({
  title,
  profileId,
  status,
  documentJson,
  markdownCache,
  profiles,
  locale,
  copy,
  onTitleChange,
  onProfileChange,
  onStatusChange,
  onDocumentChange,
  onMarkdownChange
}: {
  title: string;
  profileId: string;
  status: Resume["status"];
  documentJson: ResumeDocumentJson;
  markdownCache: string;
  profiles: Array<{ id: string; name: string }>;
  locale: ResumeLocale;
  copy: ResumeCopy;
  onTitleChange: (value: string) => void;
  onProfileChange: (value: string) => void;
  onStatusChange: (value: Resume["status"]) => void;
  onDocumentChange: (value: ResumeDocumentJson) => void;
  onMarkdownChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label={copy.name} id="resume-title">
          <Input
            id="resume-title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            required
          />
        </Field>
        <Field label={copy.profile} id="resume-profile">
          <select
            id="resume-profile"
            className={selectClass}
            value={profileId}
            onChange={(event) => onProfileChange(event.target.value)}
          >
            <option value="">{copy.unbound}</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.status} id="resume-status">
          <select
            id="resume-status"
            className={selectClass}
            value={status}
            onChange={(event) => onStatusChange(event.target.value as Resume["status"])}
          >
            <option value="draft">{resumeStatusLabels[locale].draft}</option>
            <option value="ready">{resumeStatusLabels[locale].ready}</option>
            <option value="archived">{resumeStatusLabels[locale].archived}</option>
          </select>
        </Field>
      </div>
      <StructuredResumeEditor value={documentJson} copy={copy} onChange={onDocumentChange} />
      <Field label={copy.aiExportText} id="resume-markdown">
        <Textarea
          id="resume-markdown"
          className="min-h-40 font-mono text-xs"
          value={markdownCache}
          onChange={(event) => onMarkdownChange(event.target.value)}
          placeholder={copy.aiExportPlaceholder}
        />
      </Field>
    </div>
  );
}

function AdaptationDocumentForm({
  status,
  documentJson,
  markdownCache,
  locale,
  copy,
  onStatusChange,
  onDocumentChange,
  onMarkdownChange
}: {
  status: ResumeAdaptation["status"];
  documentJson: ResumeDocumentJson;
  markdownCache: string;
  locale: ResumeLocale;
  copy: ResumeCopy;
  onStatusChange: (value: ResumeAdaptation["status"]) => void;
  onDocumentChange: (value: ResumeDocumentJson) => void;
  onMarkdownChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label={copy.adaptationStatus} id="adapt-status">
        <select
          id="adapt-status"
          className={selectClass}
          value={status}
          onChange={(event) => onStatusChange(event.target.value as ResumeAdaptation["status"])}
        >
          {Object.entries(adaptationStatusLabels[locale]).map(([value, label]) => (
            <option
              key={value}
              value={value}
              disabled={["generating", "exported", "failed"].includes(value)}
            >
              {label}
            </option>
          ))}
        </select>
      </Field>
      <StructuredResumeEditor value={documentJson} copy={copy} onChange={onDocumentChange} />
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">{copy.exportText}</summary>
        <p className="my-3 text-xs leading-relaxed text-muted-foreground">{copy.exportTextHint}</p>
        <Field label={copy.exportText} id="adapt-markdown">
          <Textarea
            id="adapt-markdown"
            className="min-h-40 font-mono text-xs"
            value={markdownCache}
            onChange={(event) => onMarkdownChange(event.target.value)}
          />
        </Field>
      </details>
    </div>
  );
}

function StructuredResumeEditor({
  value,
  copy,
  onChange
}: {
  value: ResumeDocumentJson;
  copy: ResumeCopy;
  onChange: (value: ResumeDocumentJson) => void;
}) {
  const updateText = (key: keyof ResumeDocumentJson, next: string) =>
    onChange({ ...value, [key]: next });
  const updateList = (key: keyof ResumeDocumentJson, next: string) =>
    onChange({ ...value, [key]: parseResumeList(next, value[key]) });
  return (
    <div className="grid gap-4">
      <Field label={copy.headline} id="doc-headline">
        <Input
          id="doc-headline"
          value={String(value.headline ?? "")}
          onChange={(event) => updateText("headline", event.target.value)}
        />
      </Field>
      <Field label={copy.summary} id="doc-summary">
        <Textarea
          id="doc-summary"
          className="min-h-28"
          value={String(value.summary ?? "")}
          onChange={(event) => updateText("summary", event.target.value)}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <ListField
          label={copy.skills}
          id="doc-skills"
          value={stringList(value.skills)}
          placeholder={copy.oneItemPerLine}
          onChange={(next) => updateList("skills", next)}
        />
        <ListField
          label={copy.experience}
          id="doc-experience"
          value={stringList(value.experience)}
          placeholder={copy.oneItemPerLine}
          onChange={(next) => updateList("experience", next)}
        />
        <ListField
          label={copy.projects}
          id="doc-projects"
          value={stringList(value.projects)}
          placeholder={copy.oneItemPerLine}
          onChange={(next) => updateList("projects", next)}
        />
        <ListField
          label={copy.education}
          id="doc-education"
          value={stringList(value.education)}
          placeholder={copy.oneItemPerLine}
          onChange={(next) => updateList("education", next)}
        />
        <ListField
          label={copy.languages}
          id="doc-languages"
          value={stringList(value.languages)}
          placeholder={copy.oneItemPerLine}
          onChange={(next) => updateList("languages", next)}
        />
        <ListField
          label={copy.links}
          id="doc-links"
          value={stringList(value.links)}
          placeholder={copy.oneItemPerLine}
          onChange={(next) => updateList("links", next)}
        />
      </div>
    </div>
  );
}

function ListField({
  label,
  id,
  value,
  placeholder,
  onChange
}: {
  label: string;
  id: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [input, setInput] = useState({ text: value, formatted: value });
  // Preserve the user's trailing newline/spacing while accepting actual server or AI edits.
  if (value !== input.formatted) setInput({ text: value, formatted: value });
  return (
    <Field label={label} id={id}>
      <Textarea
        id={id}
        className="min-h-28"
        value={input.text}
        onChange={(event) => {
          const text = event.target.value;
          setInput({
            text,
            formatted: text
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .join("\n")
          });
          onChange(text);
        }}
        placeholder={placeholder}
      />
    </Field>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function normalizeDocument(value?: ResumeDocumentJson): ResumeDocumentJson {
  return { ...emptyResumeDocument, ...(value ?? {}) };
}

function isAdaptationExportable(status: ResumeAdaptation["status"]): boolean {
  return status === "review" || status === "editing" || status === "ready" || status === "exported";
}

function groupedSuggestions(
  suggestions: ResumeSuggestion[]
): Array<{ section: string; items: ResumeSuggestion[] }> {
  const groups = new Map<string, ResumeSuggestion[]>();
  for (const suggestion of suggestions) {
    const section = suggestionSectionId(suggestion);
    groups.set(section, [...(groups.get(section) ?? []), suggestion]);
  }
  return Array.from(groups.entries()).map(([section, items]) => ({ section, items }));
}

function suggestionSectionId(suggestion: ResumeSuggestion): string {
  const proposed = suggestion.proposed ?? {};
  const value = proposed.sectionId ?? proposed.section ?? proposed.targetSection ?? proposed.path;
  return typeof value === "string" && value.trim() ? (value.split(".").at(0) ?? "other") : "other";
}

function sectionLabel(section: string, copy: ResumeCopy): string {
  const labels: Record<string, string> = {
    headline: copy.headline,
    summary: copy.summary,
    skills: copy.skills,
    experience: copy.experience,
    projects: copy.projects,
    education: copy.education,
    languages: copy.languages,
    links: copy.links,
    other: copy.aiSuggestions
  };
  return labels[section] ?? section;
}

function isAdaptableOpportunity(opportunity: ResumeOpportunityOption): boolean {
  return opportunity.type === "vacancy" || opportunity.type === "freelance";
}

function opportunityOptionLabel(opportunity: ResumeOpportunityOption): string {
  return `${opportunity.title}${opportunity.companyOrClient ? ` · ${opportunity.companyOrClient}` : ""}`;
}

function opportunityTypeLabel(type: ResumeOpportunityOption["type"], copy: ResumeCopy): string {
  if (type === "vacancy") return copy.localeVacancy ?? "Vacancy";
  if (type === "freelance") return copy.localeFreelance ?? "Project";
  return copy.localeTender ?? "Tender";
}

function profileName(
  profiles: Array<{ id: string; name: string }>,
  id: string | undefined,
  copy: ResumeCopy
) {
  return profiles.find((profile) => profile.id === id)?.name ?? copy.noProfile;
}

function resumeTitle(resumes: Resume[], id: string, copy: ResumeCopy) {
  return resumes.find((resume) => resume.id === id)?.title ?? copy.fallbackResumeTitle;
}
