"use client";

import type { ReactNode } from "react";
import { RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/intly/app-shell";
import { BrandArt, type BrandArtKind } from "@/components/intly/brand";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/intly/empty-state";
import { ErrorState } from "@/components/intly/error-state";
import { Skeleton } from "@/components/intly/loading";
import { useAuth } from "@/features/auth";

export const workflowPanelClass =
  "intly-section min-w-0 rounded-lg border border-border/70 bg-card/95 p-[var(--card-padding)] shadow-[0_1px_0_rgba(8,9,10,0.03)]";
export const workflowSubPanelClass =
  "min-w-0 rounded-md border border-border/70 bg-background/55 p-3";
export const workflowControlClass =
  "h-[var(--control-height)] w-full min-w-0 rounded-md border border-border/80 bg-card px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring";
export const workflowLabelClass = "block min-w-0 space-y-1.5 text-sm";
export const workflowLabelTextClass = "block text-xs font-medium text-muted-foreground";

export function ScreenScaffold({
  title,
  description,
  action,
  artwork,
  children
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  artwork?: BrandArtKind;
  children: ReactNode;
}) {
  return (
    <AppShell>
      <header className="intly-page-header mb-5 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
        <div className="flex w-full min-w-0 flex-1 items-center gap-4 sm:w-auto">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {artwork ? (
            <BrandArt
              kind={artwork}
              className="ml-auto hidden w-24 shrink-0 opacity-80 sm:block sm:w-28"
            />
          ) : null}
        </div>
        {action ? <div className="intly-toolbar flex flex-wrap gap-1.5">{action}</div> : null}
      </header>
      {children}
    </AppShell>
  );
}

export function QueryState({
  isLoading,
  isError,
  isEmpty,
  emptyTitle,
  emptyDescription,
  onRetry,
  children
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const english = user?.settings.locale === "en";
  if (isLoading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={
          english
            ? "Could not load this section. Please try again."
            : "Не удалось загрузить данные этого раздела. Повторите запрос."
        }
        onRetry={onRetry}
      />
    );
  }

  if (isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return <>{children}</>;
}

export function RefreshButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  const { user } = useAuth();
  const english = user?.settings.locale === "en";
  return (
    <Button size="sm" variant="outline" onClick={onClick} loading={loading}>
      <RefreshCcw className="size-4" />
      {english ? "Refresh" : "Обновить"}
    </Button>
  );
}
