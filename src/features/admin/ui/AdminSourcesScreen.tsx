"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Search, TestTube2 } from "lucide-react";
import { ApiError } from "@/services/api";
import type { AdminSource } from "@/types";
import { BrandArt } from "@/components/intly/brand";
import { EmptyState } from "@/components/intly/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { adminApi } from "../api/admin-api";
import { AdminFrame, AdminQueryState } from "./AdminShared";
import { boolLabel, dateLabel, healthLabels, localizedLabel, runtimeLabels, secondsLabel, sourceGroupLabels, sourceId } from "./admin-format";
import type { Localized } from "./admin-locale";
import { useAdminLocale } from "./admin-locale";
import { updateSelectedSources, type SourceUpdateResult } from "./admin-sources-operations";

const selectClass = "h-[var(--control-height)] rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

type SourcesCopy = {
  title: string;
  description: string;
  search: string;
  searchPlaceholder: string;
  group: string;
  connector: string;
  health: string;
  enabledFilter: string;
  auth: string;
  all: string;
  enabled: string;
  disabled: string;
  configured: string;
  missing: string;
  required: string;
  publicAccess: string;
  selected: (count: number) => string;
  selectSource: (name: string) => string;
  open: string;
  resetFilters: string;
  queued: string;
  saved: string;
  bulkResult: (saved: number, failed: number) => string;
  operationError: string;
  activeRun: string;
  connections: string;
  enabledCount: string;
  missingCount: string;
  failedCount: string;
  failedOnly: string;
  shown: (shown: number, total: number) => string;
  bulkEnable: string;
  bulkDisable: string;
  confirmEnable: (count: number) => string;
  confirmDisable: (count: number) => string;
  source: string;
  state: string;
  schedule: string;
  authProxy: string;
  lastResult: string;
  actions: string;
  runtime: string;
  interval: string;
  timeout: string;
  credentials: string;
  proxy: string;
  ref: string;
  success: string;
  checked: string;
  check: string;
  run: string;
  enableShort: string;
  disableShort: string;
  empty: string;
};

const sourcesCopy: Localized<SourcesCopy> = {
  ru: {
    title: "Источники",
    description: "Источники возможностей, состояние сбора, настройки подключения и ручные запуски.",
    search: "Поиск",
    searchPlaceholder: "Название, ID, группа",
    group: "Группа",
    connector: "Коннектор",
    health: "Проверка",
    enabledFilter: "Работа",
    auth: "Доступ",
    all: "Все",
    enabled: "Включён",
    disabled: "Отключён",
    configured: "Настроен",
    missing: "Нет",
    required: "Нужны доступы",
    publicAccess: "Публичный",
    selected: (count) => `Выбрано: ${count}`,
    selectSource: (name) => `Выбрать источник ${name}`,
    open: "Открыть источник",
    resetFilters: "Сбросить фильтры",
    queued: "Сбор поставлен в очередь. Результат появится в истории запусков.",
    saved: "Настройки сохранены.",
    bulkResult: (saved, failed) => `Сохранено: ${saved}. Не удалось: ${failed}.`,
    operationError: "Не удалось выполнить действие. Обновите данные перед повторной попыткой.",
    activeRun: "Сбор уже выполняется или ожидает в очереди. Откройте историю запусков.",
    connections: "Источники в одном пространстве",
    enabledCount: "Включено",
    missingCount: "Ждут доступов",
    failedCount: "С ошибкой",
    failedOnly: "Только последние ошибки",
    shown: (shown, total) => `Показано ${shown} из ${total}`,
    bulkEnable: "Включить выбранные",
    bulkDisable: "Отключить выбранные",
    confirmEnable: (count) => `Включить выбранные источники: ${count}?`,
    confirmDisable: (count) => `Отключить выбранные источники: ${count}?`,
    source: "Источник",
    state: "Состояние",
    schedule: "Расписание",
    authProxy: "Доступ / прокси",
    lastResult: "Последний результат",
    actions: "Действия",
    runtime: "Режим",
    interval: "Интервал",
    timeout: "Таймаут",
    credentials: "Доступы",
    proxy: "Прокси",
    ref: "Ссылка",
    success: "Успех",
    checked: "Проверка",
    check: "Проверить",
    run: "Запустить",
    enableShort: "Вкл.",
    disableShort: "Откл.",
    empty: "Источники не найдены.",
  },
  en: {
    title: "Sources",
    description: "Opportunity sources, collection health, connection settings and manual runs.",
    search: "Search",
    searchPlaceholder: "Name, ID, group",
    group: "Group",
    connector: "Connector",
    health: "Health",
    enabledFilter: "Enabled",
    auth: "Access",
    all: "All",
    enabled: "Enabled",
    disabled: "Disabled",
    configured: "Configured",
    missing: "Missing",
    required: "Credentials required",
    publicAccess: "Public",
    selected: (count) => `Selected: ${count}`,
    selectSource: (name) => `Select source ${name}`,
    open: "Open source",
    resetFilters: "Reset filters",
    queued: "Collection was queued. Results will appear in the run history.",
    saved: "Settings saved.",
    bulkResult: (saved, failed) => `Saved: ${saved}. Failed: ${failed}.`,
    operationError: "The operation failed. Refresh the data before trying again.",
    activeRun: "Collection is already running or queued. Open the run history.",
    connections: "Sources in one workspace",
    enabledCount: "Enabled",
    missingCount: "Awaiting credentials",
    failedCount: "Failed",
    failedOnly: "Only recent errors",
    shown: (shown, total) => `Showing ${shown} of ${total}`,
    bulkEnable: "Enable selected",
    bulkDisable: "Disable selected",
    confirmEnable: (count) => `Enable selected sources: ${count}?`,
    confirmDisable: (count) => `Disable selected sources: ${count}?`,
    source: "Source",
    state: "State",
    schedule: "Schedule",
    authProxy: "Access / proxy",
    lastResult: "Last result",
    actions: "Actions",
    runtime: "Runtime",
    interval: "Interval",
    timeout: "Timeout",
    credentials: "Credentials",
    proxy: "Proxy",
    ref: "Ref",
    success: "Success",
    checked: "Checked",
    check: "Check",
    run: "Run",
    enableShort: "Enable",
    disableShort: "Disable",
    empty: "No sources found.",
  },
};

export function AdminSourcesScreen() {
  const locale = useAdminLocale();
  const text = sourcesCopy[locale];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [family, setFamily] = useState("");
  const [health, setHealth] = useState("");
  const [enabled, setEnabled] = useState("");
  const [auth, setAuth] = useState("");
  const [failedOnly, setFailedOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ message: string; error: boolean; sourceId?: string } | null>(null);
  const [bulkResults, setBulkResults] = useState<SourceUpdateResult[]>([]);
  const query = useQuery({ queryKey: ["admin", "sources"], queryFn: adminApi.sources.list });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "sources"] });
  const operationStart = () => { setNotice(null); setBulkResults([]); };
  const operationError = (error: Error, id?: string) => {
    setNotice({ message: error instanceof ApiError && error.code === "SOURCE_RUN_ACTIVE" ? text.activeRun : error.message || text.operationError, error: true, sourceId: id });
    void invalidate();
  };
  const run = useMutation({ mutationFn: adminApi.sources.run, onMutate: operationStart, onSuccess: (_result, id) => { setNotice({ message: text.queued, error: false, sourceId: id }); return invalidate(); }, onError: operationError });
  const check = useMutation({ mutationFn: adminApi.sources.test, onMutate: operationStart, onSuccess: (result, id) => {
    const health = result.health as { state?: string; message?: string } | undefined;
    setNotice({ message: `${text.checked}: ${localizedLabel(healthLabels, health?.state, locale)}${health?.message ? ` · ${health.message}` : ""}`, error: health?.state === "Failed", sourceId: id });
    return invalidate();
  }, onError: operationError });
  const updateSource = useMutation({ mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => adminApi.sources.update(id, { enabled }), onMutate: operationStart, onSuccess: (_result, { id }) => { setNotice({ message: text.saved, error: false, sourceId: id }); return invalidate(); }, onError: (error, { id }) => operationError(error, id) });
  const bulkUpdate = useMutation({
    mutationFn: (nextEnabled: boolean) => updateSelectedSources(selected, nextEnabled, adminApi.sources.update),
    onMutate: operationStart,
    onSuccess: (results) => {
      const failed = results.filter((result) => result.error);
      setSelected(failed.map((result) => result.id));
      setBulkResults(failed);
      setNotice({ message: text.bulkResult(results.length - failed.length, failed.length), error: failed.length > 0 });
      return invalidate();
    }
  });

  const sources = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const groups = unique(sources.map((source) => source.group));
  const families = unique(sources.map((source) => source.connectorFamily));
  const healthStates = unique(sources.map((source) => source.healthState ?? source.status ?? "Unknown"));
  const filtered = useMemo(() => sources.filter((source) => {
    const rowText = `${source.name} ${source.id ?? source._id ?? ""} ${source.group} ${source.connectorFamily} ${source.category ?? ""}`.toLowerCase();
    if (search && !rowText.includes(search.toLowerCase())) return false;
    if (group && source.group !== group) return false;
    if (family && source.connectorFamily !== family) return false;
    if (health && (source.healthState ?? source.status ?? "Unknown") !== health) return false;
    if (enabled && String(source.enabled) !== enabled) return false;
    if (auth === "configured" && !source.credentialsConfigured) return false;
    if (auth === "missing" && (!source.credentialsRequired || source.credentialsConfigured)) return false;
    if (auth === "required" && !source.credentialsRequired) return false;
    if (auth === "public" && source.credentialsRequired) return false;
    if (failedOnly && source.healthState !== "Failed" && !(source.healthState === "Degraded" && source.lastError)) return false;
    return true;
  }), [auth, enabled, failedOnly, family, group, health, search, sources]);
  const busy = run.isPending || check.isPending || updateSource.isPending || bulkUpdate.isPending;

  function accessLabel(source: AdminSource) {
    return source.credentialsConfigured ? text.configured : source.credentialsRequired ? text.missing : text.publicAccess;
  }

  function sourceActions(source: AdminSource) {
    const id = sourceId(source);
    return <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => check.mutate(id)} loading={check.isPending && check.variables === id}><TestTube2 className="size-4" />{text.check}</Button>
      <Button size="sm" variant="outline" onClick={() => run.mutate(id)} loading={run.isPending && run.variables === id} disabled={busy || !source.enabled}><Play className="size-4" />{text.run}</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => updateSource.mutate({ id, enabled: !source.enabled })} loading={updateSource.isPending && updateSource.variables?.id === id}>{source.enabled ? text.disableShort : text.enableShort}</Button>
    </div>;
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelected((value) => checked ? Array.from(new Set([...value, id])) : value.filter((item) => item !== id));
  }

  function bulk(nextEnabled: boolean) {
    if (!selected.length) return;
    if (window.confirm(nextEnabled ? text.confirmEnable(selected.length) : text.confirmDisable(selected.length))) bulkUpdate.mutate(nextEnabled);
  }

  return (
    <AdminFrame title={text.title} description={text.description}>
      <AdminQueryState isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()}>
        <section className="mb-4 flex min-w-0 items-center gap-4 rounded-lg border bg-card p-[var(--card-padding)]">
          <BrandArt kind="connections" className="hidden w-32 shrink-0 sm:block" />
          <div className="min-w-0 flex-1"><h2 className="font-semibold">{text.connections}</h2><dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
            {[[text.enabledCount, sources.filter((source) => source.enabled).length], [text.missingCount, sources.filter((source) => source.credentialsRequired && !source.credentialsConfigured).length], [text.failedCount, sources.filter((source) => source.healthState === "Failed").length]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd></div>)}
          </dl></div>
        </section>
        <section className="mb-4 min-w-0 rounded-lg border bg-card p-[var(--card-padding)]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="min-w-0 space-y-1 text-sm md:col-span-2 xl:col-span-1"><span className="font-medium">{text.search}</span><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.searchPlaceholder} /></div></label>
            <Filter label={text.group} allLabel={text.all} value={group} onChange={setGroup} options={groups.map((item) => [item, localizedLabel(sourceGroupLabels, item, locale)])} />
            <Filter label={text.connector} allLabel={text.all} value={family} onChange={setFamily} options={families.map((item) => [item, item])} />
            <Filter label={text.health} allLabel={text.all} value={health} onChange={setHealth} options={healthStates.map((item) => [item, localizedLabel(healthLabels, item, locale)])} />
            <Filter label={text.enabledFilter} allLabel={text.all} value={enabled} onChange={setEnabled} options={[["true", text.enabled], ["false", text.disabled]]} />
            <Filter label={text.auth} allLabel={text.all} value={auth} onChange={setAuth} options={[["required", text.required], ["configured", text.configured], ["missing", text.missing], ["public", text.publicAccess]]} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2 text-muted-foreground"><Checkbox checked={failedOnly} onCheckedChange={(checked) => setFailedOnly(Boolean(checked))} /> {text.failedOnly}</label>
            <span role="status" className="text-muted-foreground">{text.shown(filtered.length, sources.length)}{selected.length ? ` · ${text.selected(selected.length)}` : ""}</span>
            <Button size="sm" variant="outline" onClick={() => bulk(true)} loading={bulkUpdate.isPending && bulkUpdate.variables === true} disabled={!selected.length || busy}>{text.bulkEnable}</Button>
            <Button size="sm" variant="outline" onClick={() => bulk(false)} loading={bulkUpdate.isPending && bulkUpdate.variables === false} disabled={!selected.length || busy}>{text.bulkDisable}</Button>
          </div>
        </section>
        {notice ? <section role={notice.error ? "alert" : "status"} className={`mb-4 min-w-0 rounded-lg border p-3 text-sm ${notice.error ? "border-destructive/30 bg-destructive/10" : "bg-card"}`}>
          <p className="break-words">{notice.sourceId ? <Link className="mr-1 font-semibold underline" href={`/admin/sources/${notice.sourceId}`}>{sources.find((source) => sourceId(source) === notice.sourceId)?.name ?? notice.sourceId}</Link> : null}{notice.message}</p>
          {bulkResults.length ? <ul className="mt-2 space-y-1">{bulkResults.map((result) => <li className="break-words" key={result.id}>{sources.find((source) => sourceId(source) === result.id)?.name ?? result.id}: {result.error?.message}</li>)}</ul> : null}
        </section> : null}
        <div className="grid min-w-0 gap-3 md:grid-cols-2 2xl:hidden">
          {filtered.map((source) => {
            const id = sourceId(source);
            const sourceHealth = source.healthState ?? source.status ?? "Unknown";
            return <article key={id} className="min-w-0 rounded-lg border bg-card p-[var(--card-padding)]">
              <div className="flex items-start gap-3">
                <Checkbox aria-label={text.selectSource(source.name)} disabled={busy} checked={selected.includes(id)} onCheckedChange={(checked) => toggleSelected(id, Boolean(checked))} />
                <div className="min-w-0 flex-1"><Link className="break-words font-semibold hover:text-primary" href={`/admin/sources/${id}`}>{source.name}</Link><p className="mt-1 break-words text-xs text-muted-foreground">{localizedLabel(sourceGroupLabels, source.group, locale)} · {source.connectorFamily}</p></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1"><Badge intent={source.enabled ? "success" : "warning"}>{source.enabled ? text.enabled : text.disabled}</Badge><Badge intent={sourceHealth === "Failed" ? "danger" : sourceHealth === "Healthy" ? "success" : "neutral"}>{localizedLabel(healthLabels, sourceHealth, locale)}</Badge></div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div><dt className="text-muted-foreground">{text.interval}</dt><dd>{secondsLabel(source.intervalSeconds ?? (source.intervalMinutes ? source.intervalMinutes * 60 : undefined), locale)}</dd></div>
                <div><dt className="text-muted-foreground">{text.credentials}</dt><dd>{accessLabel(source)}</dd></div>
                <div className="col-span-2"><dt className="text-muted-foreground">{text.success}</dt><dd>{dateLabel(source.lastSuccessAt, locale)}</dd></div>
              </dl>
              {source.lastError || source.healthMessage ? <p className="mt-3 line-clamp-3 break-words text-xs text-muted-foreground">{source.lastError ?? source.healthMessage}</p> : null}
              <div className="mt-4 border-t pt-3">{sourceActions(source)}<Link href={`/admin/sources/${id}`} className="mt-2 inline-block py-1 text-sm text-primary underline-offset-4 hover:underline">{text.open}</Link></div>
            </article>;
          })}
        </div>
        <section className={filtered.length ? "hidden min-w-0 overflow-hidden rounded-lg border bg-card 2xl:block" : "hidden"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr><th className="w-10 px-3 py-2" /><th className="px-3 py-2">{text.source}</th><th className="px-3 py-2">{text.state}</th><th className="px-3 py-2">{text.schedule}</th><th className="px-3 py-2">{text.authProxy}</th><th className="px-3 py-2">{text.lastResult}</th><th className="px-3 py-2 text-right">{text.actions}</th></tr>
              </thead>
              <tbody>
                {filtered.map((source) => {
                  const id = sourceId(source);
                  const sourceHealth = source.healthState ?? source.status ?? "Unknown";
                  return (
                    <tr key={id} className="border-b last:border-0">
                      <td className="px-3 py-3 align-top"><Checkbox aria-label={text.selectSource(source.name)} disabled={busy} checked={selected.includes(id)} onCheckedChange={(checked) => toggleSelected(id, Boolean(checked))} /></td>
                      <td className="max-w-xs px-3 py-3 align-top"><Link href={`/admin/sources/${id}`} className="font-semibold hover:text-primary">{source.name}</Link><p className="mt-1 text-xs text-muted-foreground">{localizedLabel(sourceGroupLabels, source.group, locale)} · {source.connectorFamily}</p><p className="mt-1 text-xs text-muted-foreground">{source.category ?? id}</p></td>
                      <td className="px-3 py-3 align-top"><div className="flex flex-wrap gap-1"><Badge intent={source.enabled ? "success" : "warning"}>{source.enabled ? text.enabled : text.disabled}</Badge><Badge intent={sourceHealth === "Failed" ? "danger" : sourceHealth === "Healthy" ? "success" : "neutral"}>{localizedLabel(healthLabels, sourceHealth, locale)}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{text.runtime}: {localizedLabel(runtimeLabels, source.runtimeState, locale)}</p></td>
                      <td className="px-3 py-3 align-top text-xs text-muted-foreground"><p>{text.interval}: {secondsLabel(source.intervalSeconds ?? (source.intervalMinutes ? source.intervalMinutes * 60 : undefined), locale)}</p><p>{text.timeout}: {source.timeoutMs ? `${source.timeoutMs} ${locale === "ru" ? "мс" : "ms"}` : "—"}</p></td>
                      <td className="px-3 py-3 align-top text-xs text-muted-foreground"><p>{text.credentials}: {accessLabel(source)}</p><p>{text.proxy}: {boolLabel(source.proxyPoolEnabled, locale)}</p>{source.authCredentialRef ? <p>{text.ref}: {source.authCredentialRef}</p> : null}</td>
                      <td className="max-w-xs px-3 py-3 align-top text-xs text-muted-foreground"><p>{text.success}: {dateLabel(source.lastSuccessAt, locale)}</p><p>{text.checked}: {dateLabel(source.lastHealthCheckAt, locale)}</p>{source.lastError ? <p className="mt-1 line-clamp-2 text-destructive">{source.lastError}</p> : source.healthMessage ? <p className="mt-1 line-clamp-2">{source.healthMessage}</p> : null}</td>
                      <td className="px-3 py-3 align-top">{sourceActions(source)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        {!filtered.length ? <EmptyState className="mt-4" title={text.empty} actionLabel={text.resetFilters} onAction={() => { setSearch(""); setGroup(""); setFamily(""); setHealth(""); setEnabled(""); setAuth(""); setFailedOnly(false); }} /> : null}
      </AdminQueryState>
    </AdminFrame>
  );
}

function Filter({ label, allLabel, value, onChange, options }: { label: string; allLabel: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="min-w-0 space-y-1 text-sm"><span className="font-medium">{label}</span><select className={`${selectClass} w-full min-w-0`} value={value} onChange={(event) => onChange(event.target.value)}><option value="">{allLabel}</option>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
}
