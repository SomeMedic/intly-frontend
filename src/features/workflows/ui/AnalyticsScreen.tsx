"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth";
import { workflowApi } from "../api/workflow-api";
import { QueryState, ScreenScaffold } from "./ScreenScaffold";
import { countLabel, enumLabel, pipelineStageLabels, pipelineTypeLabels, resolveWorkflowLocale, type WorkflowLocale } from "./workflow-labels";

type Row = Record<string, unknown>;

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function humanizeKey(key: string, locale: WorkflowLocale) {
  const known: Record<string, Record<WorkflowLocale, string>> = {
    totals: { ru: "Итого", en: "Totals" },
    funnel: { ru: "Воронка", en: "Funnel" },
    currentPipeline: { ru: "Текущий pipeline", en: "Current pipeline" },
    technologies: { ru: "Технологии", en: "Technologies" },
    sources: { ru: "Источники", en: "Sources" },
    byType: { ru: "Типы возможностей", en: "Opportunity types" }
  };
  return known[key]?.[locale] ?? key.replaceAll("_", " ");
}

function rowName(row: Row, labelKeys: string[], locale: WorkflowLocale) {
  const labelKey = labelKeys.find((key) => typeof row[key] === "string") ?? "label";
  const value = String(row[labelKey] ?? "—");
  if (labelKey === "status") return enumLabel(pipelineStageLabels, value, locale);
  if (labelKey === "type" || labelKey === "_id") return enumLabel(pipelineTypeLabels, value, locale);
  return value;
}

function chartRows(rows: Row[], labelKeys: string[], locale: WorkflowLocale) {
  return rows.map((row) => {
    return { name: rowName(row, labelKeys, locale), count: typeof row.count === "number" ? row.count : Number(row.count ?? 0) };
  }).filter((row) => row.count > 0).slice(0, 12);
}

function MetricCards({ totals, locale }: { totals: Row; locale: WorkflowLocale }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Object.entries(totals).map(([key, value]) => <section key={key} className="rounded-lg border bg-card p-[var(--card-padding)]"><p className="text-sm text-muted-foreground">{humanizeKey(key, locale)}</p><p className="mt-2 text-2xl font-semibold">{String(value ?? "—")}</p></section>)}</div>;
}

function AnalyticsChart({ title, rows, labelKeys, locale }: { title: string; rows: Row[]; labelKeys: string[]; locale: WorkflowLocale }) {
  const data = useMemo(() => chartRows(rows, labelKeys, locale), [rows, labelKeys, locale]);
  return (
    <section className="rounded-lg border bg-card p-[var(--card-padding)]">
      <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">{title}</h2><Badge>{countLabel(data.length, ["строка", "строки", "строк"], "row", "rows", locale)}</Badge></div>
      {data.length ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: "rgba(125, 92, 255, 0.08)" }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <p className="text-sm text-muted-foreground">{locale === "en" ? "No data for the selected slice." : "Нет данных за выбранный срез."}</p>}
    </section>
  );
}

function JsonValue({ value }: { value: unknown }) {
  if (value === null || typeof value !== "object") return <span>{String(value ?? "—")}</span>;
  return <pre className="max-h-64 overflow-auto rounded-md border bg-muted p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>;
}

export function AnalyticsScreen({ kind }: { kind: "personal" | "market" }) {
  const { user } = useAuth();
  const locale = resolveWorkflowLocale(user?.settings.locale);
  const query = useQuery({ queryKey: ["analytics", kind], queryFn: () => kind === "personal" ? workflowApi.analytics.personal() : workflowApi.analytics.market() });
  const payload = query.data ?? {};
  const entries = Object.entries(payload);
  const totals = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Row).totals as Row | undefined : undefined;
  const known = new Set(["totals", "funnel", "currentPipeline", "technologies", "sources", "byType"]);

  return (
    <ScreenScaffold title={kind === "personal" ? locale === "en" ? "Personal Analytics" : "Личная аналитика" : locale === "en" ? "Market Analytics" : "Рыночная аналитика"} description={kind === "personal" ? locale === "en" ? "Personal funnel, pipeline, technology and source metrics." : "Личная воронка, pipeline, технологии и источники." : locale === "en" ? "Market distribution by type, technology and source." : "Распределение рынка по типам, технологиям и источникам."}>
      <QueryState isLoading={query.isLoading} isError={query.isError} isEmpty={query.isSuccess && !entries.length} emptyTitle={locale === "en" ? "No analytics payload" : "Нет данных аналитики"} emptyDescription={locale === "en" ? "Analytics will appear after opportunities and personal states are collected." : "Аналитика появится после сбора возможностей и личных состояний."} onRetry={() => query.refetch()}>
        <div className="space-y-4">
          {totals ? <MetricCards totals={totals} locale={locale} /> : null}
          <div className="grid gap-3 xl:grid-cols-2">
            {asRows((payload as Row).funnel).length ? <AnalyticsChart title={locale === "en" ? "Funnel" : "Воронка"} rows={asRows((payload as Row).funnel)} labelKeys={["status"]} locale={locale} /> : null}
            {asRows((payload as Row).currentPipeline).length ? <AnalyticsChart title={locale === "en" ? "Current pipeline" : "Текущий pipeline"} rows={asRows((payload as Row).currentPipeline)} labelKeys={["status"]} locale={locale} /> : null}
            {asRows((payload as Row).byType).length ? <AnalyticsChart title={locale === "en" ? "Opportunity types" : "Типы возможностей"} rows={asRows((payload as Row).byType)} labelKeys={["type", "_id"]} locale={locale} /> : null}
            {asRows((payload as Row).technologies).length ? <AnalyticsChart title={locale === "en" ? "Technologies" : "Технологии"} rows={asRows((payload as Row).technologies)} labelKeys={["technology", "_id"]} locale={locale} /> : null}
            {asRows((payload as Row).sources).length ? <AnalyticsChart title={locale === "en" ? "Sources" : "Источники"} rows={asRows((payload as Row).sources)} labelKeys={["sourceId", "source", "_id"]} locale={locale} /> : null}
          </div>
          {entries.filter(([key]) => !known.has(key)).length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{entries.filter(([key]) => !known.has(key)).map(([key, value]) => <section key={key} className="rounded-lg border bg-card p-[var(--card-padding)]"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">{humanizeKey(key, locale)}</h2><Badge>{Array.isArray(value) ? countLabel(value.length, ["строка", "строки", "строк"], "row", "rows", locale) : typeof value}</Badge></div><JsonValue value={value} /></section>)}</div> : null}
        </div>
      </QueryState>
    </ScreenScaffold>
  );
}
