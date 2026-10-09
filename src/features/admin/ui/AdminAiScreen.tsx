"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { adminApi } from "../api/admin-api";
import {
  aiProviders,
  aiTasks,
  defaultSystemCore,
  defaultTaskInstructions,
  providerLabel,
  taskLabel
} from "../adminAI/catalog";
import type {
  AdminAiPromptTemplate,
  AdminAiProviderConfig,
  AdminAiRouteConfig,
  AdminAiSchema,
  AdminAiTestRun,
  AiProvider,
  AiTaskType
} from "../adminAI/types";
import { AdminAiUsageTab } from "./AdminAiUsageTab";
import { AdminFrame, AdminQueryState, adminPanelClass, adminSubPanelClass } from "./AdminShared";
import type { AdminLocale, Localized } from "./admin-locale";
import { useAdminLocale } from "./admin-locale";
import { AdminAiPricingEditor } from "./AdminAiPricingEditor";

const tabs = ["providers", "routes", "prompts", "schemas", "usage", "test"] as const;
type Tab = (typeof tabs)[number];

type AiCopy = {
  title: string;
  description: string;
  tabs: Record<Tab, string>;
  savedProvider: string;
  savedRoute: string;
  savedPrompt: string;
  configured: string;
  verifiedHealthy: string;
  missingKey: string;
  disabled: string;
  enableProvider: string;
  apiKeyHint: string;
  apiKeySaved: (value: string) => string;
  apiKeyUnsaved: string;
  apiKeyPlaceholder: string;
  baseUrl: string;
  baseUrlHint: string;
  defaultModel: string;
  health: string;
  saveProvider: string;
  savedSettings: string;
  unsavedSettings: string;
  providerTestModel: string;
  testProvider: string;
  providerTestHealthy: string;
  providerTestFailed: string;
  staleProviderTest: string;
  routingTitle: string;
  routingDescription: string;
  primaryProvider: string;
  primaryModel: string;
  fallbackProvider: string;
  fallbackModel: string;
  retries: string;
  temperature: string;
  maxOutputTokens: string;
  saveRouting: string;
  noFallback: string;
  statusLabels: Record<AdminAiTestRun["status"] | "healthy" | "failed", string>;
  promptTitle: string;
  promptDescription: string;
  versionLabel: string;
  updated: string;
  neverSaved: string;
  savePrompt: string;
  invalidPlaceholders: string;
  validPlaceholders: string;
  readonlyBlocks: string;
  supportedPlaceholders: string;
  activeSchema: string;
  protectedReadonly: string;
  version: string;
  readonly: string;
  systemPrompt: string;
  taskPrompt: string;
  automaticBlocks: string[];
  task: string;
  provider: string;
  model: string;
  status: string;
  testTitle: string;
  testDescription: string;
  taskTemplate: string;
  syntheticContext: string;
  runTest: string;
  result: string;
  resultDescription: string;
  resultEmpty: string;
  queued: string;
  runId: string;
  error: string;
  healthUnchecked: string;
  invalidJson: string;
  actionError: string;
  liveRefresh: string;
  resultJson: string;
  usage: string;
  duration: string;
};

const aiCopy: Localized<AiCopy> = {
  ru: {
    title: "AI-консоль",
    description:
      "Провайдеры, маршруты задач, защищённые промпты, форматы ответа, статистика и тестовый запуск.",
    tabs: {
      providers: "Провайдеры",
      routes: "Маршруты",
      prompts: "Промпты",
      schemas: "Форматы",
      usage: "Статистика",
      test: "Тест"
    },
    savedProvider: "Провайдер сохранён",
    savedRoute: "Маршрут сохранён",
    savedPrompt: "Промпт сохранён",
    configured: "Ключ сохранён",
    verifiedHealthy: "Проверен",
    missingKey: "Нет ключа",
    disabled: "Выключен",
    enableProvider: "Включить провайдера",
    apiKeyHint: "Сохранённый ключ скрыт.",
    apiKeySaved: (value) => `Сохранён: ${value}`,
    apiKeyUnsaved: "Новый ключ ещё не сохранён",
    apiKeyPlaceholder: "Вставьте ключ",
    baseUrl: "Адрес сервиса",
    baseUrlHint: "Оставьте пустым, если нужен адрес по умолчанию.",
    defaultModel: "Модель по умолчанию",
    health: "Проверка",
    saveProvider: "Сохранить провайдера",
    savedSettings: "Проверка использует сохранённые настройки",
    unsavedSettings: "Есть несохранённые изменения",
    providerTestModel: "Модель для проверки",
    testProvider: "Проверить провайдера",
    providerTestHealthy: "Провайдер проверен",
    providerTestFailed: "Проверка не прошла",
    staleProviderTest: "Настройки изменились во время проверки",
    routingTitle: "Маршруты задач",
    routingDescription:
      "Пользователь не выбирает модель. Для каждой задачи задаётся основной провайдер, резерв и число повторов; фактические провайдер и модель сохраняются в истории запуска.",
    primaryProvider: "Основной провайдер",
    primaryModel: "Основная модель",
    fallbackProvider: "Резервный провайдер",
    fallbackModel: "Резервная модель",
    retries: "Повторы до резерва",
    temperature: "Температура",
    maxOutputTokens: "Максимум ответа",
    saveRouting: "Сохранить маршрут",
    noFallback: "Без резерва",
    statusLabels: {
      queued: "В очереди",
      running: "Выполняется",
      completed: "Готово",
      failed: "Ошибка",
      cancelled: "Отменён",
      healthy: "Исправен"
    },
    promptTitle: "Защищённые промпты",
    promptDescription:
      "Админ редактирует системный текст и инструкции задачи. Остальные блоки добавляются автоматически.",
    versionLabel: "Версия",
    updated: "Обновлено",
    neverSaved: "ещё не сохранён",
    savePrompt: "Сохранить промпт",
    invalidPlaceholders: "Неподдерживаемые переменные",
    validPlaceholders: "Переменные валидны",
    readonlyBlocks: "Автоматические блоки",
    supportedPlaceholders: "Поддерживаемые переменные",
    activeSchema: "Формат ответа",
    protectedReadonly: "только просмотр",
    version: "Версия",
    readonly: "Только просмотр",
    systemPrompt: "Системный текст",
    taskPrompt: "Инструкция задачи",
    automaticBlocks: [
      "Профиль",
      "Пожелания пользователя",
      "Пользовательский запрос",
      "База знаний",
      "Формат ответа"
    ],
    task: "Задача",
    provider: "Провайдер",
    model: "Модель",
    status: "Статус",
    testTitle: "Безопасный тест",
    testDescription:
      "Запуск идёт через реальный маршрут, но контекст синтетический и не подтягивает приватные данные пользователей.",
    taskTemplate: "Шаблон задачи",
    syntheticContext: "Синтетический контекст JSON",
    runTest: "Запустить тест",
    result: "Результат",
    resultDescription:
      "Экран обновляет запуск до финального статуса и показывает фактического провайдера, модель, расход и результат.",
    resultEmpty:
      "Запустите тест, чтобы увидеть ID запуска, статус, провайдера, модель, расход и ошибки.",
    queued: "Тестовый AI-запуск поставлен в очередь",
    runId: "ID запуска",
    error: "Ошибка",
    healthUnchecked: "не проверялся",
    invalidJson: "Контекст должен быть JSON-объектом.",
    actionError: "Не удалось выполнить действие",
    liveRefresh: "Обновляется",
    resultJson: "Результат",
    usage: "Расход",
    duration: "Длительность"
  },
  en: {
    title: "Admin AI console",
    description:
      "Providers, task routes, protected prompts, response formats, analytics and a test launch.",
    tabs: {
      providers: "Providers",
      routes: "Routes",
      prompts: "Prompts",
      schemas: "Formats",
      usage: "Analytics",
      test: "Test"
    },
    savedProvider: "Provider saved",
    savedRoute: "Route saved",
    savedPrompt: "Prompt saved",
    configured: "Key saved",
    verifiedHealthy: "Verified",
    missingKey: "Missing key",
    disabled: "Off",
    enableProvider: "Enable provider",
    apiKeyHint: "Saved keys are hidden.",
    apiKeySaved: (value) => `Saved: ${value}`,
    apiKeyUnsaved: "New key is not saved yet",
    apiKeyPlaceholder: "Paste key",
    baseUrl: "Service address",
    baseUrlHint: "Leave empty to use the default address.",
    defaultModel: "Default model",
    health: "Check",
    saveProvider: "Save provider",
    savedSettings: "Check uses saved settings",
    unsavedSettings: "Unsaved changes",
    providerTestModel: "Check model",
    testProvider: "Check provider",
    providerTestHealthy: "Provider checked",
    providerTestFailed: "Check failed",
    staleProviderTest: "Settings changed during the check",
    routingTitle: "Task routes",
    routingDescription:
      "Users do not choose models. Each task has a primary provider, backup provider and retry count; the actual provider and model are saved in the launch history.",
    primaryProvider: "Primary provider",
    primaryModel: "Primary model",
    fallbackProvider: "Backup provider",
    fallbackModel: "Backup model",
    retries: "Retries before backup",
    temperature: "Temperature",
    maxOutputTokens: "Max response tokens",
    saveRouting: "Save route",
    noFallback: "No backup",
    statusLabels: {
      queued: "Queued",
      running: "Running",
      completed: "Completed",
      failed: "Failed",
      cancelled: "Cancelled",
      healthy: "Healthy"
    },
    promptTitle: "Protected prompts",
    promptDescription:
      "Admins edit the system text and task instructions. The remaining blocks are added automatically.",
    versionLabel: "Version label",
    updated: "Updated",
    neverSaved: "not saved yet",
    savePrompt: "Save prompt",
    invalidPlaceholders: "Unsupported placeholders",
    validPlaceholders: "Placeholders are valid",
    readonlyBlocks: "Automatic blocks",
    supportedPlaceholders: "Supported variables",
    activeSchema: "Response format",
    protectedReadonly: "view only",
    version: "Version",
    readonly: "View only",
    systemPrompt: "System text",
    taskPrompt: "Task instructions",
    automaticBlocks: [
      "Profile",
      "User preferences",
      "User request",
      "Knowledge base",
      "Response format"
    ],
    task: "Task",
    provider: "Provider",
    model: "Model",
    status: "Status",
    testTitle: "Safe test",
    testDescription:
      "The launch uses the real route, but the context is synthetic and does not load private user data.",
    taskTemplate: "Task template",
    syntheticContext: "Synthetic context JSON",
    runTest: "Start test",
    result: "Result",
    resultDescription:
      "The screen refreshes the launch until a final status and shows the actual provider, model, usage and result.",
    resultEmpty: "Start a test to see launch ID, status, provider, model, usage and errors.",
    queued: "Test launch queued",
    runId: "Launch ID",
    error: "Error",
    healthUnchecked: "not checked",
    invalidJson: "Context must be a JSON object.",
    actionError: "Action failed",
    liveRefresh: "Refreshing",
    resultJson: "Result",
    usage: "Usage",
    duration: "Duration"
  }
};

const selectClass =
  "h-[var(--control-height)] w-full min-w-0 rounded-md border border-border/80 bg-card px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring";

export function AdminAiScreen() {
  const locale = useAdminLocale();
  const text = aiCopy[locale];
  const [tab, setTab] = useState<Tab>("providers");
  const providers = useQuery({
    queryKey: ["admin", "ai", "providers"],
    queryFn: adminApi.ai.providers
  });
  const routes = useQuery({ queryKey: ["admin", "ai", "routes"], queryFn: adminApi.ai.routes });
  const prompts = useQuery({ queryKey: ["admin", "ai", "prompts"], queryFn: adminApi.ai.prompts });
  const schemas = useQuery({ queryKey: ["admin", "ai", "schemas"], queryFn: adminApi.ai.schemas });
  const isLoading =
    providers.isLoading || routes.isLoading || prompts.isLoading || schemas.isLoading;
  const isError = providers.isError || routes.isError || prompts.isError || schemas.isError;
  const retry = () => {
    void providers.refetch();
    void routes.refetch();
    void prompts.refetch();
    void schemas.refetch();
  };

  return (
    <AdminFrame title={text.title} description={text.description}>
      <AdminQueryState isLoading={isLoading} isError={isError} onRetry={retry}>
        <div className="space-y-5">
          <nav className="flex flex-wrap gap-2" aria-label="AI admin tabs">
            {tabs.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={tab === item ? "primary" : "outline"}
                onClick={() => setTab(item)}
              >
                {text.tabs[item]}
              </Button>
            ))}
          </nav>

          {tab === "providers" ? (
            <ProvidersTab providers={providers.data?.items ?? []} text={text} locale={locale} />
          ) : null}
          {tab === "routes" ? (
            <RoutesTab routes={routes.data?.items ?? []} text={text} locale={locale} />
          ) : null}
          {tab === "prompts" ? (
            <PromptsTab
              prompts={prompts.data?.items ?? []}
              schemas={schemas.data?.items ?? []}
              text={text}
              locale={locale}
            />
          ) : null}
          {tab === "schemas" ? (
            <SchemasTab schemas={schemas.data?.items ?? []} text={text} locale={locale} />
          ) : null}
          {tab === "usage" ? <AdminAiUsageTab locale={locale} /> : null}
          {tab === "test" ? <TestHarnessTab text={text} locale={locale} /> : null}
        </div>
      </AdminQueryState>
    </AdminFrame>
  );
}

function ProvidersTab({
  providers,
  text,
  locale
}: {
  providers: AdminAiProviderConfig[];
  text: AiCopy;
  locale: AdminLocale;
}) {
  const byProvider = new Map(providers.map((item) => [item.provider, item]));
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {aiProviders.map((item) => (
        <ProviderCard
          key={item.provider}
          catalog={item}
          config={byProvider.get(item.provider)}
          text={text}
          locale={locale}
        />
      ))}
    </div>
  );
}

function ProviderCard({
  catalog,
  config,
  text,
  locale
}: {
  catalog: (typeof aiProviders)[number];
  config?: AdminAiProviderConfig;
  text: AiCopy;
  locale: AdminLocale;
}) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(Boolean(config?.enabled));
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [testModel, setTestModel] = useState(catalog.defaultModel);
  const mutation = useMutation({
    mutationFn: () =>
      adminApi.ai.updateProvider({
        provider: catalog.provider,
        enabled,
        baseUrl: baseUrl.trim() || undefined,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {})
      }),
    onSuccess: () => {
      setApiKey("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "ai", "providers"] });
      toast.success(text.savedProvider);
    },
    onError: (error) => toast.error(errorMessage(error))
  });
  const testMutation = useMutation({
    mutationFn: () =>
      adminApi.ai.testProvider(catalog.provider, {
        modelId: testModel.trim() || catalog.defaultModel
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ai", "providers"] });
      if (result.status === "healthy" && result.persisted !== false)
        toast.success(text.providerTestHealthy);
      else
        toast.error(
          providerTestMessage(result.errorCode, result.message, result.persisted, text, locale)
        );
    },
    onError: (error) => toast.error(errorMessage(error))
  });
  const masked = config?.apiKeyMasked;
  const health = healthLabel(config?.health, text, locale);
  const healthy = config?.health?.status === "healthy" && config.health.persisted !== false;
  const dirty =
    enabled !== Boolean(config?.enabled) ||
    baseUrl !== (config?.baseUrl ?? "") ||
    Boolean(apiKey.trim());
  return (
    <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_0_rgba(8,9,10,0.03)]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{catalog.label}</CardTitle>
            <CardDescription>{catalog.description[locale]}</CardDescription>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge intent={config?.enabled ? (masked ? "success" : "warning") : "neutral"}>
              {config?.enabled ? (masked ? text.configured : text.missingKey) : text.disabled}
            </Badge>
            {healthy ? <Badge intent="primary">{text.verifiedHealthy}</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-primary"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          {text.enableProvider}
        </label>
        <Field label="API key" hint={text.apiKeyHint}>
          <Input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={masked ? text.apiKeySaved(masked) : text.apiKeyPlaceholder}
          />
          {apiKey.trim() ? (
            <span className="block text-xs text-warning">{text.apiKeyUnsaved}</span>
          ) : null}
        </Field>
        <Field label={text.baseUrl} hint={text.baseUrlHint}>
          <Input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://api.example.com/v1"
          />
        </Field>
        <div className={`${adminSubPanelClass} text-xs text-muted-foreground`}>
          <div>
            {text.defaultModel}:{" "}
            <span className="font-medium text-foreground">{catalog.defaultModel}</span>
          </div>
          <div>
            {text.health}: <span className="font-medium text-foreground">{health}</span>
          </div>
          <div className={cn("mt-1 font-medium", dirty ? "text-warning" : "text-success")}>
            {dirty ? text.unsavedSettings : text.savedSettings}
          </div>
        </div>
        <Field label={text.providerTestModel} hint={text.savedSettings}>
          <Input value={testModel} onChange={(event) => setTestModel(event.target.value)} />
        </Field>
        <AdminAiPricingEditor
          key={`${catalog.provider}:${JSON.stringify(config?.pricing ?? [])}`}
          provider={catalog.provider}
          pricing={config?.pricing ?? []}
          locale={locale}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" loading={mutation.isPending} onClick={() => mutation.mutate()}>
            {text.saveProvider}
          </Button>
          <Button
            type="button"
            variant="outline"
            loading={testMutation.isPending}
            onClick={() => testMutation.mutate()}
          >
            {text.testProvider}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RoutesTab({
  routes,
  text,
  locale
}: {
  routes: AdminAiRouteConfig[];
  text: AiCopy;
  locale: AdminLocale;
}) {
  const byTask = new Map(routes.map((item) => [item.taskType, item]));
  return (
    <div className="space-y-4">
      <div className={adminPanelClass}>
        <h2 className="font-semibold">{text.routingTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{text.routingDescription}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {aiTasks.map((task) => (
          <RouteCard
            key={task.taskType}
            task={task}
            route={byTask.get(task.taskType)}
            text={text}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}

function RouteCard({
  task,
  route,
  text,
  locale
}: {
  task: (typeof aiTasks)[number];
  route?: AdminAiRouteConfig;
  text: AiCopy;
  locale: AdminLocale;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<AdminAiRouteConfig>(() => ({
    taskType: task.taskType,
    primaryProvider: route?.primaryProvider ?? "openai",
    primaryModel: route?.primaryModel ?? task.defaultModel,
    fallbackProvider: route ? (route.fallbackProvider ?? null) : "gemini",
    fallbackModel: route ? (route.fallbackModel ?? null) : "gemini-2.5-flash",
    retryCount: route?.retryCount ?? 1,
    temperature: route?.temperature ?? 0.2,
    maxOutputTokens: route?.maxOutputTokens ?? 4096
  }));
  const mutation = useMutation({
    mutationFn: () =>
      adminApi.ai.updateRoute({
        ...draft,
        fallbackProvider: draft.fallbackProvider || null,
        fallbackModel: draft.fallbackProvider ? draft.fallbackModel?.trim() || null : null,
        primaryModel: draft.primaryModel.trim()
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ai", "routes"] });
      toast.success(text.savedRoute);
    },
    onError: (error) => toast.error(errorMessage(error))
  });
  return (
    <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_0_rgba(8,9,10,0.03)]">
      <CardHeader>
        <CardTitle>{task.label[locale]}</CardTitle>
        <CardDescription>{task.description[locale]}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <Field label={text.primaryProvider}>
          <ProviderSelect
            text={text}
            value={draft.primaryProvider}
            onChange={(value) => {
              if (value)
                setDraft((current) => ({
                  ...current,
                  primaryProvider: value,
                  primaryModel: defaultModelForProvider(value)
                }));
            }}
          />
        </Field>
        <Field label={text.primaryModel}>
          <Input
            value={draft.primaryModel}
            onChange={(event) =>
              setDraft((current) => ({ ...current, primaryModel: event.target.value }))
            }
          />
        </Field>
        <Field label={text.fallbackProvider}>
          <ProviderSelect
            text={text}
            allowEmpty
            value={draft.fallbackProvider ?? ""}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                fallbackProvider: value || null,
                fallbackModel: value ? defaultModelForProvider(value) : null
              }))
            }
          />
        </Field>
        <Field label={text.fallbackModel}>
          <Input
            value={draft.fallbackModel ?? ""}
            onChange={(event) =>
              setDraft((current) => ({ ...current, fallbackModel: event.target.value }))
            }
          />
        </Field>
        <Field label={text.retries}>
          <Input
            type="number"
            min={0}
            max={5}
            value={draft.retryCount}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                retryCount: clampNumber(event.target.value, 0, 5)
              }))
            }
          />
        </Field>
        <Field label={text.temperature}>
          <Input
            type="number"
            min={0}
            max={2}
            step="0.1"
            value={draft.temperature ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                temperature:
                  event.target.value === "" ? undefined : clampNumber(event.target.value, 0, 2)
              }))
            }
          />
        </Field>
        <Field label={text.maxOutputTokens}>
          <Input
            type="number"
            min={1}
            value={draft.maxOutputTokens ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                maxOutputTokens:
                  event.target.value === ""
                    ? undefined
                    : Math.max(1, Number(event.target.value) || 1)
              }))
            }
          />
        </Field>
        <div className="flex items-end">
          <Button type="button" loading={mutation.isPending} onClick={() => mutation.mutate()}>
            {text.saveRouting}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PromptsTab({
  prompts,
  schemas,
  text,
  locale
}: {
  prompts: AdminAiPromptTemplate[];
  schemas: AdminAiSchema[];
  text: AiCopy;
  locale: AdminLocale;
}) {
  const [taskType, setTaskType] = useState<AiTaskType>("opportunity_analysis");
  const prompt = prompts.find((item) => item.taskType === taskType);
  const schema = schemas.find((item) => item.taskType === taskType);
  return (
    <PromptEditor
      key={taskType}
      taskType={taskType}
      prompt={prompt}
      schema={schema}
      text={text}
      locale={locale}
      onTaskChange={setTaskType}
    />
  );
}

function PromptEditor({
  taskType,
  prompt,
  schema,
  text,
  locale,
  onTaskChange
}: {
  taskType: AiTaskType;
  prompt?: AdminAiPromptTemplate;
  schema?: AdminAiSchema;
  text: AiCopy;
  locale: AdminLocale;
  onTaskChange: (task: AiTaskType) => void;
}) {
  const queryClient = useQueryClient();
  const [systemCore, setSystemCore] = useState(prompt?.systemCore ?? defaultSystemCore);
  const [taskInstructions, setTaskInstructions] = useState(
    prompt?.taskInstructions ?? defaultTaskInstructions(taskType)
  );
  const [versionLabel, setVersionLabel] = useState(prompt?.versionLabel ?? "v1");
  const placeholders = useMemo(
    () => supportedPlaceholders(`${systemCore}\n${taskInstructions}`),
    [systemCore, taskInstructions]
  );
  const mutation = useMutation({
    mutationFn: () =>
      adminApi.ai.updatePrompts({ taskType, systemCore, taskInstructions, versionLabel }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ai", "prompts"] });
      toast.success(text.savedPrompt);
    },
    onError: (error) => toast.error(errorMessage(error))
  });
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_0_rgba(8,9,10,0.03)]">
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>{text.promptTitle}</CardTitle>
              <CardDescription>{text.promptDescription}</CardDescription>
            </div>
            <select
              className={selectClass}
              value={taskType}
              onChange={(event) => onTaskChange(event.target.value as AiTaskType)}
              aria-label="AI task"
            >
              {aiTasks.map((task) => (
                <option key={task.taskType} value={task.taskType}>
                  {task.label[locale]}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
            <Field label={text.versionLabel}>
              <Input
                value={versionLabel}
                onChange={(event) => setVersionLabel(event.target.value)}
              />
            </Field>
            <div className={`${adminSubPanelClass} text-xs text-muted-foreground`}>
              {text.updated}: {formatDate(prompt?.updatedAt) ?? text.neverSaved}
            </div>
          </div>
          <Field label={text.systemPrompt}>
            <Textarea
              className="min-h-40 font-mono text-xs"
              value={systemCore}
              onChange={(event) => setSystemCore(event.target.value)}
              maxLength={20000}
            />
          </Field>
          <Field label={text.taskPrompt}>
            <Textarea
              className="min-h-56 font-mono text-xs"
              value={taskInstructions}
              onChange={(event) => setTaskInstructions(event.target.value)}
              maxLength={20000}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" loading={mutation.isPending} onClick={() => mutation.mutate()}>
              {text.savePrompt}
            </Button>
            {placeholders.invalid.length ? (
              <Badge intent="danger">
                {text.invalidPlaceholders}: {placeholders.invalid.join(", ")}
              </Badge>
            ) : (
              <Badge intent="success">{text.validPlaceholders}</Badge>
            )}
          </div>
        </CardContent>
      </Card>
      <aside className="space-y-4">
        <ProtectedBlock title={text.readonlyBlocks} lines={text.automaticBlocks} />
        <ProtectedBlock
          title={text.supportedPlaceholders}
          lines={allowedPlaceholders.map((item) => `{{${item}}}`)}
        />
        <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_0_rgba(8,9,10,0.03)]">
          <CardHeader>
            <CardTitle>{text.activeSchema}</CardTitle>
            <CardDescription>
              {schema?.schemaVersion ?? "v1"} · {text.protectedReadonly}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-80 overflow-auto rounded-md border bg-muted p-3 text-xs">
              {JSON.stringify(schema?.json ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function SchemasTab({
  schemas,
  text,
  locale
}: {
  schemas: AdminAiSchema[];
  text: AiCopy;
  locale: AdminLocale;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {schemas.map((schema) => (
        <Card
          key={schema.taskType}
          className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_0_rgba(8,9,10,0.03)]"
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{taskLabel(schema.taskType, locale)}</CardTitle>
                <CardDescription>
                  {text.version} {schema.schemaVersion}
                </CardDescription>
              </div>
              <Badge intent="primary">{text.readonly}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded-md border bg-muted p-3 text-xs">
              {JSON.stringify(schema.json, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TestHarnessTab({ text, locale }: { text: AiCopy; locale: AdminLocale }) {
  const queryClient = useQueryClient();
  const [taskType, setTaskType] = useState<AiTaskType>("opportunity_analysis");
  const [context, setContext] = useState(() => defaultSyntheticContext(locale));
  const [result, setResult] = useState<AdminAiTestRun | null>(null);
  const resultId = runId(result);
  const liveRun = useQuery({
    queryKey: ["admin", "ai", "test-run", resultId],
    queryFn: () => adminApi.ai.run(resultId!),
    enabled: Boolean(resultId) && !isTerminalRunStatus(result?.status),
    refetchInterval: (query) => (isTerminalRunStatus(query.state.data?.status) ? false : 1500)
  });
  useEffect(() => {
    if (!liveRun.data) return;
    if (isTerminalRunStatus(liveRun.data.status)) {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ai", "usage"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "ai", "providers"] });
    }
  }, [liveRun.data, queryClient]);
  const mutation = useMutation({
    mutationFn: () =>
      adminApi.ai.test({ taskType, context: parseContext(context, text.invalidJson) }),
    onSuccess: (run) => {
      setResult(run);
      void queryClient.invalidateQueries({ queryKey: ["admin", "ai", "test-run", runId(run)] });
      toast.success(text.queued);
    },
    onError: (error) => toast.error(errorMessage(error))
  });
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] [&>*]:min-w-0">
      <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_0_rgba(8,9,10,0.03)]">
        <CardHeader>
          <CardTitle>{text.testTitle}</CardTitle>
          <CardDescription>{text.testDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={text.taskTemplate}>
            <select
              className={`${selectClass} w-full`}
              value={taskType}
              onChange={(event) => setTaskType(event.target.value as AiTaskType)}
            >
              {aiTasks.map((task) => (
                <option key={task.taskType} value={task.taskType}>
                  {task.label[locale]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={text.syntheticContext}>
            <Textarea
              className="min-h-64 font-mono text-xs"
              value={context}
              onChange={(event) => setContext(event.target.value)}
            />
          </Field>
          <Button type="button" loading={mutation.isPending} onClick={() => mutation.mutate()}>
            {text.runTest}
          </Button>
        </CardContent>
      </Card>
      <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_0_rgba(8,9,10,0.03)]">
        <CardHeader>
          <CardTitle>{text.result}</CardTitle>
          <CardDescription>{text.resultDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            <RunSummary
              run={liveRun.data ?? result}
              text={text}
              locale={locale}
              isRefreshing={liveRun.isFetching}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{text.resultEmpty}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RunSummary({
  run,
  text,
  locale,
  isRefreshing
}: {
  run: AdminAiTestRun;
  text: AiCopy;
  locale: AdminLocale;
  isRefreshing: boolean;
}) {
  return (
    <div className="space-y-4" aria-live="polite">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Row label={text.runId} value={runId(run) ?? "—"} />
        <Row label={text.task} value={taskLabel(run.taskType, locale)} />
        <Row
          label={text.status}
          value={`${runStatusLabel(run.status, text)}${isRefreshing ? ` · ${text.liveRefresh}` : ""}`}
        />
        <Row label={text.provider} value={providerLabel(run.provider)} />
        <Row label={text.model} value={run.modelId ?? "—"} />
        <Row label={text.duration} value={formatDuration(run.startedAt, run.completedAt)} />
        {run.errorSummary || run.errorCode ? (
          <Row
            label={text.error}
            value={runErrorMessage(run.errorCode, run.errorSummary, locale)}
            danger
          />
        ) : null}
      </dl>
      <JsonBlock title={text.usage} value={run.usage} />
      <JsonBlock title={text.resultJson} value={run.structuredOutput} />
    </div>
  );
}

function ProviderSelect({
  value,
  onChange,
  allowEmpty,
  text
}: {
  value: AiProvider | "";
  onChange: (value: AiProvider | "") => void;
  allowEmpty?: boolean;
  text: AiCopy;
}) {
  return (
    <select
      className={`${selectClass} w-full min-w-0`}
      value={value}
      onChange={(event) => onChange(event.target.value as AiProvider | "")}
    >
      {allowEmpty ? <option value="">{text.noFallback}</option> : null}
      {aiProviders.map((item) => (
        <option key={item.provider} value={item.provider}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function Field({
  label,
  hint,
  children,
  className
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("space-y-1.5 text-sm", className)}>
      <span className="font-medium">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function ProtectedBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_0_rgba(8,9,10,0.03)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-1.5">
        {lines.map((line) => (
          <Badge key={line} intent="neutral">
            {line}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}

function JsonBlock({ title, value }: { title: string; value?: Record<string, unknown> }) {
  if (!value || !Object.keys(value).length) return null;
  return (
    <div className="min-w-0 space-y-1.5">
      <h3 className="text-sm font-medium">{title}</h3>
      <pre className="max-h-72 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted p-3 text-xs [overflow-wrap:anywhere]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function defaultSyntheticContext(locale: AdminLocale) {
  const note =
    locale === "ru"
      ? "Синтетический контекст без приватных данных пользователей."
      : "Synthetic context without private user data.";
  return JSON.stringify({ synthetic: true, note }, null, 2);
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 break-words font-medium", danger && "text-destructive")}>{value}</dd>
    </div>
  );
}

const allowedPlaceholders = [
  "profile",
  "opportunity",
  "userPreferences",
  "customPrompt",
  "privateKnowledgeContext",
  "outputSchema"
];

function supportedPlaceholders(value: string) {
  const found = [...value.matchAll(/{{\s*([\w.]+)\s*}}/g)].map((match) => match[1]);
  return {
    found,
    invalid: found.filter((item) => !allowedPlaceholders.includes(item.split(".")[0]))
  };
}

function parseContext(value: string, invalidMessage: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      return parsed as Record<string, unknown>;
    throw new Error(invalidMessage);
  } catch {
    throw new Error(invalidMessage);
  }
}

function healthLabel(
  health: Record<string, unknown> | undefined,
  text: AiCopy,
  locale: AdminLocale
) {
  if (!health || !Object.keys(health).length) return text.healthUnchecked;
  const items = [
    typeof health.status === "string" ? runStatusLabel(health.status, text) : null,
    typeof health.modelId === "string" ? health.modelId : null,
    typeof health.latencyMs === "number" ? `${health.latencyMs} ms` : null,
    typeof health.errorCode === "string" ? localizedError(health.errorCode, locale) : null,
    health.persisted === false ? text.staleProviderTest : null
  ].filter((item): item is string => Boolean(item));
  return items.length ? items.join(" · ") : text.healthUnchecked;
}

function providerTestMessage(
  errorCode: string | undefined,
  message: string | undefined,
  persisted: boolean | undefined,
  text: AiCopy,
  locale: AdminLocale
) {
  if (persisted === false) return `${text.providerTestFailed}: ${text.staleProviderTest}`;
  const localized = errorCode ? localizedError(errorCode, locale) : null;
  if (localized) return `${text.providerTestFailed}: ${localized}`;
  if (locale === "en" && message) return `${text.providerTestFailed}: ${message}`;
  return text.providerTestFailed;
}

function runStatusLabel(status: string | undefined, text: AiCopy) {
  if (!status) return "—";
  return text.statusLabels[status as keyof typeof text.statusLabels] ?? status;
}

function runErrorMessage(
  errorCode: string | undefined,
  errorSummary: string | undefined,
  locale: AdminLocale
) {
  const localized = errorCode ? localizedError(errorCode, locale) : null;
  if (localized) return localized;
  if (locale === "en" && errorSummary) return errorSummary;
  return locale === "ru" ? "Сервис вернул ошибку." : "The service returned an error.";
}

function localizedError(code: string, locale: AdminLocale) {
  const ru: Record<string, string> = {
    AI_PROVIDER_UNAVAILABLE: "Провайдер не настроен или недоступен.",
    AI_ROUTE_UNAVAILABLE: "Для этой задачи не настроен маршрут.",
    AI_RUN_FAILED: "AI-запуск завершился ошибкой.",
    INVALID_ARGUMENT: "Модель или параметры запроса не приняты сервисом.",
    AI_PROVIDER_TEST_FAILED: "Проверка провайдера завершилась ошибкой."
  };
  const en: Record<string, string> = {
    AI_PROVIDER_UNAVAILABLE: "Provider is not configured or unavailable.",
    AI_ROUTE_UNAVAILABLE: "No route is configured for this task.",
    AI_RUN_FAILED: "AI launch failed.",
    INVALID_ARGUMENT: "The service did not accept the model or request parameters.",
    AI_PROVIDER_TEST_FAILED: "Provider check failed."
  };
  return (locale === "ru" ? ru : en)[code] ?? null;
}

function defaultModelForProvider(provider: AiProvider) {
  return aiProviders.find((item) => item.provider === provider)?.defaultModel ?? "";
}

function runId(run: AdminAiTestRun | null | undefined) {
  return run?.id ?? run?._id ?? undefined;
}

function isTerminalRunStatus(status?: AdminAiTestRun["status"]) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function formatDuration(startedAt?: string, completedAt?: string) {
  if (!startedAt || !completedAt) return "—";
  const started = new Date(startedAt).getTime();
  const completed = new Date(completedAt).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started) return "—";
  return `${completed - started} ms`;
}

function clampNumber(value: string, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function formatDate(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleString("ru-RU");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось выполнить действие";
}
