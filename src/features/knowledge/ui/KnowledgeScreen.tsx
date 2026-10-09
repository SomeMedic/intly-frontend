"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, RefreshCw, Search, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/intly/app-shell";
import { EmptyState } from "@/components/intly/empty-state";
import { ErrorState } from "@/components/intly/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth";
import { useProfiles } from "@/features/profiles";
import { useActiveProfileStore } from "@/hooks/use-active-profile";
import { downloadStoredFile } from "@/services/files/download-file";
import { knowledgeApi } from "../api/knowledge-api";
import {
  knowledgeModes,
  knowledgeStatuses,
  knowledgeTypes,
  type KnowledgeDocument,
  type KnowledgeEvidence,
  type KnowledgeMode,
  type KnowledgeStatus,
  type KnowledgeType
} from "../contracts";
import {
  isKnowledgeProcessing,
  knowledgeChunkLabel,
  knowledgeModeDescriptions,
  knowledgeModeLabels,
  resolveKnowledgeLocale,
  knowledgeStatusDescriptions,
  knowledgeStatusLabels,
  knowledgeTypeLabels,
  type KnowledgeLocale
} from "../knowledge-labels";
import { resolveRagProfileScope } from "../knowledge-rag-scope";

const selectClass =
  "h-[var(--control-height)] w-full min-w-0 rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const statusIntent: Record<
  KnowledgeStatus,
  "neutral" | "primary" | "success" | "warning" | "danger" | "ai"
> = {
  Uploading: "primary",
  Parsing: "ai",
  Chunking: "ai",
  Embedding: "warning",
  Indexing: "warning",
  Indexed: "success",
  Failed: "danger"
};

const knowledgeCopy = {
  ru: {
    title: "База знаний",
    subtitle:
      "Документы, которые помогают подтверждать опыт, портфолио и личный контекст. Вы сами решаете, где каждый файл участвует в поиске и ответах AI.",
    uploadDocument: "Загрузить документ",
    searchPlaceholder: "Поиск по названию и тексту…",
    searchAria: "Поиск документов базы знаний",
    typeAria: "Тип документа",
    allTypes: "Все типы",
    modeAria: "Режим документа",
    allModes: "Все режимы",
    statusAria: "Статус обработки",
    allStatuses: "Все статусы",
    profileAria: "Профиль",
    allProfiles: "Все профили",
    loadingDocuments: "Загружаем документы…",
    summaryPending: "Текст появится после обработки.",
    general: "общий",
    profileShort: "проф.",
    emptyTitle: "Документы ещё не загружены",
    emptyDescription:
      "Добавьте PDF, DOCX, изображение или текстовый файл. INTLY прочитает документ и сделает его доступным для поиска.",
    uploadTitle: "Загрузить в базу знаний",
    uploadDescription: "Файл будет сохранён и поставлен в очередь обработки.",
    savedToast: "Документ сохранён",
    queuedToast: "Обработка поставлена в очередь",
    deletedToast: "Документ удалён",
    downloadUnavailable: "Файл недоступен для скачивания",
    fallbackFilename: "knowledge-document",
    ragTitle: "Проверить поиск по знаниям",
    ragDescription:
      "Поиск показывает только разрешённые фрагменты и подтверждения, которые можно использовать в ответах AI.",
    ragPlaceholder: "Какие проекты с React и Nest можно показать заказчику?",
    ragQueryAria: "Запрос для проверки поиска по знаниям",
    ragProfileAria: "Профиль для поиска по знаниям",
    profilesFailed: "Профили не загрузились, поэтому профиль по умолчанию недоступен.",
    ragEmptyResults: "По этому запросу фрагменты не найдены.",
    activeProfile: "Активный профиль",
    find: "Найти",
    detailTitle: "Карточка документа",
    loadingText: "Загружаем текст…",
    name: "Название",
    type: "Тип",
    mode: "Режим",
    profiles: "Профили",
    noProfiles: "Профилей пока нет. Документ останется общим.",
    save: "Сохранить",
    download: "Скачать файл",
    reprocess: "Повторить обработку",
    remove: "Удалить",
    extractedText: "Извлечённый текст",
    extractedPending: "Текст появится после успешного парсинга и индексации.",
    chooseFile: "Выберите файл",
    fileHint: "PDF, DOCX, TXT/MD или изображения для OCR.",
    titlePlaceholder: "Например: портфолио backend 2026",
    profileBinding: "Привязка к профилям",
    profileBindingHint: "Без выбора документ будет доступен всем вашим профилям.",
    upload: "Загрузить",
    chooseFileError: "Выберите файл",
    uploadedToast: "Документ загружен и поставлен в обработку"
  },
  en: {
    title: "Knowledge base",
    subtitle:
      "Documents that help prove experience, portfolio work, and personal context. You decide where each file participates in search and AI answers.",
    uploadDocument: "Upload document",
    searchPlaceholder: "Search by title and text…",
    searchAria: "Search knowledge documents",
    typeAria: "Document type",
    allTypes: "All types",
    modeAria: "Document mode",
    allModes: "All modes",
    statusAria: "Processing status",
    allStatuses: "All statuses",
    profileAria: "Profile",
    allProfiles: "All profiles",
    loadingDocuments: "Loading documents…",
    summaryPending: "Text will appear after processing.",
    general: "shared",
    profileShort: "profiles",
    emptyTitle: "No documents uploaded yet",
    emptyDescription:
      "Add a PDF, DOCX, image, or text file. INTLY will read it and make it available for search.",
    uploadTitle: "Upload to knowledge base",
    uploadDescription: "The file will be stored and queued for processing.",
    savedToast: "Document saved",
    queuedToast: "Processing queued",
    deletedToast: "Document deleted",
    downloadUnavailable: "The file is not available for download",
    fallbackFilename: "knowledge-document",
    ragTitle: "Test knowledge search",
    ragDescription:
      "Search returns only permitted fragments and shows evidence that can be sent to AI.",
    ragPlaceholder: "Which React and Nest projects can I show to a client?",
    ragQueryAria: "Knowledge search test query",
    ragProfileAria: "Knowledge search profile",
    profilesFailed: "Profiles failed to load, so the default profile is unavailable.",
    ragEmptyResults: "No fragments found for this query.",
    activeProfile: "Active profile",
    find: "Find",
    detailTitle: "Document card",
    loadingText: "Loading text…",
    name: "Name",
    type: "Type",
    mode: "Mode",
    profiles: "Profiles",
    noProfiles: "No profiles yet. The document will stay shared.",
    save: "Save",
    download: "Download file",
    reprocess: "Process again",
    remove: "Delete",
    extractedText: "Extracted text",
    extractedPending: "Text will appear after successful parsing and indexing.",
    chooseFile: "Choose a file",
    fileHint: "PDF, DOCX, TXT/MD, or images for OCR.",
    titlePlaceholder: "Example: backend portfolio 2026",
    profileBinding: "Profile binding",
    profileBindingHint:
      "If none are selected, the document will be available to all your profiles.",
    upload: "Upload",
    chooseFileError: "Choose a file",
    uploadedToast: "Document uploaded and queued for processing"
  }
} satisfies Record<KnowledgeLocale, Record<string, string>>;

type KnowledgeCopy = (typeof knowledgeCopy)[KnowledgeLocale];

export function KnowledgeScreen() {
  const { user, bootstrapped } = useAuth();
  const locale = resolveKnowledgeLocale(user?.settings.locale);
  const copy = knowledgeCopy[locale];
  const profiles = useProfiles();
  const activeProfileId = useActiveProfileStore((state) => state.activeProfileId);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{
    query: string;
    type: KnowledgeType | "all";
    mode: KnowledgeMode | "all";
    status: KnowledgeStatus | "all";
    profileId: string;
  }>({
    query: "",
    type: "all",
    mode: "all",
    status: "all",
    profileId: ""
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchProfileId, setSearchProfileId] = useState("");
  const ragProfileScope = useMemo(
    () =>
      resolveRagProfileScope({
        selectedProfileId: searchProfileId,
        activeProfileId,
        profiles: profiles.data ?? [],
        allProfilesLabel: copy.allProfiles,
        activeProfileLabel: copy.activeProfile
      }),
    [activeProfileId, copy.activeProfile, copy.allProfiles, profiles.data, searchProfileId]
  );

  const documents = useQuery({
    queryKey: ["knowledge-documents", user?.id, filters],
    queryFn: () => knowledgeApi.list(filters),
    enabled: bootstrapped && !!user,
    refetchInterval: (query) =>
      query.state.data?.items.some(isKnowledgeProcessing) ? 3_000 : false
  });

  const selected = useQuery({
    queryKey: ["knowledge-document", selectedId],
    queryFn: () => knowledgeApi.get(selectedId as string),
    enabled: !!selectedId,
    refetchInterval: (query) => (isKnowledgeProcessing(query.state.data) ? 3_000 : false)
  });

  const search = useMutation({
    mutationFn: () =>
      knowledgeApi.search({
        query: searchQuery.trim(),
        profileId: ragProfileScope.requestProfileId,
        topK: 8
      }),
    onError: (error) => toast.error(error.message)
  });
  const {
    data: searchData,
    isPending: searchPending,
    mutate: runSearch,
    reset: resetSearch
  } = search;

  useEffect(() => {
    resetSearch();
  }, [ragProfileScope.scopeKey, resetSearch]);

  const refreshLists = () => {
    queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    if (selectedId) queryClient.invalidateQueries({ queryKey: ["knowledge-document", selectedId] });
  };

  const updateDocument = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<KnowledgeDocument> }) =>
      knowledgeApi.update(id, input),
    onSuccess: (document) => {
      toast.success(copy.savedToast);
      setSelectedId(document.id);
      refreshLists();
    },
    onError: (error) => toast.error(error.message)
  });

  const reprocess = useMutation({
    mutationFn: knowledgeApi.reprocess,
    onSuccess: () => {
      toast.success(copy.queuedToast);
      refreshLists();
    },
    onError: (error) => toast.error(error.message)
  });

  const remove = useMutation({
    mutationFn: knowledgeApi.remove,
    onSuccess: () => {
      toast.success(copy.deletedToast);
      setSelectedId(null);
      refreshLists();
    },
    onError: (error) => toast.error(error.message)
  });

  const download = useMutation({
    mutationFn: async (document: KnowledgeDocument) => {
      if (!document.fileId) throw new Error(copy.downloadUnavailable);
      await downloadStoredFile(document.fileId, document.title || copy.fallbackFilename);
    },
    onError: (error) => toast.error(error.message)
  });

  const items = documents.data?.items ?? [];
  const activeDocument =
    selected.data ?? items.find((document) => document.id === selectedId) ?? items[0];

  return (
    <AppShell>
      <header className="intly-page-header mb-5 grid gap-4 overflow-hidden p-5 sm:grid-cols-[minmax(0,1fr)_9rem] md:grid-cols-[minmax(0,1fr)_13rem]">
        <div>
          <h1 className="text-2xl font-semibold">{copy.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{copy.subtitle}</p>
          <div className="mt-4">
            <Button onClick={() => setUploadOpen(true)}>
              <UploadCloud className="size-4" />
              {copy.uploadDocument}
            </Button>
          </div>
        </div>
        <div
          className="mx-auto grid size-36 place-items-center rounded-lg border bg-muted/40 p-2 sm:mx-0 md:size-52"
          aria-hidden
        >
          <Image
            src="/brand/knowledge-library.png"
            alt=""
            width={1374}
            height={1145}
            priority
            className="h-full w-full object-contain"
          />
        </div>
      </header>

      <section className="intly-toolbar mb-5 grid min-w-0 gap-3 p-3 sm:grid-cols-2 2xl:grid-cols-[minmax(12rem,1fr)_repeat(4,minmax(0,1fr))]">
        <Input
          aria-label={copy.searchAria}
          value={filters.query}
          onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
          placeholder={copy.searchPlaceholder}
        />
        <select
          className={selectClass}
          value={filters.type}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              type: event.target.value as KnowledgeType | "all"
            }))
          }
          aria-label={copy.typeAria}
        >
          <option value="all">{copy.allTypes}</option>
          {knowledgeTypes.map((type) => (
            <option key={type} value={type}>
              {knowledgeTypeLabels[locale][type]}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={filters.mode}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              mode: event.target.value as KnowledgeMode | "all"
            }))
          }
          aria-label={copy.modeAria}
        >
          <option value="all">{copy.allModes}</option>
          {knowledgeModes.map((mode) => (
            <option key={mode} value={mode}>
              {knowledgeModeLabels[locale][mode]}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: event.target.value as KnowledgeStatus | "all"
            }))
          }
          aria-label={copy.statusAria}
        >
          <option value="all">{copy.allStatuses}</option>
          {knowledgeStatuses.map((status) => (
            <option key={status} value={status}>
              {knowledgeStatusLabels[locale][status]}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={filters.profileId}
          onChange={(event) =>
            setFilters((current) => ({ ...current, profileId: event.target.value }))
          }
          aria-label={copy.profileAria}
        >
          <option value="">{copy.allProfiles}</option>
          {profiles.data?.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0">
          {documents.isPending ? (
            <p className="text-muted-foreground">{copy.loadingDocuments}</p>
          ) : documents.isError ? (
            <ErrorState message={documents.error.message} onRetry={() => documents.refetch()} />
          ) : items.length ? (
            <div className="grid gap-3">
              {items.map((document) => (
                <button
                  key={document.id}
                  className="min-w-0 rounded-lg border bg-card p-4 text-left transition hover:border-primary/60 data-[active=true]:border-primary data-[active=true]:shadow-sm"
                  data-active={activeDocument?.id === document.id}
                  onClick={() => setSelectedId(document.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <h2 className="min-w-0 truncate font-semibold">{document.title}</h2>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {document.summary || copy.summaryPending}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge intent={statusIntent[document.status]}>
                        {knowledgeStatusLabels[locale][document.status]}
                      </Badge>
                      <Badge>{knowledgeModeLabels[locale][document.mode]}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{knowledgeTypeLabels[locale][document.type]}</span>
                    <span>· {knowledgeChunkLabel(document.chunkCount, locale)}</span>
                    <span>
                      ·{" "}
                      {document.profileIds.length
                        ? `${document.profileIds.length} ${copy.profileShort}`
                        : copy.general}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <RagSearchPanel
            profiles={profiles.data ?? []}
            query={searchQuery}
            profileId={searchProfileId}
            isPending={searchPending}
            disabled={profiles.isPending || profiles.isError}
            results={searchData?.items ?? []}
            searched={search.isSuccess}
            defaultProfileLabel={ragProfileScope.defaultOptionLabel}
            showAllProfilesOption={ragProfileScope.showAllProfilesOption}
            locale={locale}
            copy={copy}
            profilesError={profiles.isError ? profiles.error.message : undefined}
            onProfilesRetry={() => profiles.refetch()}
            onQueryChange={setSearchQuery}
            onProfileChange={setSearchProfileId}
            onSearch={(event) => {
              event.preventDefault();
              if (searchQuery.trim()) runSearch();
            }}
          />
          {activeDocument ? (
            <DocumentDetail
              key={`${activeDocument.id}:${activeDocument.updatedAt ?? ""}`}
              document={selected.data ?? activeDocument}
              profiles={profiles.data ?? []}
              locale={locale}
              copy={copy}
              loading={selected.isPending && selectedId === activeDocument.id}
              onSelect={() => setSelectedId(activeDocument.id)}
              onSave={(input) => updateDocument.mutate({ id: activeDocument.id, input })}
              onReprocess={() => reprocess.mutate(activeDocument.id)}
              onDelete={() => remove.mutate(activeDocument.id)}
              onDownload={() => download.mutate(activeDocument)}
              actionPending={updateDocument.isPending || reprocess.isPending || remove.isPending}
              downloadPending={download.isPending}
            />
          ) : null}
        </aside>
      </section>

      <Modal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title={copy.uploadTitle}
        description={copy.uploadDescription}
        wide
      >
        <UploadForm
          profiles={profiles.data ?? []}
          locale={locale}
          copy={copy}
          onUploaded={(document) => {
            setUploadOpen(false);
            setSelectedId(document.id);
            refreshLists();
          }}
        />
      </Modal>
    </AppShell>
  );
}

function RagSearchPanel({
  profiles,
  query,
  profileId,
  isPending,
  disabled,
  results,
  searched,
  defaultProfileLabel,
  showAllProfilesOption,
  copy,
  profilesError,
  onProfilesRetry,
  onQueryChange,
  onProfileChange,
  onSearch
}: {
  profiles: Array<{ id: string; name: string }>;
  query: string;
  profileId: string;
  isPending: boolean;
  disabled: boolean;
  results: KnowledgeEvidence[];
  searched: boolean;
  defaultProfileLabel: string;
  showAllProfilesOption: boolean;
  locale: KnowledgeLocale;
  copy: KnowledgeCopy;
  profilesError?: string;
  onProfilesRetry: () => void;
  onQueryChange: (value: string) => void;
  onProfileChange: (value: string) => void;
  onSearch: (event: FormEvent) => void;
}) {
  return (
    <form className="intly-section min-w-0 p-4" onSubmit={onSearch}>
      <h2 className="font-semibold">{copy.ragTitle}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{copy.ragDescription}</p>
      <Textarea
        className="mt-3 min-h-24"
        aria-label={copy.ragQueryAria}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={copy.ragPlaceholder}
      />
      <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row">
        <select
          className={`${selectClass} flex-none sm:flex-1`}
          value={profileId}
          onChange={(event) => onProfileChange(event.target.value)}
          aria-label={copy.ragProfileAria}
          disabled={disabled}
        >
          <option value="">{defaultProfileLabel}</option>
          {showAllProfilesOption ? <option value="all">{copy.allProfiles}</option> : null}
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        <Button
          type="submit"
          className="shrink-0"
          loading={isPending}
          disabled={disabled || !query.trim()}
        >
          <Search className="size-4" />
          {copy.find}
        </Button>
      </div>
      {profilesError ? (
        <div className="mt-4">
          <ErrorState message={copy.profilesFailed} onRetry={onProfilesRetry} />
        </div>
      ) : null}
      {results.length ? (
        <div className="mt-4 space-y-2">
          {results.map((item) => (
            <article key={item.chunkId} className="min-w-0 rounded-md border p-3">
              <div className="mb-1 flex min-w-0 items-start justify-between gap-2">
                <strong className="min-w-0 flex-1 break-words text-sm">{item.documentTitle}</strong>
                <Badge intent="ai" className="shrink-0">
                  {Math.round(item.score * 100)}%
                </Badge>
              </div>
              <p className="line-clamp-4 text-sm text-muted-foreground">{item.excerpt}</p>
            </article>
          ))}
        </div>
      ) : searched && !profilesError ? (
        <p className="mt-4 text-sm text-muted-foreground">{copy.ragEmptyResults}</p>
      ) : null}
    </form>
  );
}

function DocumentDetail({
  document,
  profiles,
  loading,
  actionPending,
  downloadPending,
  locale,
  copy,
  onSave,
  onReprocess,
  onDelete,
  onDownload,
  onSelect
}: {
  document: KnowledgeDocument;
  profiles: Array<{ id: string; name: string }>;
  loading: boolean;
  actionPending: boolean;
  downloadPending: boolean;
  locale: KnowledgeLocale;
  copy: KnowledgeCopy;
  onSave: (input: Partial<KnowledgeDocument>) => void;
  onReprocess: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onSelect: () => void;
}) {
  const [title, setTitle] = useState(document.title);
  const [type, setType] = useState<KnowledgeType>(document.type);
  const [mode, setMode] = useState<KnowledgeMode>(document.mode);
  const [profileIds, setProfileIds] = useState<string[]>(document.profileIds);

  return (
    <section className="intly-section min-w-0 p-4" onMouseEnter={onSelect}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{copy.detailTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? copy.loadingText
              : `${knowledgeChunkLabel(document.chunkCount, locale)} · ${knowledgeStatusDescriptions[locale][document.status]}`}
          </p>
        </div>
        <Badge intent={statusIntent[document.status]}>
          {knowledgeStatusLabels[locale][document.status]}
        </Badge>
      </div>
      <div className="mt-4 space-y-3">
        <Field label={copy.name} id="kb-title">
          <Input id="kb-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={copy.type} id="kb-type">
            <select
              id="kb-type"
              className={selectClass}
              value={type}
              onChange={(event) => setType(event.target.value as KnowledgeType)}
            >
              {knowledgeTypes.map((item) => (
                <option key={item} value={item}>
                  {knowledgeTypeLabels[locale][item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.mode} id="kb-mode">
            <select
              id="kb-mode"
              className={selectClass}
              value={mode}
              onChange={(event) => setMode(event.target.value as KnowledgeMode)}
            >
              {knowledgeModes.map((item) => (
                <option key={item} value={item}>
                  {knowledgeModeLabels[locale][item]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-sm text-muted-foreground">{knowledgeModeDescriptions[locale][mode]}</p>
        <div>
          <span className="text-sm font-medium">{copy.profiles}</span>
          <div className="mt-2 grid gap-2">
            {profiles.map((profile) => (
              <label
                key={profile.id}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={profileIds.includes(profile.id)}
                  onChange={(event) =>
                    setProfileIds((current) =>
                      event.target.checked
                        ? [...current, profile.id]
                        : current.filter((id) => id !== profile.id)
                    )
                  }
                />
                {profile.name}
              </label>
            ))}
            {!profiles.length ? (
              <p className="text-sm text-muted-foreground">{copy.noProfiles}</p>
            ) : null}
          </div>
        </div>
        {document.lastError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {document.lastError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            loading={actionPending}
            onClick={() => onSave({ title: title.trim(), type, mode, profileIds })}
            disabled={!title.trim()}
          >
            {copy.save}
          </Button>
          <Button variant="outline" loading={downloadPending} onClick={onDownload}>
            <Download className="size-4" />
            {copy.download}
          </Button>
          <Button variant="outline" loading={actionPending} onClick={onReprocess}>
            <RefreshCw className="size-4" />
            {copy.reprocess}
          </Button>
          <Button variant="danger" loading={actionPending} onClick={onDelete}>
            <Trash2 className="size-4" />
            {copy.remove}
          </Button>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">{copy.extractedText}</h3>
          <div className="max-h-80 overflow-auto rounded-md border bg-background p-3 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
            {document.extractedText || document.summary || copy.extractedPending}
          </div>
        </div>
      </div>
    </section>
  );
}

function UploadForm({
  profiles,
  locale,
  copy,
  onUploaded
}: {
  profiles: Array<{ id: string; name: string }>;
  locale: KnowledgeLocale;
  copy: KnowledgeCopy;
  onUploaded: (document: KnowledgeDocument) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<KnowledgeType>("other");
  const [mode, setMode] = useState<KnowledgeMode>("rag_only");
  const [profileIds, setProfileIds] = useState<string[]>([]);
  const create = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(copy.chooseFileError);
      const form = new FormData();
      form.set("file", file);
      form.set("title", title.trim() || file.name);
      form.set("type", type);
      form.set("mode", mode);
      form.set("filename", file.name);
      form.set("mimeType", file.type || "application/octet-stream");
      form.set("profileIds", JSON.stringify(profileIds));
      return knowledgeApi.upload(form);
    },
    onSuccess: (document) => {
      toast.success(copy.uploadedToast);
      onUploaded(document);
    },
    onError: (error) => toast.error(error.message)
  });

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, ""));
  }

  return (
    <form
      className="grid gap-4 lg:grid-cols-[1fr_18rem]"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate();
      }}
    >
      <div className="space-y-4">
        <label className="grid min-h-44 place-items-center rounded-lg border border-dashed bg-background p-6 text-center">
          <input
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
            onChange={selectFile}
          />
          <span>
            <UploadCloud className="mx-auto mb-3 size-8 text-muted-foreground" />
            <strong>{file?.name ?? copy.chooseFile}</strong>
            <span className="mt-1 block text-sm text-muted-foreground">{copy.fileHint}</span>
          </span>
        </label>
        <Field label={copy.name} id="upload-title">
          <Input
            id="upload-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={file?.name ?? copy.titlePlaceholder}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={copy.type} id="upload-type">
            <select
              id="upload-type"
              className={selectClass}
              value={type}
              onChange={(event) => setType(event.target.value as KnowledgeType)}
            >
              {knowledgeTypes.map((item) => (
                <option key={item} value={item}>
                  {knowledgeTypeLabels[locale][item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.mode} id="upload-mode">
            <select
              id="upload-mode"
              className={selectClass}
              value={mode}
              onChange={(event) => setMode(event.target.value as KnowledgeMode)}
            >
              {knowledgeModes.map((item) => (
                <option key={item} value={item}>
                  {knowledgeModeLabels[locale][item]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <aside className="space-y-3 rounded-lg border bg-background p-4">
        <h3 className="font-semibold">{copy.profileBinding}</h3>
        <p className="text-sm text-muted-foreground">{copy.profileBindingHint}</p>
        <div className="space-y-2">
          {profiles.map((profile) => (
            <label
              key={profile.id}
              className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                className="accent-primary"
                checked={profileIds.includes(profile.id)}
                onChange={(event) =>
                  setProfileIds((current) =>
                    event.target.checked
                      ? [...current, profile.id]
                      : current.filter((id) => id !== profile.id)
                  )
                }
              />
              {profile.name}
            </label>
          ))}
        </div>
        <Button className="w-full" type="submit" loading={create.isPending} disabled={!file}>
          {copy.upload}
        </Button>
      </aside>
    </form>
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
