"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi } from "../api/admin-api";
import type { AdminLocale } from "./admin-locale";
import { infrastructureState } from "./infrastructure-format";

export function AdminInfrastructurePanel({ enabled, locale }: { enabled: boolean; locale: AdminLocale }) {
  const t = (ru: string, en: string) => locale === "ru" ? ru : en;
  const health = useQuery({ queryKey: ["admin", "infrastructure"], queryFn: adminApi.infrastructure, enabled, refetchInterval: 30_000 });
  const backups = useQuery({ queryKey: ["admin", "backups"], queryFn: adminApi.backups, enabled, refetchInterval: 30_000 });
  const maintenance = useQuery({ queryKey: ["admin", "search", "maintenance"], queryFn: adminApi.searchMaintenance, enabled, refetchInterval: 30_000 });
  const incidents = health.data?.services?.filter(service => service.healthy === false) ?? [];
  const alerts = incidents.map(service => ({ id: service.id, href: "/admin/infrastructure", text: `${service.label}: ${infrastructureState(service.state, locale)}` }));
  if (backups.data?.items[0]?.status === "Failed") alerts.push({ id: "backup", href: "/admin/infrastructure?tab=backups", text: t("Последняя резервная копия завершилась ошибкой", "The last backup failed") });
  if (maintenance.data?.latest?.state === "failed") alerts.push({ id: "search", href: "/admin/infrastructure?tab=search", text: t("Последняя пересборка поиска завершилась ошибкой", "The last search rebuild failed") });
  const status = health.data?.status ?? "unknown";
  const unavailable = health.isError || backups.isError || maintenance.isError;

  return <section className="mb-5 min-w-0 rounded-lg border bg-card p-4" aria-label={t("Инфраструктура", "Infrastructure")}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Server className="size-5 text-primary" aria-hidden /><h2 className="font-semibold">{t("Инфраструктура", "Infrastructure")}</h2><Badge intent={status === "issue" || status === "degraded" ? "danger" : status === "operational" ? "success" : "neutral"}>{health.isLoading ? t("Проверяем…", "Checking…") : infrastructureState(status, locale)}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{t("Сервисы, поиск и резервные копии проверяются отдельно от источников.", "Services, search and backups are checked separately from sources.")}</p></div>
      <Button size="sm" variant="outline" asChild><Link href="/admin/infrastructure">{t("Открыть", "Open")}<ArrowRight className="size-4" aria-hidden /></Link></Button>
    </div>
    {unavailable ? <p role="alert" className="mt-3 text-sm text-warning">{t("Часть сведений недоступна. Откройте инфраструктуру для подробностей и повторной проверки.", "Some information is unavailable. Open Infrastructure for details and another check.")}</p> : null}
    {alerts.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{alerts.map(alert => <Link key={alert.id} href={alert.href} className="flex min-w-0 items-center gap-2 rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden /><span className="min-w-0 break-words">{alert.text}</span></Link>)}</div> : null}
  </section>;
}
