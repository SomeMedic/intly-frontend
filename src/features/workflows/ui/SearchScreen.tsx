"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth";
import { workflowApi } from "../api/workflow-api";
import {
  QueryState,
  ScreenScaffold,
  workflowPanelClass,
  workflowSubPanelClass
} from "./ScreenScaffold";
import { enumLabel, resolveWorkflowLocale, searchTypeLabels } from "./workflow-labels";

export function SearchScreen() {
  const { user } = useAuth();
  const locale = resolveWorkflowLocale(user?.settings.locale);
  const [queryText, setQueryText] = useState("");
  const recent = useQuery({ queryKey: ["search", "recent"], queryFn: workflowApi.search.recent });
  const search = useMutation({
    mutationFn: ({ query, scope }: { query: string; scope?: string }) =>
      workflowApi.search.run(query, scope),
    onSuccess: () => recent.refetch()
  });
  const clear = useMutation({
    mutationFn: workflowApi.search.clearRecent,
    onSuccess: () => recent.refetch()
  });
  const results = search.data?.items ?? [];

  return (
    <ScreenScaffold
      title={locale === "en" ? "Search" : "Поиск"}
      description={
        locale === "en"
          ? "Find opportunities, tasks, profiles, saved searches, and useful notes in one place."
          : "Ищите возможности, задачи, профили, сохранённые поиски и важные заметки в одном месте."
      }
    >
      <form
        className={`${workflowPanelClass} flex flex-col gap-2 md:flex-row md:items-center`}
        onSubmit={(event) => {
          event.preventDefault();
          if (queryText.trim()) search.mutate({ query: queryText.trim() });
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder={
              locale === "en"
                ? "Senior Python remote, tenders this week..."
                : "Senior Python remote, тендеры на этой неделе..."
            }
          />
        </div>
        <Button type="submit" loading={search.isPending}>
          <Search className="size-4" />
          {locale === "en" ? "Search" : "Искать"}
        </Button>
      </form>

      <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <QueryState
            isLoading={search.isPending}
            isError={search.isError}
            isEmpty={search.isSuccess && !results.length}
            emptyTitle={locale === "en" ? "No results" : "Ничего не найдено"}
            emptyDescription={
              locale === "en"
                ? "Try a role, company, platform, or deadline. Results respect your access."
                : "Попробуйте роль, компанию, площадку или срок. Поиск показывает только доступные вам данные."
            }
            onRetry={() => queryText && search.mutate({ query: queryText })}
          >
            <div className="space-y-2">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className={`${workflowPanelClass} block transition hover:border-primary/50 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold">{result.title}</h2>
                      {result.subtitle ? (
                        <p className="mt-1 text-sm text-muted-foreground">{result.subtitle}</p>
                      ) : null}
                      {result.excerpt ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {result.excerpt}
                        </p>
                      ) : null}
                    </div>
                    <Badge className="shrink-0" intent="neutral">
                      {enumLabel(searchTypeLabels, result.type, locale)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </QueryState>
        </div>
        <aside className={workflowPanelClass}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{locale === "en" ? "Recent" : "Недавние"}</h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => clear.mutate()}
              aria-label={locale === "en" ? "Clear recent searches" : "Очистить недавние поиски"}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <QueryState
            isLoading={recent.isLoading}
            isError={recent.isError}
            isEmpty={!recent.data?.items.length}
            emptyTitle={locale === "en" ? "No recent searches" : "Недавних поисков нет"}
            emptyDescription={
              locale === "en"
                ? "Queries you run here will stay within reach."
                : "Запросы, которые вы запустите здесь, появятся в этом списке."
            }
            onRetry={() => recent.refetch()}
          >
            <div className="mt-3 space-y-2">
              {recent.data?.items.map((item) => (
                <button
                  key={item.id}
                  className={`${workflowSubPanelClass} block w-full text-left text-sm transition hover:border-primary/45 hover:bg-muted/40`}
                  onClick={() => setQueryText(item.query)}
                >
                  {item.query}
                </button>
              ))}
            </div>
          </QueryState>
        </aside>
      </section>
    </ScreenScaffold>
  );
}
