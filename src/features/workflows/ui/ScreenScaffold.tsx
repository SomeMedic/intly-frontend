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
      <header className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
        <div className="flex w-full min-w-0 flex-1 items-center gap-4 sm:w-auto">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
            {description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {artwork ? <BrandArt kind={artwork} className="ml-auto w-24 shrink-0 sm:w-32" /> : null}
        </div>
        {action}
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
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={english ? "Could not load this section. Please try again." : "Не удалось загрузить данные этого раздела. Повторите запрос."}
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
  return (
    <Button variant="outline" onClick={onClick} loading={loading}>
      <RefreshCcw className="size-4" />
      Refresh
    </Button>
  );
}
