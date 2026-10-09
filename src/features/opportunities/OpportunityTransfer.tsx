"use client";

import Image from "next/image";
import { useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileUp, Info, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/api";
import { useAuth } from "@/features/auth";
import { settingsApi } from "@/features/settings";
import { downloadBlob } from "@/lib/download";
import { downloadStoredFile } from "@/services/files/download-file";
import type { OpportunityType } from "@/types";
import { selectClass } from "./contracts";
import { formatOpportunityTransferError } from "./opportunity-transfer-errors";

type ExportFormat = "csv" | "xlsx" | "json";
type ExportScope = "selected" | "loaded" | "filtered";
type ImportFileType = OpportunityType | "auto";

const baseFields = [
  "id",
  "type",
  "title",
  "companyOrClient",
  "summary",
  "description",
  "skills",
  "technologies",
  "seniority",
  "employmentType",
  "location",
  "remoteType",
  "moneyMin",
  "moneyMax",
  "currency",
  "sourceStatus",
  "sourceIds",
  "urls",
  "publishedAt",
  "firstSeenAt",
  "deadline",
  "tags"
] as const;

const fieldLabels: Record<string, string> = {
  id: "ID записи",
  type: "Тип",
  title: "Название",
  companyOrClient: "Компания / заказчик",
  summary: "Краткое описание",
  description: "Описание",
  skills: "Навыки",
  technologies: "Технологии",
  seniority: "Уровень",
  employmentType: "Занятость",
  location: "География",
  remoteType: "Формат работы",
  moneyMin: "Сумма от",
  moneyMax: "Сумма до",
  currency: "Валюта",
  sourceStatus: "Статус публикации",
  sourceIds: "Источники",
  urls: "Ссылки",
  publishedAt: "Опубликовано",
  firstSeenAt: "Впервые собрано",
  deadline: "Дедлайн",
  tags: "Общие теги",
  matchScore: "Соответствие",
  pipelineStatus: "Этап отклика",
  favorite: "Избранное",
  hidden: "Скрыто",
  archived: "Архив",
  personalTags: "Личные теги",
  aiScore: "Оценка AI",
  aiRunId: "ID AI-анализа"
};

const englishFieldLabels: Record<string, string> = {
  id: "Record ID",
  type: "Type",
  title: "Title",
  companyOrClient: "Company / client",
  summary: "Summary",
  description: "Description",
  skills: "Skills",
  technologies: "Technologies",
  seniority: "Seniority",
  employmentType: "Employment",
  location: "Location",
  remoteType: "Work arrangement",
  moneyMin: "Amount from",
  moneyMax: "Amount to",
  currency: "Currency",
  sourceStatus: "Publication status",
  sourceIds: "Sources",
  urls: "Links",
  publishedAt: "Published",
  firstSeenAt: "First collected",
  deadline: "Deadline",
  tags: "Shared tags",
  matchScore: "Profile fit",
  pipelineStatus: "Response step",
  favorite: "Favorite",
  hidden: "Hidden",
  archived: "Archived",
  personalTags: "Personal tags",
  aiScore: "Оценка AI",
  aiRunId: "AI analysis ID"
};

const personalFields = [
  "matchScore",
  "aiScore",
  "aiRunId",
  "pipelineStatus",
  "favorite",
  "hidden",
  "archived",
  "personalTags"
] as const;

type ExportField = (typeof baseFields)[number] | (typeof personalFields)[number];

type OpportunityExportResponse = {
  fileId?: string;
  filename?: string;
  name?: string;
  mimeType: string;
  contentBase64?: string;
  encoding?: "base64";
  count: number;
  skipped: number;
  errors: Array<{ row?: number; error: string }>;
};

type QueuedExport = { status: "queued"; exportId: string; progress: number };
type ExportJobStatus = {
  exportId: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  fileId?: string;
  filename?: string;
  mimeType?: string;
  count?: number;
  error?: string;
};

type ExportDownloadArtifact = {
  origin: "foreground" | "background";
  fileId?: string;
  filename: string;
  mimeType: string;
  contentBase64?: string;
  count: number;
};

const exportCopy = {
  ru: {
    title: "Экспорт возможностей",
    description: "Выберите формат, записи и поля, которые нужны в файле.",
    format: "Формат",
    scope: "Объём",
    selected: "Только выбранные",
    loaded: "Загруженные на экране",
    filtered: "Все по текущим фильтрам",
    includePersonal: "Включить личные данные",
    personalHint:
      "Соответствие, оценка AI, этап отклика, избранное, скрытые и архивные отметки, личные теги.",
    fields: "Поля экспорта",
    file: "Ваш файл",
    hint: "Вся выборка по фильтрам готовится в фоне. Можно закрыть окно: готовый файл появится в уведомлениях.",
    private: "С личными данными",
    shared: "Общие поля",
    count: "Будет выгружено",
    all: "Вся выборка",
    download: "Скачать файл",
    prepare: "Подготовить файл",
    choose: "Выберите хотя бы одну возможность.",
    empty: "Загруженный список пуст.",
    missingFile: "Не удалось получить файл экспорта",
    queued: "Экспорт в очереди",
    running: "Подготавливаем файл",
    ready: "Файл готов",
    failed: "Не удалось подготовить файл",
    queuedToast: "Экспорт запущен. Готовый файл появится в уведомлениях.",
    exported: "Экспортировано записей",
    retry: "Повторить",
    progressError: "Не удалось проверить готовность файла",
    prepared: "Подготовлено записей",
    preparing: "Выборка готовится по сохранённым условиям экспорта.",
    storageFull:
      "Недостаточно места для подготовки файла. Администратору нужно освободить место в хранилище, затем повторите экспорт.",
    preparationNetworkError:
      "Не удалось отправить запрос на экспорт. Проверьте подключение и повторите действие.",
    networkError:
      "Файл подготовлен, но скачать его не удалось. Проверьте сеть и нажмите «Повторить» — экспорт заново не запустится."
  },
  en: {
    title: "Export opportunities",
    description: "Choose the format, records, and fields to include.",
    format: "Format",
    scope: "Scope",
    selected: "Selected only",
    loaded: "Currently loaded",
    filtered: "All matching current filters",
    includePersonal: "Include personal data",
    personalHint:
      "Profile fit, AI rating, response step, favorite, hidden and archived flags, and personal tags.",
    fields: "Export fields",
    file: "Your file",
    hint: "The full filtered selection is prepared in the background. You can close this window: the finished file will appear in Notifications.",
    private: "With personal data",
    shared: "Shared fields",
    count: "Records to export",
    all: "All matching records",
    download: "Download file",
    prepare: "Prepare file",
    choose: "Select at least one opportunity.",
    empty: "The loaded list is empty.",
    missingFile: "Could not retrieve the export file",
    queued: "Export queued",
    running: "Preparing your file",
    ready: "File ready",
    failed: "Could not prepare the file",
    queuedToast: "Export started. The finished file will appear in Notifications.",
    exported: "Records exported",
    retry: "Retry",
    progressError: "Could not check file progress",
    prepared: "Records prepared",
    preparing: "The selection is prepared using the saved export conditions.",
    storageFull:
      "There is not enough storage space to prepare the file. Ask an administrator to free up storage, then try the export again.",
    preparationNetworkError:
      "Could not send the export request. Check your connection and try again.",
    networkError:
      "The file is ready, but the download failed. Check the network and click Retry — the export will not run again."
  }
};

type FileUploadResponse = { id: string; originalName: string; mimeType: string; size: number };

type ImportResponse = {
  fileId: string;
  filename: string;
  imported: number;
  created: number;
  updated: number;
  skipped: number;
  opportunityIds: string[];
  errors: Array<{ row: number; error: string }>;
};

type ImportCopy = {
  title: string;
  description: string;
  emptyPreview: string;
  chooseFile: string;
  fileRequired: string;
  importedToast: (result: ImportResponse) => string;
  type: string;
  typeAuto: string;
  typeVacancy: string;
  typeFreelance: string;
  typeTender: string;
  sourceId: string;
  limit: string;
  resultTitle: string;
  resultDescription: string;
  import: string;
  hint: string;
  viewImport: string;
  done: string;
  created: string;
  updated: string;
  skipped: string;
  imported: string;
  errors: string;
  row: string;
};

const importCopy: Record<"ru" | "en", ImportCopy> = {
  ru: {
    title: "Импорт из файла",
    description:
      "Загрузите таблицу CSV/XLSX или список JSON. Каждая строка станет общей возможностью; повторные публикации будут объединены.",
    emptyPreview:
      "CSV, XLSX или JSON с колонками title, url, type, description и другими поддерживаемыми полями.",
    chooseFile: "Выберите файл",
    fileRequired: "Выберите CSV, XLSX или JSON файл",
    importedToast: (result) =>
      `Импортировано ${result.imported}: ${result.created} новых, ${result.updated} обновлено`,
    type: "Тип",
    typeAuto: "Из колонки type",
    typeVacancy: "Вакансия",
    typeFreelance: "Проект",
    typeTender: "Тендер",
    sourceId: "Идентификатор источника",
    limit: "Лимит",
    resultTitle: "Результат импорта",
    resultDescription:
      "За один раз можно добавить до 200 строк. Неверные строки будут пропущены с пояснением.",
    import: "Импортировать",
    hint: "Название title обязательно. Укажите тип в колонке type или выберите его выше. Ссылку url можно не указывать.",
    viewImport: "Просмотреть импорт",
    done: "Готово",
    created: "Создано",
    updated: "Обновлено",
    skipped: "Пропущено",
    imported: "Импортировано",
    errors: "Ошибки",
    row: "Строка"
  },
  en: {
    title: "Import from file",
    description:
      "Upload a CSV/XLSX table or a JSON list. Each row becomes a shared opportunity; repeated publications are merged.",
    emptyPreview:
      "CSV, XLSX, or JSON with title, url, type, description, and other supported columns.",
    chooseFile: "Choose a file",
    fileRequired: "Choose a CSV, XLSX, or JSON file",
    importedToast: (result) =>
      `Imported ${result.imported}: ${result.created} new, ${result.updated} updated`,
    type: "Type",
    typeAuto: "From the type column",
    typeVacancy: "Vacancy",
    typeFreelance: "Project",
    typeTender: "Tender",
    sourceId: "Source identifier",
    limit: "Limit",
    resultTitle: "Import result",
    resultDescription:
      "You can add up to 200 rows at once. Invalid rows are skipped with an explanation.",
    import: "Import",
    hint: "The title field is required. Set type in the type column or choose it above. The url field is optional.",
    viewImport: "View import",
    done: "Done",
    created: "Created",
    updated: "Updated",
    skipped: "Skipped",
    imported: "Imported",
    errors: "Errors",
    row: "Row"
  }
};

export function ExportModal({
  open,
  onOpenChange,
  query,
  selectedIds,
  loadedIds,
  profileId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: Record<string, unknown>;
  selectedIds: string[];
  loadedIds: string[];
  profileId?: string;
}) {
  const { user } = useAuth();
  const locale = user?.settings.locale === "en" ? "en" : "ru";
  const copy = exportCopy[locale];
  const labels = locale === "en" ? englishFieldLabels : fieldLabels;
  const exportDefaults = useQuery({
    queryKey: ["settings", "me"],
    queryFn: settingsApi.settings,
    enabled: open
  });
  const [formatOverride, setFormat] = useState<ExportFormat | null>(null);
  const format = formatOverride ?? exportDefaults.data?.exportFormat ?? "csv";
  const waitingForDefaults = !formatOverride && exportDefaults.isPending;
  const [scope, setScope] = useState<ExportScope>(
    selectedIds.length ? "selected" : loadedIds.length ? "loaded" : "filtered"
  );
  const [includePersonalData, setIncludePersonalData] = useState(false);
  const [fields, setFields] = useState<ExportField[]>([...baseFields]);
  const effectiveFields = includePersonalData
    ? fields
    : fields.filter((field) => !personalFields.includes(field as (typeof personalFields)[number]));
  const [exportId, setExportId] = useState<string | null>(null);
  const [readyExport, setReadyExport] = useState<ExportDownloadArtifact | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const limitLabel =
    scope === "selected" ? selectedIds.length : scope === "loaded" ? loadedIds.length : copy.all;
  const progressQuery = useQuery({
    queryKey: ["opportunity-export", user?.id, exportId],
    queryFn: () => api.get<ExportJobStatus>(`/opportunities/exports/${exportId}`),
    enabled: open && !!exportId,
    refetchInterval: (query) =>
      ["completed", "failed"].includes(query.state.data?.status ?? "") ? false : 1500
  });
  const job = progressQuery.data;
  const preparing = !!exportId && !["completed", "failed"].includes(job?.status ?? "");
  const completedJobExport =
    job?.status === "completed" ? backgroundExportArtifact(job, format) : null;
  const downloadableExport = readyExport ?? completedJobExport;

  function resetPreparedExport() {
    setReadyExport(null);
    setDownloadError(null);
    if (job?.status === "completed" || job?.status === "failed") setExportId(null);
  }

  const downloadReady = useMutation({
    mutationFn: async (artifact: ExportDownloadArtifact) => {
      if (artifact.fileId) {
        await downloadStoredFile(artifact.fileId, artifact.filename);
      } else if (artifact.contentBase64) {
        downloadBlob(base64ToBlob(artifact.contentBase64, artifact.mimeType), artifact.filename);
      } else {
        throw new Error(copy.missingFile);
      }
      return artifact;
    },
    onMutate: () => setDownloadError(null),
    onSuccess: (artifact) => {
      if (artifact.origin === "foreground") {
        toast.success(`${copy.exported}: ${artifact.count}`);
        onOpenChange(false);
      }
    },
    onError: (error) => {
      const message = formatOpportunityTransferError(error, copy);
      setDownloadError(message);
      toast.error(message);
    }
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await opportunityTransferApi.export({
        format,
        scope,
        ids: scope === "selected" ? selectedIds : undefined,
        loadedIds: scope === "loaded" ? loadedIds : undefined,
        query: { ...query, ...(profileId ? { profileId } : {}) },
        fields: effectiveFields,
        includePersonalData,
        background: scope === "filtered"
      });
      return response;
    },
    onMutate: () => setDownloadError(null),
    onSuccess: (response) => {
      if ("exportId" in response) {
        setReadyExport(null);
        setExportId(response.exportId);
        toast.info(copy.queuedToast);
        return;
      }
      const artifact = foregroundExportArtifact(response, format);
      setReadyExport(artifact);
      downloadReady.mutate(artifact);
    },
    onError: (error) =>
      toast.error(
        formatOpportunityTransferError(error, {
          ...copy,
          networkError: copy.preparationNetworkError
        })
      )
  });

  const scopeError =
    scope === "selected" && !selectedIds.length
      ? copy.choose
      : scope === "loaded" && !loadedIds.length
        ? copy.empty
        : "";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={copy.description}
      wide
    >
      <form
        className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]"
        onSubmit={(event) => {
          event.preventDefault();
          if (scopeError || preparing || waitingForDefaults || downloadReady.isPending) return;
          if (downloadableExport) {
            downloadReady.mutate(downloadableExport);
            return;
          }
          setExportId(null);
          exportMutation.mutate();
        }}
      >
        <fieldset
          disabled={preparing || exportMutation.isPending || downloadReady.isPending}
          className="min-w-0 space-y-4 disabled:opacity-70"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={copy.format} id="opportunity-export-format">
              <select
                id="opportunity-export-format"
                className={`${selectClass} w-full min-w-0`}
                value={format}
                onChange={(event) => {
                  resetPreparedExport();
                  setFormat(event.target.value as ExportFormat);
                }}
              >
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
                <option value="json">JSON</option>
              </select>
            </Field>
            <Field label={copy.scope} id="opportunity-export-scope">
              <select
                id="opportunity-export-scope"
                className={`${selectClass} w-full min-w-0`}
                value={scope}
                onChange={(event) => {
                  resetPreparedExport();
                  setScope(event.target.value as ExportScope);
                }}
              >
                <option value="selected">
                  {copy.selected} ({selectedIds.length})
                </option>
                <option value="loaded">
                  {copy.loaded} ({loadedIds.length})
                </option>
                <option value="filtered">{copy.filtered}</option>
              </select>
            </Field>
          </div>

          <label className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm">
            <input
              className="mt-1 accent-primary"
              type="checkbox"
              checked={includePersonalData}
              onChange={(event) => {
                resetPreparedExport();
                setIncludePersonalData(event.target.checked);
                if (event.target.checked)
                  setFields((current) => [...new Set([...current, ...personalFields])]);
                else
                  setFields((current) =>
                    current.filter(
                      (field) => !personalFields.includes(field as (typeof personalFields)[number])
                    )
                  );
              }}
            />
            <span>
              <span className="font-medium">{copy.includePersonal}</span>
              <span className="mt-1 block text-muted-foreground">{copy.personalHint}</span>
            </span>
          </label>

          <section>
            <h3 className="mb-2 text-sm font-semibold">{copy.fields}</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[...baseFields, ...(includePersonalData ? personalFields : [])].map((field) => (
                <label
                  key={field}
                  className="flex min-w-0 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <input
                    className="accent-primary"
                    type="checkbox"
                    checked={fields.includes(field)}
                    onChange={(event) => {
                      resetPreparedExport();
                      setFields((current) =>
                        event.target.checked
                          ? [...current, field]
                          : current.filter((item) => item !== field)
                      );
                    }}
                  />
                  {labels[field] ?? field}
                </label>
              ))}
            </div>
          </section>

          {scopeError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {scopeError}
            </p>
          ) : null}
          {exportMutation.data &&
          "errors" in exportMutation.data &&
          exportMutation.data.errors.length ? (
            <TransferErrors errors={exportMutation.data.errors} />
          ) : null}
        </fieldset>

        <aside className="min-w-0 space-y-4 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2">
            <Download className="size-4 text-primary" />
            <h3 className="font-semibold">{copy.file}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{copy.hint}</p>
          <div className="flex flex-wrap gap-2">
            <Badge>{format.toUpperCase()}</Badge>
            <Badge intent="primary">
              {{ selected: copy.selected, loaded: copy.loaded, filtered: copy.filtered }[scope]}
            </Badge>
            <Badge intent={includePersonalData ? "warning" : "neutral"}>
              {includePersonalData ? copy.private : copy.shared}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {copy.count}: {limitLabel}
          </p>
          {readyExport ? (
            <div role="status" className="space-y-1 rounded-lg border p-3 text-sm">
              <p className="font-medium">{copy.ready}</p>
              <p>
                {copy.prepared}: {readyExport.count}
              </p>
            </div>
          ) : null}
          {exportId ? (
            <div role="status" className="space-y-2 rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {
                  {
                    queued: copy.queued,
                    running: copy.running,
                    completed: copy.ready,
                    failed: copy.failed
                  }[job?.status ?? "queued"]
                }
              </p>
              {preparing ? (
                <>
                  <progress
                    aria-label={copy.running}
                    className="h-2 w-full accent-primary"
                    value={Math.min(Math.max(job?.progress ?? 0, 0), 100)}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">{copy.preparing}</p>
                </>
              ) : null}
              {typeof job?.count === "number" ? (
                <p>
                  {copy.prepared}: {job.count}
                </p>
              ) : null}
              {job?.error ? (
                <p className="break-words text-destructive">
                  {formatOpportunityTransferError(job.error, copy)}
                </p>
              ) : null}
              {progressQuery.isError ? (
                <>
                  <p className="text-destructive">{copy.progressError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => progressQuery.refetch()}
                  >
                    {copy.retry}
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
          {downloadError ? (
            <div
              role="alert"
              className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <p>{downloadError}</p>
            </div>
          ) : null}
          {downloadableExport ? (
            <Button
              className="w-full"
              type="button"
              loading={downloadReady.isPending}
              disabled={exportMutation.isPending || preparing}
              onClick={() => downloadReady.mutate(downloadableExport)}
            >
              <Download className="size-4" />
              {downloadError ? copy.retry : copy.download}
            </Button>
          ) : (
            <Button
              className="w-full"
              type="submit"
              loading={exportMutation.isPending}
              disabled={
                preparing ||
                waitingForDefaults ||
                !!scopeError ||
                !effectiveFields.length ||
                downloadReady.isPending
              }
            >
              <Download className="size-4" />
              {scope === "filtered" ? copy.prepare : copy.download}
            </Button>
          )}
        </aside>
      </form>
    </Modal>
  );
}

export function ImportFilePanel({
  type = "auto",
  profileId,
  onImported
}: {
  type?: ImportFileType;
  profileId?: string;
  onImported: (id?: string) => void;
}) {
  const { user } = useAuth();
  const locale = user?.settings.locale === "en" ? "en" : "ru";
  const copy = importCopy[locale];
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportFileType>(type);
  const [sourceId, setSourceId] = useState("file-import");
  const [limit, setLimit] = useState(200);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const accept =
    ".csv,.tsv,.txt,.xlsx,.json,text/csv,text/tab-separated-values,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json";
  const preview = useMemo(() => {
    if (!file) return copy.emptyPreview;
    return `${file.name} · ${Math.ceil(file.size / 1024)} KB`;
  }, [copy.emptyPreview, file]);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(copy.fileRequired);
      const form = new FormData();
      form.set("file", file);
      form.set("filename", file.name);
      form.set("mimeType", normalizedMime(file));
      form.set("metadata", JSON.stringify({ kind: "opportunity_import" }));
      const uploaded = await api.upload<FileUploadResponse>("/files/multipart", form);
      const imported = await opportunityTransferApi.importFile({
        fileId: uploaded.id,
        type: importType === "auto" ? undefined : importType,
        sourceId: sourceId.trim() || undefined,
        profileId,
        limit
      });
      return imported;
    },
    onSuccess: (response) => {
      setResult(response);
      toast.success(copy.importedToast(response));
    },
    onError: (error) => toast.error(error.message)
  });

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setResult(null);
  }

  return (
    <section className="grid gap-5 rounded-lg border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid size-16 shrink-0 place-items-center rounded-lg border bg-muted/40">
            <Image
              src="/brand/opportunity-gateway.png"
              alt=""
              width={128}
              height={128}
              className="size-12 object-contain"
            />
          </div>
          <div>
            <h2 className="font-semibold">{copy.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
          </div>
        </div>

        <label className="grid min-h-36 place-items-center rounded-lg border border-dashed bg-background p-6 text-center">
          <input type="file" className="sr-only" accept={accept} onChange={selectFile} />
          <span>
            <UploadCloud className="mx-auto mb-3 size-8 text-muted-foreground" />
            <strong>{file?.name ?? copy.chooseFile}</strong>
            <span className="mt-1 block text-sm text-muted-foreground">{preview}</span>
          </span>
        </label>

        <div className="grid gap-3 md:grid-cols-3">
          <Field label={copy.type} id="opportunity-import-type">
            <select
              id="opportunity-import-type"
              className={selectClass}
              value={importType}
              onChange={(event) => setImportType(event.target.value as ImportFileType)}
            >
              <option value="auto">{copy.typeAuto}</option>
              <option value="vacancy">{copy.typeVacancy}</option>
              <option value="freelance">{copy.typeFreelance}</option>
              <option value="tender">{copy.typeTender}</option>
            </select>
          </Field>
          <Field label={copy.sourceId} id="opportunity-import-source">
            <Input
              id="opportunity-import-source"
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              placeholder="file-import"
            />
          </Field>
          <Field label={copy.limit} id="opportunity-import-limit">
            <Input
              id="opportunity-import-limit"
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(event) =>
                setLimit(Math.min(200, Math.max(1, Number(event.target.value) || 1)))
              }
            />
          </Field>
        </div>

        <Textarea
          readOnly
          className="min-h-28 font-mono text-xs"
          value={
            'title,url,type,companyOrClient,description,skills,technologies,moneyMin,moneyMax,currency\nSenior Backend,http://example.com,vacancy,Acme,NestJS role,"NestJS;MongoDB",TypeScript,300000,400000,RUB'
          }
        />
      </div>

      <aside className="space-y-4 rounded-lg border bg-background p-4">
        <div className="flex items-center gap-2">
          <FileUp className="size-4 text-primary" />
          <h3 className="font-semibold">{copy.resultTitle}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{copy.resultDescription}</p>
        <Button
          type="button"
          className="w-full"
          loading={importMutation.isPending}
          disabled={!file}
          onClick={() => importMutation.mutate()}
        >
          <FileUp className="size-4" />
          {copy.import}
        </Button>
        {result ? (
          <>
            <ImportSummary result={result} copy={copy} />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onImported(result.opportunityIds[0])}
            >
              {result.opportunityIds.length ? copy.viewImport : copy.done}
            </Button>
          </>
        ) : (
          <p className="flex gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            {copy.hint}
          </p>
        )}
      </aside>
    </section>
  );
}

function ImportSummary({ result, copy }: { result: ImportResponse; copy: ImportCopy }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <Metric label={copy.created} value={result.created} />
        <Metric label={copy.updated} value={result.updated} />
        <Metric label={copy.skipped} value={result.skipped} />
        <Metric label={copy.imported} value={result.imported} />
      </div>
      {result.errors.length ? <TransferErrors errors={result.errors} copy={copy} /> : null}
    </div>
  );
}

function TransferErrors({
  errors,
  copy = importCopy.ru
}: {
  errors: Array<{ row?: number; error: string }>;
  copy?: Pick<ImportCopy, "errors" | "row">;
}) {
  return (
    <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
      <h4 className="text-sm font-semibold">{copy.errors}</h4>
      <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">
        {errors.slice(0, 20).map((error, index) => (
          <li key={`${error.row ?? "x"}-${index}`}>
            {error.row ? `${copy.row} ${error.row}: ` : ""}
            {error.error}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong>{value}</strong>
    </div>
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

const opportunityTransferApi = {
  export(input: {
    format: ExportFormat;
    scope: ExportScope;
    ids?: string[];
    loadedIds?: string[];
    query?: Record<string, unknown>;
    fields?: string[];
    includePersonalData?: boolean;
    limit?: number;
    background?: boolean;
  }) {
    return api.post<OpportunityExportResponse | QueuedExport>("/opportunities/export", input);
  },
  importFile(input: {
    fileId: string;
    type?: OpportunityType;
    sourceId?: string;
    profileId?: string;
    limit?: number;
  }) {
    return api.post<ImportResponse>("/opportunities/import-file", input);
  }
};

function normalizedMime(file: File): string {
  if (/\.csv$/i.test(file.name)) return "text/csv";
  if (/\.tsv$/i.test(file.name)) return "text/tab-separated-values";
  if (/\.xlsx$/i.test(file.name))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (/\.json$/i.test(file.name)) return "application/json";
  return file.type || "text/plain";
}

function foregroundExportArtifact(
  response: OpportunityExportResponse,
  format: ExportFormat
): ExportDownloadArtifact {
  return {
    origin: "foreground",
    fileId: response.fileId,
    filename: response.name ?? response.filename ?? `opportunities.${format}`,
    mimeType: response.mimeType,
    contentBase64: response.contentBase64,
    count: response.count
  };
}

function backgroundExportArtifact(
  job: ExportJobStatus,
  format: ExportFormat
): ExportDownloadArtifact {
  return {
    origin: "background",
    fileId: job.fileId,
    filename: job.filename ?? `opportunities.${format}`,
    mimeType: job.mimeType ?? "application/octet-stream",
    count: job.count ?? 0
  };
}

function base64ToBlob(contentBase64: string, mimeType: string) {
  const binary = atob(contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}
