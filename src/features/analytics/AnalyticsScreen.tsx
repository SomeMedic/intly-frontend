"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/intly/app-shell";
import { BrandArt } from "@/components/intly/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth";
import { useActiveProfileStore } from "@/hooks/use-active-profile";
import { getPublicSources, useProfiles, type PublicSource } from "@/features/profiles";
import { analyticsApi } from "./api";
import { downloadBlob } from "@/lib/download";
import type { AnalyticsFilters, AnalyticsKind, AnalyticsRow, MarketAnalyticsPayload, PersonalAnalyticsPayload } from "./contracts";
import { analyticsDrilldownFilters, analyticsExportName, buildActivityTimeseriesDrilldown, buildPersonalEventDrilldown, buildOpportunityDrilldown, buildTimeseriesDrilldown, chartRows, columnLabel, formatMetric, kpiLabel, mergeMoneyDimensionOptions, moneyDimensionFilterValue, moneyDimensionOptions, periodLabels, rowLabel, seriesLabel, typeLabels, type AnalyticsLocale, type MoneyDimensionOptions } from "./view-model";

type Payload = PersonalAnalyticsPayload | MarketAnalyticsPayload;

const DEFAULT_FILTERS: AnalyticsFilters = { period: "30d", type: "all", sourceIds: [] };
const SELECT_CLASS = "h-[var(--control-height)] min-w-0 w-full max-w-full rounded-md border bg-card px-3 text-sm";
const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--ai))", "hsl(var(--destructive))"];

function errorMessage(error: unknown, locale: AnalyticsLocale): string {
  return error instanceof Error ? error.message : locale === "en" ? "Unknown error" : "Неизвестная ошибка";
}

export function AnalyticsScreen({ kind }: { kind: AnalyticsKind }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const locale: AnalyticsLocale = user?.settings.locale === "en" ? "en" : "ru";
  const profiles = useProfiles();
  const activeProfileId = useActiveProfileStore((state) => state.activeProfileId);
  const [selectedFilters, setFilters] = useState<AnalyticsFilters>({ ...DEFAULT_FILTERS, includeClosed: kind === "personal", scope: kind });
  const filters = useMemo(() => ({
    ...selectedFilters,
    profileId: kind === "personal"
      ? selectedFilters.profileId === undefined
        ? activeProfileId ?? profiles.data?.find((profile) => profile.isActive)?.id
        : selectedFilters.profileId || undefined
      : undefined
  }), [activeProfileId, kind, profiles.data, selectedFilters]);
  const updateFilters = (next: AnalyticsFilters) => setFilters({ ...next, profileId: next.profileId ?? "" });
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const query = useQuery<Payload>({
    queryKey: ["analytics", kind, filters],
    queryFn: async () => kind === "personal" ? analyticsApi.personal(filters) : analyticsApi.market(filters),
    enabled: kind === "market" || !profiles.isPending
  });
  const payload = query.data;
  const moneyOptions = useMemo(
    () => analyticsCacheMoneyOptions(queryClient.getQueriesData<Payload>({ queryKey: ["analytics", kind] }).map(([, cached]) => cached), payload, filters),
    [queryClient, kind, payload, filters]
  );

  const exportCsv = async () => {
    setExportError(null);
    setExporting(true);
    try {
      const blob = kind === "personal" ? await analyticsApi.personalCsv(filters) : await analyticsApi.marketCsv(filters);
      downloadBlob(blob, analyticsExportName(kind));
    } catch (error) {
      setExportError(errorMessage(error, locale));
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <BrandArt kind="analysis" className="hidden w-28 shrink-0 sm:block" />
            <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{kind === "personal" ? locale === "en" ? "Personal analytics" : "Личная аналитика" : locale === "en" ? "Market analytics" : "Рыночная аналитика"}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{kind === "personal" ? locale === "en" ? "Funnel, sources, technologies and money only for your personal states." : "Воронка, источники, технологии и деньги только по вашим личным состояниям." : locale === "en" ? "Aggregates over the shared opportunity base without personal user data." : "Агрегаты по общей базе возможностей без личных данных пользователей."}</p>
            {exportError ? <p className="mt-2 text-sm text-destructive">{locale === "en" ? "CSV export failed" : "CSV не выгружен"}: {exportError}</p> : null}
            </div>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={!payload || query.isLoading} loading={exporting}>{exporting ? locale === "en" ? "Preparing CSV..." : "Готовим CSV…" : locale === "en" ? "Export CSV" : "Экспорт CSV"}</Button>
        </header>
        <AnalyticsFiltersPanel filters={filters} kind={kind} locale={locale} moneyOptions={moneyOptions} onChange={updateFilters} />
        <AnalyticsQueryState isLoading={query.isLoading} isError={query.isError} isEmpty={query.isSuccess && !payload} locale={locale} onRetry={() => query.refetch()}>
          {payload ? <AnalyticsPayloadView kind={kind} filters={analyticsDrilldownFilters(filters, payload.filters)} payload={payload} locale={locale} /> : null}
        </AnalyticsQueryState>
      </div>
    </AppShell>
  );
}

function analyticsCacheMoneyOptions(cachedPayloads: Array<Payload | undefined>, currentPayload: Payload | undefined, filters: AnalyticsFilters): MoneyDimensionOptions {
  const payloads = [...cachedPayloads, currentPayload].filter((payload): payload is Payload => Boolean(payload));
  return payloads.reduce(
    (options, payload) => mergeMoneyDimensionOptions(options, moneyDimensionOptions(payload.compensation.byTypeCurrencyPeriodKind ?? payload.compensation.byCurrency ?? [])),
    moneyDimensionOptions([], filters)
  );
}

function AnalyticsQueryState({ isLoading, isError, isEmpty, locale, onRetry, children }: { isLoading: boolean; isError: boolean; isEmpty: boolean; locale: AnalyticsLocale; onRetry: () => void; children: React.ReactNode }) {
  if (isLoading) return <Card><CardContent className="pt-[var(--card-padding)] text-sm text-muted-foreground">{locale === "en" ? "Loading analytics..." : "Загружаем аналитику…"}</CardContent></Card>;
  if (isError) return <Card><CardContent className="space-y-3 pt-[var(--card-padding)]"><p className="text-sm text-destructive">{locale === "en" ? "Could not load analytics." : "Не удалось загрузить аналитику."}</p><Button variant="outline" onClick={onRetry}>{locale === "en" ? "Retry" : "Повторить"}</Button></CardContent></Card>;
  if (isEmpty) return <Card><CardContent className="pt-[var(--card-padding)] text-sm text-muted-foreground">{locale === "en" ? "Data will appear after opportunity import and pipeline actions." : "Данные появятся после импорта возможностей и действий в pipeline."}</CardContent></Card>;
  return <>{children}</>;
}

function AnalyticsFiltersPanel({ filters, kind, locale, moneyOptions, onChange }: { filters: AnalyticsFilters; kind: AnalyticsKind; locale: AnalyticsLocale; moneyOptions: MoneyDimensionOptions; onChange: (value: AnalyticsFilters) => void }) {
  const profiles = useProfiles();
  const sources = useQuery({ queryKey: ["public-sources"], queryFn: getPublicSources });
  const update = (patch: Partial<AnalyticsFilters>) => onChange({ ...filters, ...patch });
  const selectedSourceNames = selectedSourcesLabel(sources.data ?? [], filters.sourceIds ?? [], locale);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{locale === "en" ? "Filters" : "Фильтры"}</CardTitle>
        <CardDescription>{locale === "en" ? "Period, profile, type and sources apply to every chart, table and CSV." : "Период, профиль, тип и источники применяются к каждому графику, таблице и CSV."}</CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-6 [&>label]:min-w-0">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{locale === "en" ? "Period" : "Период"}</span>
          <select className={SELECT_CLASS} value={filters.period} onChange={(event) => update({ period: event.target.value as AnalyticsFilters["period"] })}>
            {Object.entries(periodLabels(locale)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{locale === "en" ? "Type" : "Тип"}</span>
          <select className={SELECT_CLASS} value={filters.type ?? "all"} onChange={(event) => update({ type: event.target.value as AnalyticsFilters["type"] })}>
            {Object.entries(typeLabels(locale)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {kind === "personal" ? <label className="space-y-1 text-sm"><span className="text-muted-foreground">{locale === "en" ? "Profile" : "Профиль"}</span><select className={SELECT_CLASS} value={filters.profileId ?? ""} onChange={(event) => update({ profileId: event.target.value || undefined })} disabled={profiles.isLoading}><option value="">{locale === "en" ? "All my profiles" : "Все мои профили"}</option>{profiles.data?.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}{profile.isActive ? locale === "en" ? " · active" : " · активный" : ""}</option>)}</select>{profiles.isError ? <span className="text-xs text-destructive">{locale === "en" ? "Profiles failed to load" : "Профили не загрузились"}</span> : null}</label> : null}
        <fieldset className="min-w-0 space-y-2 text-sm md:col-span-2 xl:col-span-2">
          <legend className="text-muted-foreground">{locale === "en" ? "Sources" : "Источники"}</legend>
          <div className="rounded-md border bg-card p-2">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="min-w-0 break-words">{selectedSourceNames}</span>
              {(filters.sourceIds ?? []).length ? <button type="button" className="text-primary hover:underline" onClick={() => update({ sourceIds: [] })}>{locale === "en" ? "Reset" : "Сбросить"}</button> : null}
            </div>
            {sources.isLoading ? <p className="text-xs text-muted-foreground">{locale === "en" ? "Loading sources..." : "Загружаем источники…"}</p> : sources.isError ? <p className="text-xs text-destructive">{locale === "en" ? "Source catalog failed to load" : "Каталог источников не загрузился"}</p> : <div className="grid max-h-32 grid-cols-[minmax(0,1fr)] gap-1 overflow-auto pr-1 sm:grid-cols-2">{(sources.data ?? []).map((source) => <label key={source.id} className="flex min-w-0 items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/60"><input type="checkbox" checked={(filters.sourceIds ?? []).includes(source.id)} onChange={(event) => updateSource(filters, source.id, event.target.checked, update)} /><span className="min-w-0 truncate" title={source.name}>{source.name}</span></label>)}</div>}
          </div>
        </fieldset>
        {filters.period === "custom" ? <><label className="space-y-1 text-sm"><span className="text-muted-foreground">{locale === "en" ? "From" : "С"}</span><Input type="date" value={filters.from ?? ""} onChange={(event) => update({ from: event.target.value || undefined })} /></label><label className="space-y-1 text-sm"><span className="text-muted-foreground">{locale === "en" ? "Through" : "По включительно"}</span><Input type="date" value={filters.to ?? ""} onChange={(event) => update({ to: event.target.value || undefined })} /></label></> : null}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(filters.includeClosed)} onChange={(event) => update({ includeClosed: event.target.checked })} /><span>{locale === "en" ? "Include closed" : "Включить закрытые"}</span></label>
        {kind === "market" ? <>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(filters.comparePrevious)} onChange={(event) => update({ comparePrevious: event.target.checked })} /><span>{locale === "en" ? "Compare with previous period" : "Сравнить с предыдущим периодом"}</span></label>
          {(["technologies", "locations", "countriesAllowed"] as const).map((key) => <label key={key} className="space-y-1 text-sm"><span className="block text-muted-foreground xl:min-h-10">{key === "technologies" ? locale === "en" ? "Technologies (comma-separated)" : "Технологии через запятую" : key === "locations" ? locale === "en" ? "Locations (comma-separated)" : "География через запятую" : locale === "en" ? "Allowed countries (comma-separated)" : "Допустимые страны через запятую"}</span><Input value={filters[key]?.join(", ") ?? ""} onChange={(event) => update({ [key]: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></label>)}
          <label className="space-y-1 text-sm"><span className="block text-muted-foreground xl:min-h-10">{locale === "en" ? "Role / category" : "Роль / категория"}</span><Input value={filters.role ?? ""} onChange={(event) => update({ role: event.target.value || undefined })} /></label>
          <label className="space-y-1 text-sm"><span className="block text-muted-foreground xl:min-h-10">{locale === "en" ? "Seniority" : "Уровень"}</span><select className={SELECT_CLASS} value={filters.seniority ?? ""} onChange={(event) => update({ seniority: event.target.value || undefined })}><option value="">{locale === "en" ? "All levels" : "Все уровни"}</option>{["junior", "middle", "senior", "lead", "unknown"].map((value) => <option key={value} value={value}>{value === "unknown" ? locale === "en" ? "Unspecified" : "Не указан" : value}</option>)}</select></label>
          <label className="space-y-1 text-sm"><span className="block text-muted-foreground xl:min-h-10">{locale === "en" ? "Work format" : "Формат работы"}</span><select className={SELECT_CLASS} value={filters.remoteType ?? ""} onChange={(event) => update({ remoteType: event.target.value || undefined })}><option value="">{locale === "en" ? "All formats" : "Все форматы"}</option>{["remote", "hybrid", "office", "unknown"].map((value) => <option key={value} value={value}>{value === "remote" ? locale === "en" ? "Remote" : "Удалённо" : value === "hybrid" ? locale === "en" ? "Hybrid" : "Гибрид" : value === "office" ? locale === "en" ? "Office" : "Офис" : locale === "en" ? "Unspecified" : "Не указан"}</option>)}</select></label>
          <label className="space-y-1 text-sm"><span className="block text-muted-foreground xl:min-h-10">{locale === "en" ? "Source group" : "Группа источников"}</span><select className={SELECT_CLASS} value={filters.sourceGroups?.[0] ?? ""} onChange={(event) => update({ sourceGroups: event.target.value ? [event.target.value] : [] })}><option value="">{locale === "en" ? "All groups" : "Все группы"}</option>{Array.from(new Set([...(sources.data ?? []).map((source) => source.group).filter(Boolean), "unknown"])).map((group) => <option key={group} value={group}>{formatMetric("sourceGroup", group, locale)}</option>)}</select></label>
        </> : null}
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground xl:min-h-10">{locale === "en" ? "Currency" : "Валюта"}</span>
          <select className={SELECT_CLASS} value={filters.currency ?? ""} onChange={(event) => update({ currency: event.target.value || undefined })}>
            <option value="">{locale === "en" ? "All currencies" : "Все валюты"}</option>
            {moneyOptions.currencies.map((value) => <option key={value} value={value}>{formatMetric("currency", value, locale)}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground xl:min-h-10">{locale === "en" ? "Pay period" : "Период оплаты"}</span>
          <select className={SELECT_CLASS} value={moneyDimensionFilterValue("period", filters.moneyPeriod) ?? ""} onChange={(event) => update({ moneyPeriod: event.target.value || undefined })}>
            <option value="">{locale === "en" ? "All periods" : "Все периоды"}</option>
            {moneyOptions.periods.map((value) => <option key={value} value={value}>{formatMetric("period", value, locale)}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground xl:min-h-10">{locale === "en" ? "Pay kind" : "Вид оплаты"}</span>
          <select className={SELECT_CLASS} value={moneyDimensionFilterValue("kind", filters.moneyKind) ?? ""} onChange={(event) => update({ moneyKind: event.target.value || undefined })}>
            <option value="">{locale === "en" ? "All kinds" : "Все виды"}</option>
            {moneyOptions.kinds.map((value) => <option key={value} value={value}>{formatMetric("kind", value, locale)}</option>)}
          </select>
        </label>
      </CardContent>
    </Card>
  );
}

function updateSource(filters: AnalyticsFilters, sourceId: string, checked: boolean, update: (patch: Partial<AnalyticsFilters>) => void) {
  const current = new Set(filters.sourceIds ?? []);
  if (checked) current.add(sourceId);
  else current.delete(sourceId);
  update({ sourceIds: Array.from(current) });
}

function selectedSourcesLabel(sources: PublicSource[], ids: string[], locale: AnalyticsLocale): string {
  if (!ids.length) return locale === "en" ? "All sources" : "Все источники";
  const names = ids.map((id) => sources.find((source) => source.id === id)?.name ?? id);
  return names.length > 2 ? locale === "en" ? `${names.slice(0, 2).join(", ")} and ${names.length - 2} more` : `${names.slice(0, 2).join(", ")} и ещё ${names.length - 2}` : names.join(", ");
}

function AnalyticsPayloadView({ kind, filters, payload, locale }: { kind: AnalyticsKind; filters: AnalyticsFilters; payload: Payload; locale: AnalyticsLocale }) {
  if (kind === "personal") return <PersonalAnalytics filters={filters} payload={payload as PersonalAnalyticsPayload} locale={locale} />;
  return <MarketAnalytics filters={filters} payload={payload as MarketAnalyticsPayload} locale={locale} />;
}

function PersonalAnalytics({ filters, payload, locale }: { filters: AnalyticsFilters; payload: PersonalAnalyticsPayload; locale: AnalyticsLocale }) {
  const profiles = useProfiles();
  const profileRows = payload.profiles.map((row) => ({ ...Object.fromEntries(Object.entries(row).filter(([key]) => key !== "profileId" && key !== "tracked")), profileName: profiles.data?.find((profile) => profile.id === row.profileId)?.name ?? String(row.profileId) }));
  const sourceMetricHref = (row: AnalyticsRow, key: string) => {
    const stages: Record<string, string> = { responses: "Applied", replies: "Interview,Offer,Won", wins: "Won" };
    if (stages[key]) return buildPersonalEventDrilldown(filters, stages[key], row);
    if (key === "found") return buildOpportunityDrilldown(filters, row);
    if (key === "sampleCount") return buildOpportunityDrilldown({ ...filters, from: undefined, to: undefined }, row);
    return undefined;
  };
  return (
    <div className="space-y-4">
      <KpiGrid totals={payload.totals} locale={locale} />
      <p className="text-sm text-muted-foreground">{locale === "en" ? "Stages and scores count opportunity/profile pairs. When all profiles are selected, the same opportunity can count more than once; drilldowns show distinct opportunities. Conversion is successful outcomes divided by reviews within this period." : "Стадии и оценки считаются по парам «возможность / профиль». При выборе всех профилей одна возможность может учитываться несколько раз; переход показывает уникальные записи. Конверсия — успешные исходы, делённые на просмотры за период."}</p>
      <div className="grid gap-4 xl:grid-cols-2">
        {(payload.funnels ?? [{ type: filters.type === "all" ? undefined : filters.type, stages: payload.funnel }]).map((funnel) => <BarSection key={funnel.type ?? "all"} title={`${locale === "en" ? "Funnel" : "Воронка"}${funnel.type ? ` · ${typeLabels(locale)[funnel.type]}` : ""}`} rows={funnel.stages} includeZeros labelKeys={["status", "label"]} filters={filters} locale={locale} description={locale === "en" ? "First entry into each stage within the selected period. Conversion compares adjacent stages; records can arrive before this period." : "Первое достижение каждой стадии в выбранном периоде. Конверсия сравнивает соседние стадии; запись могла появиться раньше."} hrefForRow={(row) => buildPersonalEventDrilldown(filters, String(row.pipelineReachedStatuses ?? row.status), { ...row, type: funnel.type })} />)}
        <LineSection title={locale === "en" ? "Dynamics" : "Динамика"} rows={payload.timeseries} lines={["found", "responses", "replies", "interviews", "wins"]} filters={filters} locale={locale} personal />
        <BarSection title={locale === "en" ? "Found by source" : "Найдено по источникам"} rows={payload.sources} labelKeys={["sourceName", "sourceId"]} valueKey="found" filters={filters} locale={locale} />
        <BarSection title={locale === "en" ? "Technologies" : "Технологии"} rows={payload.technologies} labelKeys={["technology"]} filters={filters} locale={locale} />
        <BarSection title={locale === "en" ? "Geography" : "География"} rows={payload.geography.locations} labelKeys={["location"]} filters={filters} locale={locale} />
        {payload.geography.countries ? <BarSection title={locale === "en" ? "Allowed countries" : "Допустимые страны"} rows={payload.geography.countries} labelKeys={["country"]} filters={filters} locale={locale} /> : null}
        <BarSection title={locale === "en" ? "Counterparts" : "Контрагенты"} rows={payload.counterparts} labelKeys={["counterpart"]} filters={filters} locale={locale} />
        {payload.scoreBands ? <><BarSection title={locale === "en" ? "Match distribution" : "Распределение Match"} rows={payload.scoreBands.match} labelKeys={["band", "label"]} filters={filters} locale={locale} hrefForRow={false} /><BarSection title={locale === "en" ? "AI Score distribution" : "Распределение AI Score"} rows={payload.scoreBands.ai} labelKeys={["band", "label"]} filters={filters} locale={locale} hrefForRow={false} /></> : null}
      </div>
      <DataTable title={locale === "en" ? "Profile effectiveness" : "Эффективность профилей"} rows={profileRows} filters={filters} locale={locale} hrefForRow={false} />
      <DataTable title={locale === "en" ? "Compensation and budgets" : "Компенсация и бюджеты"} rows={payload.compensation.byTypeCurrencyPeriodKind ?? payload.compensation.byCurrency} filters={filters} locale={locale} description={locale === "en" ? `Normalized number coverage: ${formatMetric("coverage", payload.compensation.coverage, locale)}. Without comparable values: ${payload.compensation.missingCount}.` : `Покрытие нормализованных чисел: ${formatMetric("coverage", payload.compensation.coverage, locale)}. Без сопоставимых значений: ${payload.compensation.missingCount}.`} />
      <DataTable title={locale === "en" ? "Source -> actions" : "Источник → действия"} rows={payload.sources} filters={filters} locale={locale} hrefForCell={sourceMetricHref} description={locale === "en" ? "Found records and first actions use the selected period. Sample size counts all tracked opportunity/profile pairs; action rates use that sample as the denominator. Click a number to open its records." : "Найденные записи и первые действия относятся к выбранному периоду. Выборка содержит все личные пары «возможность / профиль»; доли действий рассчитаны от этой выборки. Нажмите число для перехода к его записям."} />
    </div>
  );
}

function MarketAnalytics({ filters, payload, locale }: { filters: AnalyticsFilters; payload: MarketAnalyticsPayload; locale: AnalyticsLocale }) {
  return (
    <div className="space-y-4">
      <KpiGrid totals={payload.totals} locale={locale} />
      {filters.comparePrevious && payload.comparison ? <p className="rounded-md bg-muted px-4 py-3 text-sm">{locale === "en" ? "Previous equal period" : "Предыдущий равный период"}: {formatMetric("count", payload.comparison.previousCount, locale)} · {locale === "en" ? "Change" : "Изменение"}: {formatMetric("growthRate", payload.comparison.growthRate, locale)}. {payload.comparison.growthRate === null ? locale === "en" ? "No prior sample to calculate a percentage." : "Нет предыдущей выборки для расчёта процента." : ""}</p> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <LineSection title={locale === "en" ? "Market volume" : "Объём рынка"} rows={payload.volume.timeseries} lines={["count", "vacancy", "freelance", "tender"]} filters={filters} locale={locale} />
        <BarSection title={locale === "en" ? "Opportunity types" : "Типы возможностей"} rows={payload.volume.byType} labelKeys={["type"]} filters={filters} locale={locale} />
        <BarSection title={locale === "en" ? "Active and closed" : "Активные и закрытые"} rows={payload.volume.byStatus} labelKeys={["status"]} filters={filters} locale={locale} />
        {payload.volume.sourceGroups ? <BarSection title={locale === "en" ? "Source groups" : "Группы источников"} rows={payload.volume.sourceGroups} labelKeys={["sourceGroup", "group"]} filters={filters} locale={locale} /> : null}
        <BarSection title={locale === "en" ? "Roles and categories" : "Роли и категории"} rows={payload.roles} labelKeys={["role"]} filters={filters} locale={locale} />
        <BarSection title={locale === "en" ? "Technology demand" : "Технологический спрос"} rows={payload.technologies} labelKeys={["technology"]} filters={filters} locale={locale} />
        <BarSection title={locale === "en" ? "Geography" : "География"} rows={payload.geography.locations} labelKeys={["location"]} filters={filters} locale={locale} />
        {payload.geography.countries ? <BarSection title={locale === "en" ? "Allowed countries" : "Допустимые страны"} rows={payload.geography.countries} labelKeys={["country"]} filters={filters} locale={locale} /> : null}
        <BarSection title={locale === "en" ? "Work formats" : "Форматы работы"} rows={payload.geography.remoteTypes} labelKeys={["remoteType"]} filters={filters} locale={locale} />
        {payload.volume.seniority ? <BarSection title={locale === "en" ? "Seniority" : "Уровень"} rows={payload.volume.seniority} labelKeys={["seniority"]} filters={filters} locale={locale} /> : null}
        <BarSection title={locale === "en" ? "Counterparts" : "Контрагенты"} rows={payload.counterparts} labelKeys={["counterpart"]} filters={filters} locale={locale} />
      </div>
      <DataTable title={locale === "en" ? "Sources" : "Источники"} rows={payload.sources} filters={filters} locale={locale} description={locale === "en" ? "Shows volume, freshness and duplicate contribution. This is not source technical health." : "Показывает объём, свежесть и вклад дублей. Это не технический health источника."} />
      <DataTable title={locale === "en" ? "Compensation and budgets" : "Компенсация и бюджеты"} rows={payload.compensation.byTypeCurrencyPeriodKind ?? payload.compensation.byCurrency} filters={filters} locale={locale} description={locale === "en" ? `Normalized number coverage: ${formatMetric("coverage", payload.compensation.coverage, locale)}. Without comparable values: ${payload.compensation.missingCount}. Salaries are grouped by currency and period, monthly and hourly values are not mixed.` : `Покрытие нормализованных чисел: ${formatMetric("coverage", payload.compensation.coverage, locale)}. Без сопоставимых значений: ${payload.compensation.missingCount}. Зарплаты сгруппированы по валюте и периоду, месячные и почасовые значения не смешиваются.`} />
    </div>
  );
}

function KpiGrid({ totals, locale }: { totals: Record<string, unknown>; locale: AnalyticsLocale }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{Object.entries(totals).filter(([key]) => !key.endsWith("Formula")).map(([key, value]) => <Card key={key}><CardHeader><CardDescription>{kpiLabel(key, locale)}</CardDescription><CardTitle className="text-2xl">{formatMetric(key, value, locale)}</CardTitle></CardHeader></Card>)}</div>;
}

type RowHref = false | ((row: AnalyticsRow) => string);

function BarSection({ title, rows, labelKeys, filters, locale, valueKey = "count", description, hrefForRow, includeZeros = false }: { title: string; rows: AnalyticsRow[]; labelKeys: string[]; filters: AnalyticsFilters; locale: AnalyticsLocale; valueKey?: string; description?: string; hrefForRow?: RowHref; includeZeros?: boolean }) {
  const router = useRouter();
  const data = useMemo(() => chartRows(rows, labelKeys, valueKey, locale, includeZeros), [rows, labelKeys, valueKey, locale, includeZeros]);
  const rowHref = hrefForRow === false ? undefined : hrefForRow ?? ((row: AnalyticsRow) => buildOpportunityDrilldown(filters, row));
  return <Card><CardHeader><div className="flex items-center justify-between gap-2"><CardTitle>{title}</CardTitle><Badge>{rows.length} {locale === "en" ? "rows" : "строк"}</Badge></div>{description ? <CardDescription>{description}</CardDescription> : null}</CardHeader><CardContent>{data.length ? <div className="h-72" role="img" aria-label={title}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }} onClick={(event) => { const payload = (event as { activePayload?: Array<{ payload?: AnalyticsRow }> }).activePayload; const row = Array.isArray(payload) ? payload[0]?.payload : undefined; if (row && rowHref) router.push(rowHref(row)); }}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip formatter={(value, _name, item) => { const row = item.payload as AnalyticsRow; return [formatMetric(valueKey, value, locale), row.conversionRate !== undefined ? `${columnLabel(valueKey, locale)} · ${columnLabel("conversionRate", locale)} ${formatMetric("conversionRate", row.conversionRate, locale)}` : columnLabel(valueKey, locale)]; }} labelFormatter={(label) => String(label)} /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} cursor={rowHref ? "pointer" : "default"} /></BarChart></ResponsiveContainer></div> : <EmptyRows locale={locale} />}<details className="mt-4 min-w-0"><summary className="cursor-pointer text-sm text-primary">{locale === "en" ? "View data table" : "Показать таблицу данных"}</summary><RowsTable rows={rows} locale={locale} hrefForRow={rowHref} /></details></CardContent></Card>;
}

function LineSection({ title, rows, lines, filters, locale, personal = false }: { title: string; rows: AnalyticsRow[]; lines: string[]; filters: AnalyticsFilters; locale: AnalyticsLocale; personal?: boolean }) {
  const router = useRouter();
  const [hidden, setHidden] = useState<string[]>([]);
  const [drillSeries, setDrillSeries] = useState(lines[0]);
  const href = (row: AnalyticsRow) => personal ? buildActivityTimeseriesDrilldown(filters, { ...row, bucket: row.date }, drillSeries) : buildTimeseriesDrilldown(filters, String(row.date));
  return <Card><CardHeader><div className="flex items-center justify-between gap-2"><CardTitle>{title}</CardTitle><Badge>{rows.length} {locale === "en" ? "points" : "точек"}</Badge></div></CardHeader><CardContent><div className="mb-3 flex flex-wrap gap-2">{lines.map((line, index) => <button key={line} type="button" aria-pressed={!hidden.includes(line)} onClick={() => setHidden((current) => current.includes(line) ? current.filter((value) => value !== line) : [...current, line])} className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${hidden.includes(line) ? "text-muted-foreground" : "bg-muted"}`}><span className="size-2 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />{seriesLabel(line, locale)}</button>)}</div>{personal ? <label className="mb-4 block space-y-1 text-sm"><span className="text-muted-foreground">{locale === "en" ? "Click a period to view" : "По нажатию на период открыть"}</span><select className={SELECT_CLASS} value={drillSeries} onChange={(event) => setDrillSeries(event.target.value)}>{lines.map((line) => <option key={line} value={line}>{seriesLabel(line, locale)}</option>)}</select></label> : null}{rows.length ? <div className="h-72" role="img" aria-label={title}><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ left: 8, right: 12 }} onClick={(event) => { if (typeof event?.activeLabel === "string") { const row = rows.find((item) => item.date === event.activeLabel); if (row) router.push(href(row)); } }}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} /><Tooltip formatter={(value, name) => [formatMetric(String(name), value, locale), seriesLabel(String(name), locale)]} labelFormatter={(label) => `${locale === "en" ? "Period" : "Период"}: ${label}`} />{lines.map((line, index) => <Line key={line} name={line} hide={hidden.includes(line)} type="monotone" dataKey={line} stroke={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 2, cursor: "pointer" }} activeDot={{ r: 5, cursor: "pointer" }} />)}</LineChart></ResponsiveContainer></div> : <EmptyRows locale={locale} />}<details className="mt-4 min-w-0"><summary className="cursor-pointer text-sm text-primary">{locale === "en" ? "View data table" : "Показать таблицу данных"}</summary><RowsTable rows={rows} locale={locale} hrefForRow={href} /></details></CardContent></Card>;
}

function DataTable({ title, rows, filters, locale, description, hrefForRow, hrefForCell }: { title: string; rows: AnalyticsRow[]; filters: AnalyticsFilters; locale: AnalyticsLocale; description?: string; hrefForRow?: RowHref; hrefForCell?: (row: AnalyticsRow, column: string) => string | undefined }) {
  return <Card><CardHeader><div className="flex items-center justify-between gap-2"><div><CardTitle>{title}</CardTitle>{description ? <CardDescription>{description}</CardDescription> : null}</div><Badge>{rows.length} {locale === "en" ? "rows" : "строк"}</Badge></div></CardHeader><CardContent><RowsTable rows={rows} locale={locale} hrefForRow={hrefForRow === false ? undefined : hrefForRow ?? ((row) => buildOpportunityDrilldown(filters, row))} hrefForCell={hrefForCell} /></CardContent></Card>;
}

function RowsTable({ rows, locale, hrefForRow, hrefForCell }: { rows: AnalyticsRow[]; locale: AnalyticsLocale; hrefForRow?: (row: AnalyticsRow) => string; hrefForCell?: (row: AnalyticsRow, column: string) => string | undefined }) {
  const [sort, setSort] = useState<{ column: string; descending: boolean } | null>(null);
  const [page, setPage] = useState(0);
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).filter((key) => !["pipelineReachedStatuses", "conversionRateFormula", "from", "to", "label", "labelEn"].includes(key));
  const sorted = useMemo(() => !sort ? rows : [...rows].sort((left, right) => {
    const a = left[sort.column]; const b = right[sort.column];
    const order = typeof a === "number" && typeof b === "number" ? a - b : String(a ?? "").localeCompare(String(b ?? ""), locale);
    return sort.descending ? -order : order;
  }), [rows, sort, locale]);
  const lastPage = Math.max(0, Math.ceil(rows.length / 25) - 1);
  const currentPage = Math.min(page, lastPage);
  if (!rows.length) return <EmptyRows locale={locale} />;
  return <div className="mt-3 min-w-0"><div className="max-w-full overflow-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground">{columns.map((column) => <th key={column} scope="col" aria-sort={sort?.column === column ? sort.descending ? "descending" : "ascending" : "none"} className="px-3 py-2 font-medium"><button type="button" className="whitespace-nowrap text-left hover:text-foreground" onClick={() => { setSort({ column, descending: sort?.column === column && !sort.descending }); setPage(0); }}>{columnLabel(column, locale)}{sort?.column === column ? sort.descending ? " ↓" : " ↑" : ""}</button></th>)}{hrefForRow ? <th scope="col" className="px-3 py-2 font-medium">{locale === "en" ? "Drilldown" : "Переход"}</th> : null}</tr></thead><tbody>{sorted.slice(currentPage * 25, currentPage * 25 + 25).map((row, index) => <tr key={`${rowLabel(row, columns, locale)}-${index}`} className="border-b last:border-0 hover:bg-muted/40">{columns.map((column) => <td key={column} className="px-3 py-2">{hrefForCell?.(row, column) ? <Link className="text-primary hover:underline" href={hrefForCell(row, column)!}>{formatMetric(column, row[column], locale)}</Link> : formatMetric(column, row[column], locale)}</td>)}{hrefForRow ? <td className="px-3 py-2"><Link className="whitespace-nowrap text-primary hover:underline" href={hrefForRow(row)}>{locale === "en" ? "Open opportunities" : "Открыть возможности"}</Link></td> : null}</tr>)}</tbody></table></div>{rows.length > 25 ? <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><Button size="sm" variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{locale === "en" ? "Previous" : "Назад"}</Button><span>{currentPage + 1} / {lastPage + 1} · {rows.length} {locale === "en" ? "rows" : "строк"}</span><Button size="sm" variant="outline" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>{locale === "en" ? "Next" : "Далее"}</Button></div> : null}</div>;
}

function EmptyRows({ locale }: { locale: AnalyticsLocale }) {
  return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{locale === "en" ? "No data for the selected slice." : "Нет данных за выбранный срез."}</p>;
}
