"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/intly/app-shell";
import { ErrorState } from "@/components/intly/error-state";
import { Skeleton } from "@/components/intly/loading";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";

export const adminPanelClass =
  "intly-section min-w-0 rounded-lg border border-border/70 bg-card/95 p-[var(--card-padding)] shadow-[0_1px_0_rgba(8,9,10,0.03)]";
export const adminSubPanelClass = "min-w-0 rounded-md border border-border/70 bg-background/55 p-3";
export const adminControlClass =
  "h-[var(--control-height)] w-full min-w-0 rounded-md border border-border/80 bg-card px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring";
export const adminLabelClass = "block min-w-0 space-y-1.5 text-sm";
export const adminLabelTextClass = "block text-xs font-medium text-muted-foreground";
export const adminTableWrapClass =
  "intly-table-wrap min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card";
export const adminTableClass = "w-full text-left text-sm";
export const adminTableHeadClass =
  "border-b border-border/70 bg-muted/35 text-xs font-medium text-muted-foreground";
export const adminTableCellClass = "px-3 py-2.5 align-top";


const adminSharedNavCopy = {
  ru: { dashboard: "Админка", users: "Пользователи", sources: "Источники", ai: "AI", jobs: "Очереди", infrastructure: "Инфраструктура", issues: "Обращения" },
  en: { dashboard: "Admin", users: "Users", sources: "Sources", ai: "AI", jobs: "Jobs", infrastructure: "Infrastructure", issues: "Reports" }
} as const;

const adminSharedCommonCopy = {
  ru: { loadingError: "Админский раздел вернул ошибку. Экран показывает только реальные данные API." },
  en: { loadingError: "The admin endpoint returned an error. This screen only uses real API data." }
} as const;

function adminSharedLocale(user?: { settings?: { locale?: string | null } } | null) {
  return user?.settings?.locale === "en" ? "en" : "ru";
}

const adminGuardCopy = {
  ru: {
    loading: "Проверяем доступ к администрированию…",
    deniedTitle: "Администрирование недоступно",
    deniedDescription:
      "Этот раздел доступен только пользователям с ролью Admin. Ваши обычные рабочие данные остаются доступны в основном кабинете.",
    goDashboard: "Перейти в обзор"
  },
  en: {
    loading: "Checking admin access…",
    deniedTitle: "Admin area unavailable",
    deniedDescription:
      "This section is available only to users with the Admin role. Your regular workspace remains available in the main dashboard.",
    goDashboard: "Go to overview"
  }
} as const;

export function AdminFrame({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { user, bootstrapped } = useAuth();
  const locale = adminSharedLocale(user);
  const nav = adminSharedNavCopy[locale];
  const guard = adminGuardCopy[locale];

  if (!bootstrapped) {
    return (
      <AppShell>
        <section className={adminPanelClass}>
          <p className="text-sm text-muted-foreground">{guard.loading}</p>
          <Skeleton className="mt-4 h-40 w-full" />
        </section>
      </AppShell>
    );
  }

  if (user?.role !== "Admin") {
    return (
      <AppShell>
        <section className={adminPanelClass}>
          <h1 className="text-2xl font-semibold">{guard.deniedTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{guard.deniedDescription}</p>
          <Button className="mt-4" asChild>
            <Link href="/dashboard">{guard.goDashboard}</Link>
          </Button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="intly-page-header mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="intly-toolbar flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin">{nav.dashboard}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/users">{nav.users}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/sources">{nav.sources}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/ai">{nav.ai}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/jobs">{nav.jobs}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/infrastructure">{nav.infrastructure}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/issues">{nav.issues}</Link>
          </Button>
        </div>
      </header>
      {children}
    </AppShell>
  );
}

export function AdminQueryState({
  isLoading,
  isError,
  onRetry,
  children
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const locale = adminSharedLocale(user);
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError)
    return <ErrorState message={adminSharedCommonCopy[locale].loadingError} onRetry={onRetry} />;
  return <>{children}</>;
}

export function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <section className={adminPanelClass}>
      <h2 className="mb-3 min-w-0 font-semibold">{title}</h2>
      <pre className="max-h-[32rem] overflow-auto rounded-md border bg-muted p-3 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}

export function AdminSection({
  title,
  description,
  children,
  className = ""
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${adminPanelClass} ${className}`}>
      {title || description ? (
        <div className="mb-4 min-w-0">
          {title ? <h2 className="text-base font-semibold tracking-normal">{title}</h2> : null}
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminMetric({
  label,
  value,
  hint
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <dl className={adminSubPanelClass}>
      <dt className="intly-stat-label text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
      {hint ? <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd> : null}
    </dl>
  );
}
