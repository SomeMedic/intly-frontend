import { Suspense } from "react";
import { AppShell } from "@/components/intly/app-shell";
import { Skeleton } from "@/components/intly/loading";
import { AdminJsonScreen } from "@/features/admin";

export default function AdminIssuesPage() {
  return (
    <Suspense fallback={<AdminIssuesLoading />}>
      <AdminJsonScreen kind="issues" />
    </Suspense>
  );
}

function AdminIssuesLoading() {
  return (
    <AppShell>
      <section aria-busy="true" aria-live="polite" className="rounded-lg border bg-card p-[var(--card-padding)]">
        <p className="text-sm text-muted-foreground">Загружаем админские обращения…</p>
        <Skeleton className="mt-4 h-96 w-full" />
      </section>
    </AppShell>
  );
}
