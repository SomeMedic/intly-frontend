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
import { QueryState, ScreenScaffold } from "./ScreenScaffold";
import { enumLabel, resolveWorkflowLocale, searchTypeLabels } from "./workflow-labels";

export function SearchScreen() {
  const { user } = useAuth();
  const locale = resolveWorkflowLocale(user?.settings.locale);
  const [queryText, setQueryText] = useState("");
  const recent = useQuery({ queryKey: ["search", "recent"], queryFn: workflowApi.search.recent });
  const search = useMutation({
    mutationFn: ({ query, scope }: { query: string; scope?: string }) => workflowApi.search.run(query, scope),
    onSuccess: () => recent.refetch()
  });
  const clear = useMutation({ mutationFn: workflowApi.search.clearRecent, onSuccess: () => recent.refetch() });
  const results = search.data?.items ?? [];

  return (
    <ScreenScaffold title={locale === "en" ? "Search" : "Поиск"} description={locale === "en" ? "Unified keyword and semantic search across permitted entities." : "Единый текстовый и семантический поиск по доступным сущностям."}>
      <form
        className="flex flex-col gap-2 rounded-lg border bg-card p-[var(--card-padding)] md:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (queryText.trim()) search.mutate({ query: queryText.trim() });
        }}
      >
        <Input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder={locale === "en" ? "Senior Python remote, tenders this week..." : "Senior Python remote, тендеры на этой неделе..."} />
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
            emptyDescription={locale === "en" ? "Search returned no permitted entities." : "Поиск не вернул доступных сущностей."}
            onRetry={() => queryText && search.mutate({ query: queryText })}
          >
            <div className="space-y-2">
              {results.map((result) => (
                <Link key={`${result.type}-${result.id}`} href={result.href} className="block rounded-lg border bg-card p-3 transition hover:border-primary/50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{result.title}</h2>
                      {result.subtitle ? <p className="mt-1 text-sm text-muted-foreground">{result.subtitle}</p> : null}
                    </div>
                    <Badge intent="neutral">{enumLabel(searchTypeLabels, result.type, locale)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </QueryState>
        </div>
        <aside className="rounded-lg border bg-card p-[var(--card-padding)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{locale === "en" ? "Recent" : "Недавние"}</h2>
            <Button size="icon" variant="ghost" onClick={() => clear.mutate()} aria-label={locale === "en" ? "Clear recent searches" : "Очистить недавние поиски"}>
              <Trash2 className="size-4" />
            </Button>
          </div>
          <QueryState
            isLoading={recent.isLoading}
            isError={recent.isError}
            isEmpty={!recent.data?.items.length}
            emptyTitle={locale === "en" ? "No recent searches" : "Недавних поисков нет"}
            onRetry={() => recent.refetch()}
          >
            <div className="mt-3 space-y-2">
              {recent.data?.items.map((item) => (
                <button key={item.id} className="block w-full rounded-md border px-3 py-2 text-left text-sm" onClick={() => setQueryText(item.query)}>
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
