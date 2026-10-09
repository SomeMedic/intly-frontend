"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Pause, Play, Plus, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Watchlist } from "@/types";
import { useDashboardSummary } from "@/features/dashboard";
import { useAuth } from "@/features/auth";
import { useProfiles } from "@/features/profiles";
import { workflowApi } from "../api/workflow-api";
import {
  QueryState,
  ScreenScaffold,
  workflowPanelClass,
  workflowSubPanelClass
} from "./ScreenScaffold";
import { resolveWorkflowLocale } from "./workflow-labels";
import { watchlistDraft, watchlistPatch, type WatchlistDraft } from "./watchlist-editor";

const selectClass =
  "h-[var(--control-height)] w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function WatchlistsScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const en = resolveWorkflowLocale(user?.settings.locale) === "en";
  const dashboard = useDashboardSummary();
  const profiles = useProfiles();
  const activeProfile = dashboard.data?.activeProfile;
  const [draft, setDraft] = useState(() => watchlistDraft());
  const query = useQuery({ queryKey: ["watchlists"], queryFn: workflowApi.watchlists.list });
  const create = useMutation({
    mutationFn: workflowApi.watchlists.create,
    onSuccess: async () => {
      setDraft(watchlistDraft());
      await queryClient.invalidateQueries({ queryKey: ["watchlists"] });
    }
  });
  const items = query.data?.items ?? [];

  return (
    <ScreenScaffold
      title={en ? "Autosearch" : "Автопоиск"}
      description={
        en
          ? "Rules that keep looking for matching opportunities while you work elsewhere."
          : "Правила сами находят подходящие возможности и сообщают о новых совпадениях."
      }
      artwork="analysis"
    >
      <details className={`${workflowPanelClass} mb-5`}>
        <summary className="cursor-pointer rounded-sm text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {en ? "Create autosearch" : "Создать автопоиск"}
        </summary>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {en
            ? "The first import fills match history quietly. New matches can notify you by the channels you choose."
            : "При первом запуске сохраняются уже найденные возможности. Уведомления о новых совпадениях приходят в выбранные каналы."}
        </p>
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (activeProfile && draft.name.trim())
              create.mutate({ ...watchlistPatch(draft), profileId: activeProfile.id });
          }}
        >
          <WatchlistFields draft={draft} onChange={setDraft} en={en} disabled={create.isPending} />
          {!activeProfile ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {en
                ? "Select a profile before creating a rule."
                : "Сначала выберите профиль, для которого будет работать правило."}
            </p>
          ) : null}
          <MutationError show={create.isError} en={en} />
          <Button
            className="mt-4"
            type="submit"
            loading={create.isPending}
            disabled={!activeProfile || !draft.name.trim()}
          >
            <Plus className="size-4" />
            {en ? "Create autosearch" : "Создать автопоиск"}
          </Button>
        </form>
      </details>
      <QueryState
        isLoading={query.isLoading || dashboard.isLoading}
        isError={query.isError || dashboard.isError}
        isEmpty={!items.length}
        emptyTitle={en ? "No autosearch rules yet" : "Правил автопоиска пока нет"}
        emptyDescription={
          en
            ? "Create an autosearch above to keep matching opportunities in the background."
            : "Создайте автопоиск выше, чтобы система искала подходящие возможности в фоне."
        }
        onRetry={() => {
          query.refetch();
          dashboard.refetch();
        }}
      >
        <div className="grid gap-4">
          {items.map((item) => (
            <WatchlistCard
              key={item.id}
              item={item}
              en={en}
              profileName={profiles.data?.find(profile => profile.id === item.profileId)?.name ?? (activeProfile?.id === item.profileId ? activeProfile.name : undefined)}
            />
          ))}
        </div>
      </QueryState>
    </ScreenScaffold>
  );
}

function WatchlistCard({
  item,
  en,
  profileName
}: {
  item: Watchlist;
  en: boolean;
  profileName?: string;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => watchlistDraft(item));
  const [saved, setSaved] = useState(false);
  const saveButton = useRef<HTMLButtonElement>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["watchlists"] });
  const update = useMutation({
    mutationFn: (patch: Partial<Watchlist>) => workflowApi.watchlists.update(item.id, patch),
    onSuccess: async (next) => {
      setDraft(watchlistDraft(next));
      setSaved(true);
      await refresh();
    }
  });
  const pause = useMutation({
    mutationFn: () =>
      item.active ? workflowApi.watchlists.pause(item.id) : workflowApi.watchlists.resume(item.id),
    onSuccess: async (next) => {
      setDraft((value) => ({ ...value, active: Boolean(next.active) }));
      await refresh();
    }
  });
  const remove = useMutation({
    mutationFn: () => workflowApi.watchlists.remove(item.id),
    onSuccess: refresh
  });
  const duplicate = useMutation({
    mutationFn: () => workflowApi.watchlists.duplicate(item.id),
    onSuccess: refresh
  });
  const pending = update.isPending || pause.isPending || remove.isPending || duplicate.isPending;
  useEffect(() => {
    if (update.isError) saveButton.current?.focus();
  }, [update.isError]);
  const filters = item.filters ?? {};
  const formats: Record<string, string> = {
    remote: en ? "Remote" : "Удалённо",
    hybrid: en ? "Hybrid" : "Гибрид",
    office: en ? "Office" : "Офис"
  };
  const format =
    typeof filters.remoteType === "string"
      ? (formats[filters.remoteType] ?? filters.remoteType)
      : undefined;
  const summary = [
    typeof filters.query === "string" ? filters.query : undefined,
    format,
    item.matchMin != null ? `${en ? "Fit" : "Соответствие"} ≥ ${item.matchMin}` : undefined,
    item.aiMin != null ? `AI ≥ ${item.aiMin}` : undefined
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className={workflowPanelClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words text-base font-semibold">{item.name}</h2>
            <Badge intent={item.active ? "success" : "warning"}>
              {item.active ? (en ? "Running" : "Работает") : en ? "Paused" : "На паузе"}
            </Badge>
            <Badge>
              {item.autoAiRules?.enabled
                ? en
                  ? "AI analysis on"
                  : "AI-анализ включён"
                : en
                  ? "AI analysis off"
                  : "Без AI-анализа"}
            </Badge>
          </div>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {en ? "Profile" : "Профиль"}: {profileName ?? (en ? "Unavailable profile" : "Профиль недоступен")}
          </p>
          <p className="mt-2 break-words text-sm">
            {summary ||
              (en
                ? "All opportunities in profile sources"
                : "Все возможности из источников профиля")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {en ? "Matches" : "Совпадений"}:{" "}
            {(item.totalHits ?? 0).toLocaleString(en ? "en-US" : "ru-RU")}
            {item.lastHitAt
              ? ` · ${en ? "Latest" : "Последнее"}: ${new Date(item.lastHitAt).toLocaleString(en ? "en-US" : "ru-RU")}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => pause.mutate()} disabled={pending}>
            {item.active ? <Pause className="size-4" /> : <Play className="size-4" />}
            {item.active ? (en ? "Pause" : "Поставить на паузу") : en ? "Resume" : "Включить"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => duplicate.mutate()}
            disabled={pending}
            aria-label={en ? "Duplicate paused rule" : "Создать копию правила на паузе"}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => remove.mutate()}
            disabled={pending}
            aria-label={en ? "Delete autosearch" : "Удалить автопоиск"}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>
      <MutationError show={pause.isError || remove.isError || duplicate.isError} en={en} />
      <details className="mt-4 border-t pt-3">
        <summary className="cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {en ? "Edit autosearch" : "Изменить автопоиск"}
        </summary>
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.name.trim()) update.mutate(watchlistPatch(draft, item));
          }}
        >
          <WatchlistFields
            draft={draft}
            onChange={(next) => {
              setDraft(next);
              setSaved(false);
            }}
            en={en}
            disabled={pending}
          />
          <MutationError show={update.isError} en={en} />
          {saved ? (
            <p className="mt-3 text-sm text-success" role="status">
              {en ? "Autosearch saved." : "Автопоиск сохранён."}
            </p>
          ) : null}
          <Button
            ref={saveButton}
            className="mt-4"
            type="submit"
            loading={update.isPending}
            disabled={pending || !draft.name.trim()}
          >
            <Save className="size-4" />
            {en ? "Save autosearch" : "Сохранить автопоиск"}
          </Button>
        </form>
      </details>
      <WatchlistHistory item={item} en={en} />
    </article>
  );
}

function WatchlistFields({
  draft,
  onChange,
  en,
  disabled
}: {
  draft: WatchlistDraft;
  onChange: (value: WatchlistDraft) => void;
  en: boolean;
  disabled: boolean;
}) {
  const id = useId();
  const change = <K extends keyof WatchlistDraft>(key: K, value: WatchlistDraft[K]) =>
    onChange({ ...draft, [key]: value });
  const input = (
    key: "name" | "query" | "companies" | "keywords" | "matchMin" | "aiMin" | "dailyMax",
    label: string,
    props: { type?: string; min?: number; max?: number; placeholder?: string } = {}
  ) => (
    <Field key={key} label={label} htmlFor={`${id}-${key}`}>
      <Input
        id={`${id}-${key}`}
        value={draft[key]}
        onChange={(event) => change(key, event.target.value)}
        required={key === "name"}
        maxLength={key === "name" ? 160 : 1000}
        {...props}
      />
    </Field>
  );
  const toggle = (
    key: "autoAi" | "rerun" | "inApp" | "email" | "telegram" | "active",
    label: string
  ) => (
    <label
      key={key}
      className="flex min-h-11 items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm"
    >
      <span>{label}</span>
      <Switch
        checked={draft[key]}
        onCheckedChange={(checked) => change(key, Boolean(checked))}
        aria-label={label}
      />
    </label>
  );
  const select = (
    key: "remoteType" | "type" | "mode",
    label: string,
    values: Record<string, string>
  ) => (
    <Field label={label} htmlFor={`${id}-${key}`}>
      <select
        className={selectClass}
        id={`${id}-${key}`}
        value={draft[key]}
        onChange={(event) => change(key, event.target.value)}
      >
        {Object.entries(values).map(([value, title]) => (
          <option key={value} value={value}>
            {title}
          </option>
        ))}
        {draft[key] && !Object.hasOwn(values, draft[key]) ? (
          <option value={draft[key]}>{draft[key]}</option>
        ) : null}
      </select>
    </Field>
  );
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-5 disabled:opacity-65">
      <div className="grid gap-3 sm:grid-cols-2">
        {input("name", en ? "Autosearch name" : "Название автопоиска")}
        {input("query", en ? "Search words" : "Поисковый запрос", { placeholder: "Python" })}
        {select("remoteType", en ? "Work format" : "Формат работы", {
          "": en ? "Any format" : "Любой формат",
          remote: en ? "Remote" : "Удалённо",
          hybrid: en ? "Hybrid" : "Гибрид",
          office: en ? "Office" : "Офис"
        })}
        {select("type", en ? "Opportunity type" : "Тип возможности", {
          "": en ? "All types" : "Все типы",
          vacancy: en ? "Vacancies" : "Вакансии",
          freelance: en ? "Projects" : "Проекты",
          tender: en ? "Tenders" : "Тендеры"
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {input("matchMin", en ? "Minimum fit (0–100)" : "Минимальное соответствие (0–100)", {
          type: "number",
          min: 0,
          max: 100
        })}
        {input(
          "aiMin",
          en ? "Minimum AI rating (optional)" : "Минимальная оценка AI (необязательно)",
          { type: "number", min: 0, max: 100 }
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {en
          ? "The AI threshold uses already prepared analysis. Automatic analysis is controlled below."
          : "Порог AI использует уже готовый анализ. Автоматический анализ включается отдельно ниже."}
      </p>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">
          {en ? "Automatic AI analysis" : "Автоматический AI-анализ"}
        </h3>
        {toggle(
          "autoAi",
          en ? "Analyze new matches automatically" : "Анализировать новые совпадения автоматически"
        )}
        {draft.autoAi ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {input(
              "dailyMax",
              en ? "Analyses per day (optional)" : "Анализов в день (необязательно)",
              { type: "number", min: 1, max: 100, placeholder: en ? "No limit" : "Без ограничения" }
            )}
            {toggle(
              "rerun",
              en ? "Reanalyze after a material change" : "Пересчитывать при существенном изменении"
            )}
          </div>
        ) : null}
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{en ? "Exclusions" : "Исключения"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {input(
            "companies",
            en ? "Companies / clients, comma-separated" : "Компании / заказчики через запятую"
          )}
          {input(
            "keywords",
            en ? "Excluded words, comma-separated" : "Исключить слова через запятую"
          )}
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{en ? "Notifications" : "Уведомления"}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {toggle("inApp", en ? "In the app" : "В приложении")}
          {toggle("email", "Email")}
          {toggle("telegram", "Telegram")}
        </div>
        {select("mode", en ? "When to send" : "Когда отправлять", {
          instant: en ? "Right away" : "Сразу",
          daily: en ? "Daily digest" : "Ежедневная сводка",
          weekly: en ? "Weekly digest" : "Еженедельная сводка"
        })}
        <p className="text-xs text-muted-foreground">
          {en
            ? "Delivery follows your account channel settings and quiet hours. Connect email or Telegram in Settings."
            : "Доставка учитывает каналы и тихие часы аккаунта. Email и Telegram подключаются в настройках."}
        </p>
      </div>
      {toggle("active", en ? "Run autosearch" : "Запустить автопоиск")}
    </fieldset>
  );
}

function Field({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label className="block text-sm text-muted-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function MutationError({ show, en }: { show: boolean; en: boolean }) {
  return show ? (
    <p
      role="alert"
      className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
    >
      {en
        ? "Could not save the change. Your edits are kept; please try again."
        : "Не удалось сохранить изменение. Введённые данные сохранены на экране — повторите попытку."}
    </p>
  ) : null;
}

function WatchlistHistory({ item, en }: { item: Watchlist; en: boolean }) {
  const [open, setOpen] = useState(false);
  const hits = useQuery({
    queryKey: ["watchlist-hits", item.id],
    queryFn: () => workflowApi.watchlists.hits(item.id),
    enabled: open
  });
  const states: Record<string, string> = en
    ? {
        suppressed_historical: "Historical import — no notification",
        notified: "Notification created",
        sent: "Notification created",
        pending: "Delivery not confirmed"
      }
    : {
        suppressed_historical: "Историческая загрузка — без уведомления",
        notified: "Уведомление создано",
        sent: "Уведомление создано",
        pending: "Доставка не подтверждена"
      };
  return (
    <details className="mt-3 border-t pt-3" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {en ? "Recent matches" : "Последние совпадения"}
      </summary>
      {open ? (
        <div className="mt-3">
          <QueryState
            isLoading={hits.isLoading}
            isError={hits.isError}
            isEmpty={!hits.data?.items.length}
            emptyTitle={en ? "No matches yet" : "Совпадений пока нет"}
            emptyDescription={
              en
                ? "New matching opportunities will appear here."
                : "Здесь появятся возможности, подходящие под правило."
            }
            onRetry={() => hits.refetch()}
          >
            <ul className="space-y-2">
              {hits.data?.items.map((hit) => (
                <li
                  key={hit.id}
                  className={`${workflowSubPanelClass} flex min-w-0 flex-wrap items-center justify-between gap-2`}
                >
                  <div className="min-w-0">
                    <p className="text-sm">
                      {en ? "Fit" : "Соответствие"} {hit.matchScore}
                      {typeof hit.aiScore === "number"
                        ? ` · ${en ? "AI rating" : "оценка AI"} ${hit.aiScore}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(hit.matchedAt).toLocaleString(en ? "en-US" : "ru-RU")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {states[hit.notificationState] ??
                        (en ? "Notification status unknown" : "Статус уведомления неизвестен")}
                    </p>
                  </div>
                  <Link
                    className="rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={`/opportunities/${encodeURIComponent(hit.opportunityId)}`}
                  >
                    {en ? "Open opportunity" : "Открыть возможность"}
                  </Link>
                </li>
              ))}
            </ul>
            {(hits.data?.items.length ?? 0) >= 50 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {en ? "Showing the latest 50 matches." : "Показаны последние 50 совпадений."}
              </p>
            ) : null}
          </QueryState>
        </div>
      ) : null}
    </details>
  );
}
