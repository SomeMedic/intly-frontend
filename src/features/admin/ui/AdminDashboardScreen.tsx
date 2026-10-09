"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  DatabaseZap,
  ExternalLink,
  ListChecks,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";
import type { AdminJobQueueCounts, AdminSource, AdminSummary, AdminUser, ApiList } from "@/types";
import { adminApi } from "../api/admin-api";
import type { AdminAiProviderConfig, AdminAiRouteConfig, AdminAiUsageRow } from "../adminAI/types";
import { providerLabel, taskLabel } from "../adminAI/catalog";
import {
  AdminFrame,
  AdminMetric,
  AdminQueryState,
  AdminSection,
  adminSubPanelClass
} from "./AdminShared";
import { healthLabels, localizedLabel, sourceGroupLabels, totalQueueCount } from "./admin-format";
import type { AdminLocale } from "./admin-locale";
import { useAdminLocale } from "./admin-locale";
import { AdminInfrastructurePanel } from "./AdminInfrastructurePanel";

type DashboardCopy = {
  title: string;
  description: string;
  users: string;
  usersDescription: string;
  sources: string;
  sourcesDescription: string;
  jobs: string;
  jobsDescription: string;
  ai: string;
  aiDescription: string;
  open: string;
  total: string;
  active: string;
  admins: string;
  invited: string;
  enabled: string;
  healthy: string;
  failed: string;
  queues: string;
  waiting: string;
  providersReady: string;
  routes: string;
  runs: string;
  recentSources: string;
  currentQueues: string;
  providerRoutes: string;
  unknown: string;
  noData: string;
  errorTitle: string;
};

const dashboardCopy: Record<AdminLocale, DashboardCopy> = {
  ru: {
    title: "Администрирование",
    description: "Операционная сводка по пользователям, источникам, очередям и AI.",
    users: "Пользователи",
    usersDescription: "Аккаунты, роли и состояния приглашений.",
    sources: "Источники",
    sourcesDescription: "Коннекторы, состояние проверки и включение сбора.",
    jobs: "Очереди",
    jobsDescription: "Состояние фоновых задач по очередям.",
    ai: "AI",
    aiDescription: "Провайдеры, маршруты и результаты AI-задач.",
    open: "Перейти",
    total: "Всего",
    active: "Активные",
    admins: "Админы",
    invited: "Приглашены",
    enabled: "Включены",
    healthy: "Здоровы",
    failed: "Ошибки",
    queues: "Очередей",
    waiting: "Ожидают",
    providersReady: "Провайдеры готовы",
    routes: "Маршруты",
    runs: "Запуски",
    recentSources: "Источники",
    currentQueues: "Текущие очереди",
    providerRoutes: "Провайдеры и маршруты",
    unknown: "неизвестно",
    noData: "Данных пока нет.",
    errorTitle: "Не удалось загрузить блок"
  },
  en: {
    title: "Administration",
    description: "Operational snapshot for users, sources, queues and AI.",
    users: "Users",
    usersDescription: "Accounts, roles and invitation states.",
    sources: "Sources",
    sourcesDescription: "Connectors, health and collection enablement.",
    jobs: "Queues",
    jobsDescription: "Background job status by queue.",
    ai: "AI",
    aiDescription: "Providers, routes and AI task results.",
    open: "Go",
    total: "Total",
    active: "Active",
    admins: "Admins",
    invited: "Invited",
    enabled: "Enabled",
    healthy: "Healthy",
    failed: "Failed",
    queues: "Queues",
    waiting: "Waiting",
    providersReady: "Providers ready",
    routes: "Routes",
    runs: "Runs",
    recentSources: "Sources",
    currentQueues: "Current queues",
    providerRoutes: "Providers and routes",
    unknown: "unknown",
    noData: "No data yet.",
    errorTitle: "Could not load section"
  }
};

export function AdminDashboardScreen() {
  const locale = useAdminLocale();
  const text = dashboardCopy[locale];
  const { user, bootstrapped } = useAuth();
  const canLoadAdmin = bootstrapped && user?.role === "Admin";
  const query = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: adminApi.dashboard,
    enabled: canLoadAdmin
  });
  return (
    <AdminFrame title={text.title} description={text.description}>
      <AdminInfrastructurePanel enabled={canLoadAdmin} locale={locale} />
      <AdminQueryState
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
      >
        <DashboardContent summary={query.data ?? {}} text={text} locale={locale} />
      </AdminQueryState>
    </AdminFrame>
  );
}

function DashboardContent({
  summary,
  text,
  locale
}: {
  summary: AdminSummary;
  text: DashboardCopy;
  locale: AdminLocale;
}) {
  const users = listFromSummary<AdminUser>(summary.users);
  const sources = listFromSummary<AdminSource>(summary.sources);
  const jobs = jobsFromSummary(summary.jobs);
  const providers = listFromSummary<AdminAiProviderConfig>(summary.providers);
  const routes = listFromSummary<AdminAiRouteConfig>(summary.routes);
  const usage = listFromSummary<AdminAiUsageRow>(summary.aiUsage);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <SummaryCard
          icon={<Users className="size-5" />}
          title={text.users}
          description={text.usersDescription}
          href="/admin/users"
          text={text}
          error={users.error}
          metrics={[
            { label: text.total, value: countLabel(users.items?.length, text) },
            { label: text.active, value: countBy(users.items, (item) => item.status === "Active") },
            { label: text.admins, value: countBy(users.items, (item) => item.role === "Admin") },
            {
              label: text.invited,
              value: countBy(users.items, (item) => item.status === "Invited")
            }
          ]}
        />
        <SummaryCard
          icon={<DatabaseZap className="size-5" />}
          title={text.sources}
          description={text.sourcesDescription}
          href="/admin/sources"
          text={text}
          error={sources.error}
          metrics={[
            { label: text.total, value: countLabel(sources.items?.length, text) },
            { label: text.enabled, value: countBy(sources.items, (item) => item.enabled) },
            {
              label: text.healthy,
              value: countBy(
                sources.items,
                (item) => (item.healthState ?? item.status) === "Healthy"
              )
            },
            {
              label: text.failed,
              value: countBy(
                sources.items,
                (item) => (item.healthState ?? item.status) === "Failed"
              )
            }
          ]}
        />
        <SummaryCard
          icon={<ListChecks className="size-5" />}
          title={text.jobs}
          description={text.jobsDescription}
          href="/admin/jobs"
          text={text}
          error={jobs.error}
          metrics={[
            { label: text.queues, value: countLabel(jobs.items?.length, text) },
            { label: text.active, value: sumQueueState(jobs.items, "active", text) },
            { label: text.waiting, value: sumQueueState(jobs.items, "waiting", text) },
            { label: text.failed, value: sumQueueState(jobs.items, "failed", text) }
          ]}
        />
        <SummaryCard
          icon={<Bot className="size-5" />}
          title={text.ai}
          description={text.aiDescription}
          href="/admin/ai"
          text={text}
          error={providers.error ?? routes.error ?? usage.error}
          metrics={[
            {
              label: text.providersReady,
              value: countBy(providers.items, (item) => item.enabled && Boolean(item.apiKeyMasked))
            },
            { label: text.routes, value: countLabel(routes.items?.length, text) },
            { label: text.runs, value: sumUsageRuns(usage.items, text) },
            { label: text.failed, value: sumFailedUsageRuns(usage.items, text) }
          ]}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title={text.recentSources} error={sources.error} text={text}>
          {sources.items
            ?.slice(0, 5)
            .map((source) => (
              <SourceRow
                key={source.id ?? source._id ?? source.name}
                source={source}
                locale={locale}
              />
            )) ?? null}
          {sources.items && !sources.items.length ? <Empty text={text.noData} /> : null}
        </Panel>
        <Panel title={text.currentQueues} error={jobs.error} text={text}>
          {jobs.items
            ?.slice(0, 6)
            .map((queue) => <QueueRow key={queue.name} queue={queue} text={text} />) ?? null}
          {jobs.items && !jobs.items.length ? <Empty text={text.noData} /> : null}
        </Panel>
        <Panel title={text.providerRoutes} error={providers.error ?? routes.error} text={text}>
          {providers.items?.map((provider) => (
            <ProviderRow key={provider.provider} provider={provider} />
          )) ?? null}
          {routes.items
            ?.slice(0, 4)
            .map((route) => <RouteRow key={route.taskType} route={route} />) ?? null}
          {providers.items && routes.items && !providers.items.length && !routes.items.length ? (
            <Empty text={text.noData} />
          ) : null}
        </Panel>
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  description,
  href,
  text,
  error,
  metrics
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  text: DashboardCopy;
  error?: string;
  metrics: Array<{ label: string; value: string }>;
}) {
  return (
    <AdminSection>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-primary">{icon}</span>
            <h2 className="break-words font-semibold">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href={href}>{text.open}</Link>
        </Button>
      </div>
      {error ? (
        <ErrorBlock error={error} text={text} />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {metrics.map((metric) => (
            <AdminMetric key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>
      )}
    </AdminSection>
  );
}

function Panel({
  title,
  error,
  text,
  children
}: {
  title: string;
  error?: string;
  text: DashboardCopy;
  children: ReactNode;
}) {
  return (
    <AdminSection title={title}>
      {error ? (
        <ErrorBlock error={error} text={text} />
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </AdminSection>
  );
}

function SourceRow({ source, locale }: { source: AdminSource; locale: AdminLocale }) {
  const state = source.healthState ?? source.status ?? "Unknown";
  return (
    <div className={`${adminSubPanelClass} text-sm`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{source.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {localizedLabel(sourceGroupLabels, source.group, locale)} · {source.connectorFamily}
          </p>
        </div>
        <Badge intent={state === "Failed" ? "danger" : state === "Healthy" ? "success" : "neutral"}>
          {localizedLabel(healthLabels, state, locale)}
        </Badge>
      </div>
    </div>
  );
}

function QueueRow({ queue, text }: { queue: AdminJobQueueCounts; text: DashboardCopy }) {
  const failed = queue.counts.failed ?? 0;
  return (
    <div className={`${adminSubPanelClass} text-sm`}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-medium">{queue.name}</p>
        <Badge intent={failed ? "danger" : "neutral"}>{totalQueueCount(queue.counts)}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {text.active}: {queue.counts.active ?? 0} · {text.waiting}: {queue.counts.waiting ?? 0} ·{" "}
        {text.failed}: {failed}
      </p>
      {queue.error ? <p className="mt-1 text-xs text-destructive">{queue.error}</p> : null}
    </div>
  );
}

function ProviderRow({ provider }: { provider: AdminAiProviderConfig }) {
  return (
    <div className={`${adminSubPanelClass} text-sm`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{providerLabel(provider.provider)}</p>
        {provider.enabled && provider.apiKeyMasked ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : (
          <AlertTriangle className="size-4 text-warning" />
        )}
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {provider.baseUrl ?? "SDK default"}
      </p>
    </div>
  );
}

function RouteRow({ route }: { route: AdminAiRouteConfig }) {
  return (
    <div className={`${adminSubPanelClass} text-sm`}>
      <p className="font-medium">{taskLabel(route.taskType)}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <ExternalLink className="size-3" />
        {providerLabel(route.primaryProvider)} · {route.primaryModel}
      </p>
    </div>
  );
}

function ErrorBlock({ error, text }: { error: string; text: DashboardCopy }) {
  return (
    <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
      <p className="font-medium text-destructive">{text.errorTitle}</p>
      <p className="mt-1 break-words text-xs text-muted-foreground">{error}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className={`${adminSubPanelClass} text-sm text-muted-foreground`}>{text}</p>;
}

function listFromSummary<T>(value: AdminSummary[keyof AdminSummary]) {
  if (isErrorValue(value)) return { error: value.error };
  if (isApiList<T>(value)) return { items: value.items };
  return { items: undefined };
}

function jobsFromSummary(value: AdminSummary[keyof AdminSummary]) {
  if (isErrorValue(value)) return { error: value.error };
  if (isApiList<AdminJobQueueCounts>(value)) return { items: value.items };
  return { items: undefined };
}

function isApiList<T>(value: unknown): value is ApiList<T> {
  return Boolean(
    value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)
  );
}

function isErrorValue(value: unknown): value is { error: string } {
  return Boolean(
    value && typeof value === "object" && typeof (value as { error?: unknown }).error === "string"
  );
}

function countLabel(value: number | undefined, text: DashboardCopy) {
  return value === undefined ? text.unknown : String(value);
}

function countBy<T>(items: T[] | undefined, predicate: (item: T) => boolean) {
  if (!items) return "—";
  return String(items.filter(predicate).length);
}

function sumQueueState(
  items: AdminJobQueueCounts[] | undefined,
  state: string,
  text: DashboardCopy
) {
  if (!items) return text.unknown;
  return String(items.reduce((sum, item) => sum + (item.counts[state] ?? 0), 0));
}

function sumUsageRuns(items: AdminAiUsageRow[] | undefined, text: DashboardCopy) {
  if (!items) return text.unknown;
  return String(items.reduce((sum, item) => sum + (item.runs ?? 0), 0));
}

function sumFailedUsageRuns(items: AdminAiUsageRow[] | undefined, text: DashboardCopy) {
  if (!items) return text.unknown;
  return String(
    items.reduce(
      (sum, item) => sum + ((item.id ?? item._id)?.status === "failed" ? (item.runs ?? 0) : 0),
      0
    )
  );
}
