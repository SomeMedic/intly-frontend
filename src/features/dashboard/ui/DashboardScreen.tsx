"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ListChecks, Settings2 } from "lucide-react";
import type { DashboardEvent, DashboardPeriod, DashboardTask, OpportunityMini } from "@/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BrandArt } from "@/components/intly/brand";
import { EmptyState } from "@/components/intly/empty-state";
import { ErrorState } from "@/components/intly/error-state";
import { KpiCard } from "@/components/intly/kpi-card";
import { KpiCardSkeleton, OpportunityCardSkeleton } from "@/components/intly/loading";
import { OpportunityCard } from "@/components/intly/opportunity-card";
import { HealthIndicator } from "@/components/intly/health-indicator";
import { useAuth } from "@/features/auth";
import { eventTypeLabels, priorityLabels } from "@/features/workflows";
import { settingsApi } from "@/features/settings";
import { dashboardApi } from "../api/dashboard-api";
import { useDashboardSummary } from "../model/use-dashboard-summary";

const widgetOrder = ["recommended", "watchlistHits", "recentlyAdded", "tasks", "events", "profile", "health"] as const;
type WidgetId = (typeof widgetOrder)[number];
const periodValues: DashboardPeriod[] = ["today", "7d", "30d", "90d"];

const copy = {
  ru: {
    title: "Сводка",
    loading: "Загружаем рабочую сводку",
    unavailable: "Данные временно недоступны",
    loadError: "Не удалось загрузить рабочую сводку. Повторите запрос.",
    noData: "Нет данных",
    emptyTitle: "Сводка пока пуста",
    emptyDescription: "После подключения источников здесь появятся KPI, рекомендации и задачи.",
    operationalTitle: "Операционная сводка",
    profile: "Профиль",
    profileMissing: "не выбран",
    customize: "Настроить",
    dashboardWidgets: "Виджеты сводки",
    viewAll: "Все",
    open: "Открыть",
    sources: "Источники",
    active: "активных",
    noProfile: "Профиль не выбран",
    noRecords: "Нет записей",
    recordsDescription: "Новые подходящие записи появятся здесь автоматически.",
    noTasks: "Нет срочных задач",
    noEvents: "Нет ближайших событий",
    untitledTask: "Задача без названия",
    untitledEvent: "Событие без названия",
    greeting: "Добрый день",
    periods: { today: "Сегодня", "7d": "7 дней", "30d": "30 дней", "90d": "90 дней", custom: "Период" },
    widgets: {
      recommended: "Рекомендации",
      watchlistHits: "Совпадения правил",
      recentlyAdded: "Недавно добавлено",
      tasks: "Задачи к сроку",
      events: "Ближайшие события",
      profile: "Активный профиль",
      health: "Состояние источников"
    } satisfies Record<WidgetId, string>
  },
  en: {
    title: "Dashboard",
    loading: "Loading workspace summary",
    unavailable: "Data is temporarily unavailable",
    loadError: "Could not load the workspace summary. Try again.",
    noData: "No data",
    emptyTitle: "Dashboard is empty",
    emptyDescription: "KPIs, recommendations, and tasks will appear here after sources are connected.",
    operationalTitle: "Operational summary",
    profile: "Profile",
    profileMissing: "not selected",
    customize: "Customize",
    dashboardWidgets: "Dashboard widgets",
    viewAll: "View all",
    open: "Open",
    sources: "Sources",
    active: "active",
    noProfile: "No profile selected",
    noRecords: "No records",
    recordsDescription: "New matching records will appear here automatically.",
    noTasks: "No urgent tasks",
    noEvents: "No upcoming events",
    untitledTask: "Untitled task",
    untitledEvent: "Untitled event",
    greeting: "Good afternoon",
    periods: { today: "Today", "7d": "7 days", "30d": "30 days", "90d": "90 days", custom: "Custom" },
    widgets: {
      recommended: "Recommended",
      watchlistHits: "Watchlist hits",
      recentlyAdded: "Recently added",
      tasks: "Tasks due",
      events: "Upcoming events",
      profile: "Active profile",
      health: "System health"
    } satisfies Record<WidgetId, string>
  }
} as const;

export function DashboardScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const locale = user?.settings.locale === "en" ? "en" : "ru";
  const text = copy[locale];
  const [customizing, setCustomizing] = useState(false);
  const [localSettings, setLocalSettings] = useState<{ period: DashboardPeriod; widgets: string[] } | null>(null);
  const settings = useQuery({ queryKey: ["settings", "dashboard"], queryFn: settingsApi.dashboardSettings });
  const dashboardSettings = localSettings ?? settings.data ?? { period: "7d" as DashboardPeriod, widgets: [...widgetOrder] };
  const query = useDashboardSummary(dashboardSettings.period);
  const favorite = useMutation({
    mutationFn: ({ id, profileId, value }: { id: string; profileId: string; value: boolean }) => dashboardApi.setFavorite(id, profileId, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  });
  const saveSettings = useMutation({
    mutationFn: settingsApi.updateDashboardSettings,
    onSuccess: (next) => {
      setLocalSettings(next);
      queryClient.invalidateQueries({ queryKey: ["settings", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  function updateSettings(next: { period?: DashboardPeriod; widgets?: string[] }) {
    const merged = { ...dashboardSettings, ...next };
    setLocalSettings(merged);
    saveSettings.mutate(merged);
  }

  function toggleWidget(id: WidgetId, checked: boolean) {
    const widgets = checked ? Array.from(new Set([...dashboardSettings.widgets, id])) : dashboardSettings.widgets.filter((item) => item !== id);
    updateSettings({ widgets });
  }

  if (query.isLoading || settings.isLoading) {
    return (
      <DashboardFrame userName={user?.name ?? ""} statusLine={text.loading} text={text}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => <KpiCardSkeleton key={index} />)}
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_22rem]">
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <OpportunityCardSkeleton key={index} />)}</div>
        </div>
      </DashboardFrame>
    );
  }

  if (query.isError) {
    return (
      <DashboardFrame userName={user?.name ?? ""} statusLine={text.unavailable} text={text}>
        <ErrorState message={text.loadError} onRetry={() => query.refetch()} />
      </DashboardFrame>
    );
  }

  const data = query.data;
  if (!data) {
    return (
      <DashboardFrame userName={user?.name ?? ""} statusLine={text.noData} text={text}>
        <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
      </DashboardFrame>
    );
  }

  const visible = new Set(dashboardSettings.widgets);
  const activeProfileId = data.activeProfile?.id;

  return (
    <DashboardFrame userName={data.userName} statusLine={data.statusLine} text={text}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <BrandArt kind={data.activeProfile ? "analysis" : "gateway"} className="hidden w-24 shrink-0 sm:block lg:w-28" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{text.operationalTitle}</h2>
            <p className="text-sm text-muted-foreground">{text.profile}: {data.activeProfile?.name ?? text.profileMissing}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-[var(--control-height)] rounded-md border bg-card px-3 text-sm" value={dashboardSettings.period} onChange={(event) => updateSettings({ period: event.target.value as DashboardPeriod })}>
            {periodValues.map((value) => <option key={value} value={value}>{text.periods[value]}</option>)}
          </select>
          <Button variant="outline" onClick={() => setCustomizing((value) => !value)} loading={saveSettings.isPending}>
            <Settings2 className="size-4" />
            {text.customize}
          </Button>
        </div>
      </div>

      {customizing ? (
        <section className="mt-4 rounded-lg border bg-card/70 p-3">
          <h3 className="font-semibold">{text.dashboardWidgets}</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {widgetOrder.map((id) => (
              <label key={id} className="flex items-center justify-between rounded-md border bg-background/60 p-3 text-sm">
                <span>{text.widgets[id]}</span>
                <Switch checked={visible.has(id)} onCheckedChange={(checked) => toggleWidget(id, Boolean(checked))} />
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((metric) => <KpiCard key={metric.id} metric={metric} />)}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {visible.has("recommended") ? <OpportunityWidget title={text.widgets.recommended} href="/opportunities?sort=recommended" items={data.recommended} activeProfileId={activeProfileId} viewAllLabel={text.viewAll} emptyTitle={text.noRecords} emptyDescription={text.recordsDescription} onFavorite={(id, value) => activeProfileId && favorite.mutate({ id, profileId: activeProfileId, value })} /> : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.has("watchlistHits") ? <OpportunityWidget title={text.widgets.watchlistHits} href="/watchlists" items={data.watchlistHits} activeProfileId={activeProfileId} viewAllLabel={text.viewAll} emptyTitle={text.noRecords} emptyDescription={text.recordsDescription} onFavorite={(id, value) => activeProfileId && favorite.mutate({ id, profileId: activeProfileId, value })} /> : null}
            {visible.has("recentlyAdded") ? <OpportunityWidget title={text.widgets.recentlyAdded} href="/opportunities?sort=newest" items={data.recentlyAdded} activeProfileId={activeProfileId} viewAllLabel={text.viewAll} emptyTitle={text.noRecords} emptyDescription={text.recordsDescription} onFavorite={(id, value) => activeProfileId && favorite.mutate({ id, profileId: activeProfileId, value })} /> : null}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.has("tasks") ? <TasksWidget items={data.tasks ?? []} title={text.widgets.tasks} viewAllLabel={text.viewAll} empty={text.noTasks} untitled={text.untitledTask} /> : null}
            {visible.has("events") ? <EventsWidget items={data.events ?? []} title={text.widgets.events} viewAllLabel={text.viewAll} empty={text.noEvents} untitled={text.untitledEvent} /> : null}
          </div>
        </div>
        <aside className="space-y-4">
          {visible.has("profile") ? (
            <section className="rounded-lg border bg-card p-[var(--card-padding)]">
              <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{text.widgets.profile}</h3><Button size="sm" variant="ghost" asChild><Link href={data.activeProfile ? `/profiles/${data.activeProfile.id}` : "/profiles"}>{text.open}</Link></Button></div>
              {data.activeProfile ? (
                <div className="mt-3 space-y-3 text-sm">
                  <p className="font-medium">{data.activeProfile.targetRole}</p>
                  <p className="text-muted-foreground">{[data.activeProfile.seniority, data.activeProfile.technologies.slice(0, 4).join(", ")].filter(Boolean).join(" · ")}</p>
                  <p className="text-muted-foreground">{text.sources}: {data.activeProfile.activeSourceCount} {text.active}</p>
                </div>
              ) : <EmptyState className="mt-3 p-5" title={text.noProfile} />}
            </section>
          ) : null}
          {visible.has("health") ? <HealthIndicator health={data.systemHealth} /> : null}
        </aside>
      </section>
    </DashboardFrame>
  );
}

function DashboardFrame({ userName, statusLine, text, children }: { userName: string; statusLine: string; text: (typeof copy)["ru"] | (typeof copy)["en"]; children: ReactNode }) {
  return (
    <div>
      <header className="mb-5">
        <p className="text-sm text-muted-foreground">{text.greeting}{userName ? `, ${userName}` : ""}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal">{text.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{statusLine}</p>
      </header>
      {children}
    </div>
  );
}

function OpportunityWidget({ title, href, items, activeProfileId, viewAllLabel, emptyTitle, emptyDescription, onFavorite }: { title: string; href: string; items: OpportunityMini[]; activeProfileId?: string; viewAllLabel: string; emptyTitle: string; emptyDescription: string; onFavorite: (id: string, favorite: boolean) => void }) {
  return (
    <section className="rounded-lg border bg-card/45 p-[var(--card-padding)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Button size="sm" variant="ghost" asChild><Link href={href}>{viewAllLabel}</Link></Button>
      </div>
      {items.length ? <div className="space-y-3">{items.slice(0, 5).map((item) => <OpportunityCard key={item.id} opportunity={item} onFavoriteChange={activeProfileId ? onFavorite : undefined} />)}</div> : <EmptyState className="p-5" title={emptyTitle} description={emptyDescription} />}
    </section>
  );
}

function TasksWidget({ items, title, viewAllLabel, empty, untitled }: { items: DashboardTask[]; title: string; viewAllLabel: string; empty: string; untitled: string }) {
  const { user } = useAuth();
  const locale = user?.settings.locale === "en" ? "en" : "ru";
  return <ListWidget title={title} href="/tasks" viewAllLabel={viewAllLabel} icon={<ListChecks className="size-4" />} items={items.map((item) => ({ id: item.id ?? item._id ?? item.title ?? "task", title: item.title ?? untitled, meta: [item.priority ? priorityLabels[locale][item.priority] ?? item.priority : null, item.dueAt ? new Date(item.dueAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { timeZone: user?.settings.timezone }) : null].filter(Boolean).join(" · ") }))} empty={empty} />;
}

function EventsWidget({ items, title, viewAllLabel, empty, untitled }: { items: DashboardEvent[]; title: string; viewAllLabel: string; empty: string; untitled: string }) {
  const { user } = useAuth();
  const locale = user?.settings.locale === "en" ? "en" : "ru";
  return <ListWidget title={title} href="/calendar" viewAllLabel={viewAllLabel} icon={<CalendarDays className="size-4" />} items={items.map((item) => ({ id: item.id ?? item._id ?? item.title ?? "event", title: item.title ?? untitled, meta: [item.type ? eventTypeLabels[locale][item.type] ?? (locale === "ru" ? "Событие" : "Event") : null, item.startAt ? new Date(item.startAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-US", { timeZone: user?.settings.timezone, dateStyle: "short", timeStyle: "short" }) : null].filter(Boolean).join(" · ") }))} empty={empty} />;
}

function ListWidget({ title, href, viewAllLabel, icon, items, empty }: { title: string; href: string; viewAllLabel: string; icon: ReactNode; items: Array<{ id: string; title: string; meta?: string }>; empty: string }) {
  return (
    <section className="rounded-lg border bg-card/45 p-[var(--card-padding)]">
      <div className="mb-3 flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-semibold">{icon}{title}</h3><Button size="sm" variant="ghost" asChild><Link href={href}>{viewAllLabel}</Link></Button></div>
      {items.length ? <div className="space-y-2">{items.slice(0, 6).map((item) => <article key={item.id} className="rounded-md border bg-card p-3"><p className="text-sm font-medium">{item.title}</p>{item.meta ? <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p> : null}</article>)}</div> : <EmptyState className="p-5" title={empty} />}
    </section>
  );
}
