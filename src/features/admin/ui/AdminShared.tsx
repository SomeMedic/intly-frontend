"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/intly/app-shell";
import { ErrorState } from "@/components/intly/error-state";
import { Skeleton } from "@/components/intly/loading";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";
import { adminNavCopy, commonAdminCopy, useAdminLocale } from "./admin-locale";

const adminGuardCopy = {
  ru: {
    loading: "Проверяем доступ к админ-панели…",
    deniedTitle: "Админ-панель недоступна",
    deniedDescription: "Этот раздел доступен только пользователям с ролью Admin. Ваши обычные рабочие данные остаются доступны в основном кабинете.",
    goDashboard: "Перейти в основной кабинет",
  },
  en: {
    loading: "Checking admin access…",
    deniedTitle: "Admin area unavailable",
    deniedDescription: "This section is available only to users with the Admin role. Your regular workspace remains available in the main dashboard.",
    goDashboard: "Go to main dashboard",
  },
} as const;

export function AdminFrame({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const locale = useAdminLocale();
  const nav = adminNavCopy[locale];
  const guard = adminGuardCopy[locale];
  const { user, bootstrapped } = useAuth();

  if (!bootstrapped) {
    return (
      <AppShell>
        <section className="rounded-lg border bg-card p-[var(--card-padding)]">
          <p className="text-sm text-muted-foreground">{guard.loading}</p>
          <Skeleton className="mt-4 h-40 w-full" />
        </section>
      </AppShell>
    );
  }

  if (user?.role !== "Admin") {
    return (
      <AppShell>
        <section className="rounded-lg border bg-card p-[var(--card-padding)]">
          <h1 className="text-2xl font-semibold">{guard.deniedTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{guard.deniedDescription}</p>
          <Button className="mt-4" asChild><Link href="/dashboard">{guard.goDashboard}</Link></Button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild><Link href="/admin">{nav.dashboard}</Link></Button>
          <Button size="sm" variant="outline" asChild><Link href="/admin/users">{nav.users}</Link></Button>
          <Button size="sm" variant="outline" asChild><Link href="/admin/sources">{nav.sources}</Link></Button>
          <Button size="sm" variant="outline" asChild><Link href="/admin/ai">{nav.ai}</Link></Button>
          <Button size="sm" variant="outline" asChild><Link href="/admin/jobs">{nav.jobs}</Link></Button>
          <Button size="sm" variant="outline" asChild><Link href="/admin/infrastructure">{nav.infrastructure}</Link></Button>
          <Button size="sm" variant="outline" asChild><Link href="/admin/issues">{nav.issues}</Link></Button>
        </div>
      </header>
      {children}
    </AppShell>
  );
}

export function AdminQueryState({ isLoading, isError, onRetry, children }: { isLoading: boolean; isError: boolean; onRetry: () => void; children: ReactNode }) {
  const locale = useAdminLocale();
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError) return <ErrorState message={commonAdminCopy[locale].loadingError} onRetry={onRetry} />;
  return <>{children}</>;
}

export function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="rounded-lg border bg-card p-[var(--card-padding)]">
      <h2 className="mb-3 min-w-0 font-semibold">{title}</h2>
      <pre className="max-h-[32rem] overflow-auto rounded-md border bg-muted p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}
