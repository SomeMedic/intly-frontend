"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, BriefcaseBusiness, Clock3, FileText, FolderSearch, Layers3, Loader2, Search, Sparkles, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import { useUiPreferences } from "@/hooks/use-ui-preferences";
import {
  type FlatSearchItem,
  type GlobalSearchResponse,
  type GlobalSearchScope,
  flattenSearchResponse,
  nextSelectedIndex,
  scopeForCategory,
  scopeLabels,
  searchScopes
} from "./model";

type RecentSearch = { id: string; query: string; scope?: GlobalSearchScope; createdAt: string };

const copy = {
  ru: {
    trigger: "Поиск",
    triggerFull: "Поиск по вакансиям, задачам, профилям и знаниям",
    placeholder: "Введите запрос или естественное описание...",
    close: "Закрыть поиск",
    examplesTitle: "Быстрый старт",
    recentTitle: "Недавние",
    categoriesTitle: "Категории",
    resultsTitle: "Результаты",
    previewTitle: "Предпросмотр",
    loading: "Ищу по доступным данным...",
    empty: "Ничего не найдено",
    emptyHint: "Попробуйте другой запрос или категорию.",
    error: "Поиск временно недоступен",
    noPreview: "Выберите результат, чтобы увидеть краткое описание.",
    semantic: "ключевой + семантический поиск",
    open: "Открыть",
    examples: ["Senior Python remote", "Заказы на AI-агентов от 100k", "Тендеры с дедлайном на этой неделе"],
    categories: [
      ["opportunities", "Все возможности"],
      ["vacancies", "Вакансии"],
      ["freelance", "Фриланс"],
      ["tenders", "Тендеры"],
      ["tasks", "Задачи"],
      ["profiles", "Профили"],
      ["watchlists", "Подборки"]
    ] as Array<[string, string]>
  },
  en: {
    trigger: "Search",
    triggerFull: "Search opportunities, tasks, profiles, and knowledge",
    placeholder: "Enter a query or describe what you need...",
    close: "Close search",
    examplesTitle: "Quick start",
    recentTitle: "Recent",
    categoriesTitle: "Categories",
    resultsTitle: "Results",
    previewTitle: "Preview",
    loading: "Searching permitted data...",
    empty: "No results",
    emptyHint: "Try another query or category.",
    error: "Search is temporarily unavailable",
    noPreview: "Select a result to see its short preview.",
    semantic: "keyword + semantic search",
    open: "Open",
    examples: ["Senior Python remote", "AI agent projects above 100k", "Tenders with deadlines this week"],
    categories: [
      ["opportunities", "All opportunities"],
      ["vacancies", "Vacancies"],
      ["freelance", "Freelance"],
      ["tenders", "Tenders"],
      ["tasks", "Tasks"],
      ["profiles", "Profiles"],
      ["watchlists", "Watchlists"]
    ] as Array<[string, string]>
  }
} as const;

const icons = {
  opportunities: BriefcaseBusiness,
  tasks: Layers3,
  profiles: UserRound,
  watchlists: FolderSearch,
  knowledge: FileText
} as const;

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [delayMs, value]);
  return debounced;
}

export function GlobalSearch() {
  const router = useRouter();
  const { user } = useAuth();
  const locale = user?.settings.locale === "en" ? "en" : "ru";
  const text = copy[locale];
  const { searchOpen, setSearchOpen } = useUiPreferences();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<GlobalSearchScope>("all");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const invokeRef = useRef<HTMLButtonElement>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), 260);
  const canSearch = searchOpen && debouncedQuery.length >= 2;

  const recent = useQuery({
    queryKey: ["global-search", "recent"],
    queryFn: () => api.get<{ items: RecentSearch[]; nextCursor: string | null }>("/search/recent"),
    enabled: searchOpen,
    staleTime: 20_000
  });

  const results = useQuery({
    queryKey: ["global-search", debouncedQuery, scope],
    queryFn: () => api.post<GlobalSearchResponse>("/search", { query: debouncedQuery, scope, mode: "hybrid", limit: 8 }),
    enabled: canSearch,
    staleTime: 5_000
  });

  const normalized = useMemo(() => flattenSearchResponse(results.data, scope), [results.data, scope]);
  const activeIndex = selectedIndex >= 0 && selectedIndex < normalized.flat.length ? selectedIndex : normalized.flat.length ? 0 : -1;
  const activeResult = activeIndex >= 0 ? normalized.flat[activeIndex] : undefined;

  const close = () => {
    setSelectedIndex(-1);
    setSearchOpen(false);
  };
  const runExample = (value: string) => {
    setQuery(value);
    setScope("all");
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };
  const openResult = (item: FlatSearchItem | undefined) => {
    if (!item) return;
    close();
    router.push(item.href);
  };

  return (
    <>
      <button
        ref={invokeRef}
        type="button"
        onClick={() => setSearchOpen(true)}
        title={text.triggerFull}
        aria-label={text.triggerFull}
        className="flex h-[var(--control-height)] w-10 shrink-0 items-center justify-center gap-2 rounded-md border bg-card px-2 text-left text-sm text-muted-foreground shadow-sm transition hover:border-primary/45 sm:w-28 sm:justify-start sm:px-3 2xl:min-w-28 2xl:flex-1"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden truncate sm:inline 2xl:hidden">{text.trigger}</span>
        <span className="hidden truncate 2xl:inline">{text.triggerFull}</span>
      </button>
      <Dialog.Root open={searchOpen} onOpenChange={(open) => { if (!open) close(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-background/78 backdrop-blur-sm motion-reduce:backdrop-blur-none" />
          <Dialog.Content
          className="fixed left-1/2 top-7 z-50 grid max-h-[calc(100dvh-3.5rem)] w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border bg-card shadow-floating sm:top-[7vh] sm:max-h-[86dvh]"
          onOpenAutoFocus={(event) => { event.preventDefault(); inputRef.current?.focus(); }}
          onCloseAutoFocus={(event) => { event.preventDefault(); invokeRef.current?.focus(); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
            if (event.target === inputRef.current && event.key === "ArrowDown") {
              event.preventDefault();
              setSelectedIndex((current) => nextSelectedIndex(current, normalized.flat.length, 1));
            }
            if (event.target === inputRef.current && event.key === "ArrowUp") {
              event.preventDefault();
              setSelectedIndex((current) => nextSelectedIndex(current, normalized.flat.length, -1));
            }
            if (event.target === inputRef.current && event.key === "Enter" && normalized.flat.length) {
              event.preventDefault();
              openResult(normalized.flat[activeIndex >= 0 ? activeIndex : 0]);
            }
          }}
        >
            <Dialog.Title className="sr-only">{text.triggerFull}</Dialog.Title>
            <Dialog.Description className="sr-only">{text.placeholder}</Dialog.Description>
            <div className="min-w-0 border-b p-3">
              <div className="flex items-center gap-2">
                <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/12 text-primary">
                  <Search className="size-5" />
                </div>
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedIndex(-1);
                  }}
                  placeholder={text.placeholder}
                  className="min-w-0 flex-1 border-0 px-0 text-base shadow-none focus:ring-0"
                  aria-label={text.triggerFull}
                />
                {results.isFetching ? <Loader2 className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden /> : null}
                <Button size="icon" variant="ghost" onClick={close} aria-label={text.close}>
                  <X className="size-4" />
                </Button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={text.categoriesTitle}>
                {(["all", ...searchScopes] as GlobalSearchScope[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setScope(item);
                      setSelectedIndex(-1);
                    }}
                    className={cn(
                      "h-8 shrink-0 rounded-md border px-3 text-xs font-medium transition hover:border-primary/50",
                      scope === item ? "border-primary/50 bg-primary/10 text-primary" : "bg-background text-muted-foreground"
                    )}
                    role="tab"
                    aria-selected={scope === item}
                  >
                    {scopeLabels[locale][item]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="min-h-0 min-w-0 overflow-y-auto p-3">
                {!query.trim() ? (
                  <StartState
                    locale={locale}
                    recent={recent.data?.items ?? []}
                    onRecent={(item) => {
                      setQuery(item.query);
                      setScope(item.scope ?? "all");
                      setSelectedIndex(-1);
                    }}
                    onExample={runExample}
                    onCategory={(category) => {
                      setScope(scopeForCategory(category));
                      setSelectedIndex(-1);
                    }}
                  />
                ) : (
                  <ResultState
                    locale={locale}
                    items={normalized.byScope}
                    flat={normalized.flat}
                    selectedId={activeResult?.id}
                    loading={results.isFetching}
                    error={results.isError}
                    queryReady={canSearch}
                    onOpen={openResult}
                  />
                )}
              </div>
              <aside className="hidden min-h-0 border-l bg-muted/35 p-4 md:block">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{text.previewTitle}</p>
                {activeResult ? <ResultPreview item={activeResult} locale={locale} /> : <p className="mt-4 text-sm text-muted-foreground">{text.noPreview}</p>}
              </aside>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function StartState({
  locale,
  recent,
  onRecent,
  onExample,
  onCategory
}: {
  locale: "ru" | "en";
  recent: RecentSearch[];
  onRecent: (item: RecentSearch) => void;
  onExample: (value: string) => void;
  onCategory: (category: string) => void;
}) {
  const text = copy[locale];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <section>
        <p className="text-xs font-semibold uppercase text-muted-foreground">{text.examplesTitle}</p>
        <div className="mt-2 grid gap-2">
          {text.examples.map((example) => (
            <button key={example} type="button" onClick={() => onExample(example)} className="group flex min-h-11 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left text-sm transition hover:border-primary/50">
              <span>{example}</span>
              <Sparkles className="size-4 shrink-0 text-primary opacity-70" />
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-md border bg-muted/35 p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{text.categoriesTitle}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {text.categories.map(([id, label]) => (
            <button key={id} type="button" onClick={() => onCategory(id)} className="rounded-md border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
              {label}
            </button>
          ))}
        </div>
      </section>
      {recent.length ? (
        <section className="lg:col-span-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{text.recentTitle}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {recent.slice(0, 6).map((item) => (
              <button key={item.id} type="button" onClick={() => onRecent(item)} className="flex min-h-10 items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm transition hover:border-primary/50">
                <Clock3 className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{item.query}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ResultState({
  locale,
  items,
  flat,
  selectedId,
  loading,
  error,
  queryReady,
  onOpen
}: {
  locale: "ru" | "en";
  items: ReturnType<typeof flattenSearchResponse>["byScope"];
  flat: FlatSearchItem[];
  selectedId?: string;
  loading: boolean;
  error: boolean;
  queryReady: boolean;
  onOpen: (item: FlatSearchItem) => void;
}) {
  const text = copy[locale];
  if (!queryReady) return <p className="text-sm text-muted-foreground">{text.semantic}</p>;
  if (loading && !flat.length) return <p className="text-sm text-muted-foreground" aria-live="polite">{text.loading}</p>;
  if (error) return <p className="text-sm text-destructive" aria-live="polite">{text.error}</p>;
  if (!flat.length) return <div className="rounded-md border bg-muted/35 p-4"><p className="font-medium">{text.empty}</p><p className="mt-1 text-sm text-muted-foreground">{text.emptyHint}</p></div>;

  return (
    <div className="space-y-4" aria-live="polite">
      {searchScopes.map((scope) => {
        const group = items[scope];
        if (!group.length) return null;
        const Icon = icons[scope];
        return (
          <section key={scope}>
            <div className="mb-2 flex items-center gap-2">
              <Icon className="size-4 text-primary" />
              <p className="text-xs font-semibold uppercase text-muted-foreground">{scopeLabels[locale][scope]}</p>
              <Badge intent="neutral">{group.length}</Badge>
            </div>
            <div className="space-y-2">
              {group.map((item) => (
                <button
                  key={`${item.scope}-${item.id}`}
                  type="button"
                  onClick={() => onOpen(item)}
                  className={cn(
                    "group block w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/50",
                    selectedId === item.id && "border-primary/55 bg-primary/10"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{item.title}</p>
                      {item.subtitle ? <p className="mt-1 truncate text-sm text-muted-foreground">{item.subtitle}</p> : null}
                    </div>
                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                  </div>
                  {item.excerpt ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p> : null}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ResultPreview({ item, locale }: { item: FlatSearchItem; locale: "ru" | "en" }) {
  const text = copy[locale];
  const Icon = icons[item.scope];
  return (
    <div className="mt-4 rounded-md border bg-card p-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <Badge intent="neutral">{scopeLabels[locale][item.scope]}</Badge>
      </div>
      <h2 className="mt-3 text-base font-semibold">{item.title}</h2>
      {item.subtitle ? <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p> : null}
      {item.excerpt ? <p className="mt-3 line-clamp-5 text-sm text-muted-foreground">{item.excerpt}</p> : null}
      {typeof item.score === "number" ? <p className="mt-3 text-xs text-muted-foreground">{locale === "en" ? "Score" : "Релевантность"}: {Math.round(item.score * 100) / 100}</p> : null}
      <p className="mt-4 text-xs font-medium text-primary">{text.open} <ArrowRight className="inline size-3" /></p>
    </div>
  );
}
