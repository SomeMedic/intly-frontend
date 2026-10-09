"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Filter, Heart, LayoutGrid, List, Plus, Save, Search, SlidersHorizontal, Table2, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/services/api";
import { useAuth } from "@/features/auth";
import { useProfiles, getPublicSources } from "@/features/profiles";
import { useActiveProfileStore } from "@/hooks/use-active-profile";
import { AppShell } from "@/components/intly/app-shell";
import { OpportunityCard } from "@/components/intly/opportunity-card";
import { EmptyState } from "@/components/intly/empty-state";
import { ErrorState } from "@/components/intly/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import type { OpportunityType } from "@/types";
import { selectClass, toMini, type OpportunityRecord, type Page } from "./contracts";
import { OpportunityWorkspace } from "./OpportunityWorkspace";
import { ExportModal, ImportFilePanel } from "./OpportunityTransfer";
import { OpportunityFilters, AdvancedSort } from "./OpportunityControls";
import { OpportunityTable } from "./OpportunityTable";
import { buildOpportunityQuery, defaultSavedViewUrl, filterKeys, filterLabel, filterValueLabel, savedViewPayload, savedViewUrl, type OpportunityLocale } from "./view-state";
import { resolveOpportunityLocale } from "./opportunity-workspace-labels";
import { workflowApi } from "@/features/workflows";
import { TENDER_APPLICATION_SECTION_TYPES, tenderApplicationSectionLabels, type TenderApplicationSectionType } from "./response-tender-sections";

export function OpportunitiesScreen({ type }: { type?: OpportunityType }) {
  return <Suspense fallback={<AppShell><p>Загружаем возможности…</p></AppShell>}><OpportunityInventory type={type} /></Suspense>;
}

const inventoryCopy = {
  ru: {
    loading: "Загружаем возможности…",
    allTitle: "Все возможности",
    typeTabsAria: "Тип возможностей",
    savedViewsAria: "Сохранённые представления",
    searchFiltersAria: "Поиск и фильтры",
    loadedPreviewAria: "Просмотр загруженных возможностей",
    profilePrefix: "Общий корпус",
    allProfilesScope: "Все мои профили",
    noProfileActions: "выберите профиль для личных действий",
    add: "Добавить",
    tabs: { all: "Все", vacancy: "Вакансии", freelance: "Фриланс", tender: "Тендеры" },
    savedViewsAll: "Все представления",
    searchAria: "Поиск возможностей",
    searchPlaceholder: "Роль, компания, навык…",
    sortAria: "Сортировка",
    sortOptions: { recommended: "По Match", newest: "Сначала новые", deadline: "По дедлайну", "highest-pay": "По оплате", highestAI: "По AI Score" },
    advancedSort: "Несколько правил сортировки",
    favorite: "Избранное",
    saveView: "Сохранить вид",
    export: "Экспорт",
    filters: (count: number) => `Фильтры${count ? ` (${count})` : ""}`,
    viewModes: { list: "Список", table: "Таблица", cards: "Карточки" },
    removeFilter: (label: string) => `Удалить фильтр ${label}`,
    reset: "Сбросить",
    loaded: (count: number, hasMore: boolean) => `Записей загружено: ${count}${hasMore ? "+" : ""}`,
    selectLoaded: "Выбрать загруженные",
    emptyTitle: "Возможностей пока нет",
    emptyFiltered: "Попробуйте изменить фильтры или поисковый запрос.",
    emptyDefault: "Источники пополняют общий корпус. Вы также можете добавить запись вручную или импортировать ссылку.",
    addOpportunity: "Добавить возможность",
    loadMore: "Загрузить ещё",
    selected: (count: number) => `Выбрано ${count}`,
    addFavorite: "В избранное",
    hide: "Скрыть",
    archive: "В архив",
    clearSelection: "Снять выбор",
    previewTitle: "Просмотр возможности",
    previewPosition: (index: number, count: number) => `${index} из ${count}`,
    commonRecord: "Общая запись",
    previous: "Предыдущая",
    next: "Следующая",
    previousAria: "Предыдущая возможность",
    nextAria: "Следующая возможность",
    createTitle: "Добавить возможность",
    createDescription: "Ручные записи и импорт сразу доступны всем пользователям. Ваши заметки и отклики остаются личными.",
    sortTitle: "Порядок сортировки",
    done: "Готово",
    saveTitle: "Сохранить представление",
    saveDescription: "Сохраним текущие фильтры, поиск, профиль, сортировку и вид списка.",
    saveName: "Название",
    savePlaceholder: "Например: Python · удалённо",
    replaceView: (name: string) => `Заменить условия «${name}» текущими`,
    activeFilterCount: (count: number) => count ? `Дополнительных фильтров: ${count}` : "Без дополнительных фильтров",
    searchSummary: (query: string) => ` · Поиск: ${query}`,
    replaceViewButton: "Заменить представление",
    saveNewButton: "Сохранить как новое",
    savedToast: "Представление сохранено",
    stateSaveNetworkError: "Не удалось сохранить изменение. Проверьте подключение и повторите действие.",
    importFailed: "Импорт не сохранил ни одной возможности",
    createdToast: "Возможность добавлена в общий корпус",
    manual: "Вручную",
    urlImport: "Импорт ссылки",
    fileImport: "Из файла",
    type: "Тип",
    title: "Название",
    company: "Компания или заказчик",
    pay: "Оплата как в источнике",
    payPlaceholder: "Например: 250 000 ₽ / месяц",
    description: "Описание",
    skills: "Навыки через запятую",
    sourceLink: "Ссылка на источник",
    optional: " (если есть)",
    addToCorpus: "Добавить в общий корпус",
  },
  en: {
    loading: "Loading opportunities…",
    allTitle: "All opportunities",
    typeTabsAria: "Opportunity type",
    savedViewsAria: "Saved views",
    searchFiltersAria: "Search and filters",
    loadedPreviewAria: "Loaded opportunity preview",
    profilePrefix: "Shared corpus",
    allProfilesScope: "All my profiles",
    noProfileActions: "select a profile for personal actions",
    add: "Add",
    tabs: { all: "All", vacancy: "Vacancies", freelance: "Freelance", tender: "Tenders" },
    savedViewsAll: "All views",
    searchAria: "Search opportunities",
    searchPlaceholder: "Role, company, skill…",
    sortAria: "Sort",
    sortOptions: { recommended: "By Match", newest: "Newest first", deadline: "By deadline", "highest-pay": "By pay", highestAI: "By AI Score" },
    advancedSort: "Multiple sort rules",
    favorite: "Favorites",
    saveView: "Save view",
    export: "Export",
    filters: (count: number) => `Filters${count ? ` (${count})` : ""}`,
    viewModes: { list: "List", table: "Table", cards: "Cards" },
    removeFilter: (label: string) => `Remove filter ${label}`,
    reset: "Reset",
    loaded: (count: number, hasMore: boolean) => `Records loaded: ${count}${hasMore ? "+" : ""}`,
    selectLoaded: "Select loaded",
    emptyTitle: "No opportunities yet",
    emptyFiltered: "Try changing filters or the search query.",
    emptyDefault: "Sources are filling the shared corpus. You can also add a record manually or import a link.",
    addOpportunity: "Add opportunity",
    loadMore: "Load more",
    selected: (count: number) => `${count} selected`,
    addFavorite: "Add to favorites",
    hide: "Hide",
    archive: "Archive",
    clearSelection: "Clear selection",
    previewTitle: "Opportunity preview",
    previewPosition: (index: number, count: number) => `${index} of ${count}`,
    commonRecord: "Shared record",
    previous: "Previous",
    next: "Next",
    previousAria: "Previous opportunity",
    nextAria: "Next opportunity",
    createTitle: "Add opportunity",
    createDescription: "Manual records and imports are available to all users immediately. Your notes and responses stay private.",
    sortTitle: "Sort order",
    done: "Done",
    saveTitle: "Save view",
    saveDescription: "Save current filters, search, profile, sort order, and list mode.",
    saveName: "Name",
    savePlaceholder: "For example: Python · remote",
    replaceView: (name: string) => `Replace “${name}” with current criteria`,
    activeFilterCount: (count: number) => count ? `Additional filters: ${count}` : "No additional filters",
    searchSummary: (query: string) => ` · Search: ${query}`,
    replaceViewButton: "Replace view",
    saveNewButton: "Save as new",
    savedToast: "View saved",
    stateSaveNetworkError: "Could not save the change. Check your connection and try again.",
    importFailed: "Import did not save any opportunities",
    createdToast: "Opportunity added to shared corpus",
    manual: "Manual",
    urlImport: "Import link",
    fileImport: "From file",
    type: "Type",
    title: "Title",
    company: "Company or client",
    pay: "Pay as shown in source",
    payPlaceholder: "For example: $4,000 / month",
    description: "Description",
    skills: "Skills, comma-separated",
    sourceLink: "Source link",
    optional: " (optional)",
    addToCorpus: "Add to shared corpus",
  },
} as const satisfies Record<OpportunityLocale, Record<string, unknown>>;

const inventoryTypeLabels: Record<OpportunityLocale, Record<OpportunityType, string>> = {
  ru: { vacancy: "Вакансии", freelance: "Фриланс", tender: "Тендеры" },
  en: { vacancy: "Vacancies", freelance: "Freelance", tender: "Tenders" },
};

function OpportunityInventory({ type }: { type?: OpportunityType }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user, bootstrapped } = useAuth();
  const locale = resolveOpportunityLocale(user?.settings.locale);
  const copy = inventoryCopy[locale];
  const profiles = useProfiles();
  const activeId = useActiveProfileStore(state => state.activeProfileId);
  const requestedProfileId = params.get("profileId");
  const profileId = params.get("profileScope") === "all" ? undefined : requestedProfileId && profiles.data?.some(profile => profile.id === requestedProfileId) ? requestedProfileId : activeId ?? profiles.data?.find(profile => profile.isActive)?.id;
  const client = useQueryClient();
  const urlQuery = params.get("q") ?? "";
  const [searchBuffer, setSearchBuffer] = useState({ source: urlQuery, text: urlQuery });
  const searchText = searchBuffer.source === urlQuery ? searchBuffer.text : urlQuery;
  const setSearchText = (text: string) => setSearchBuffer({ source: urlQuery, text });
  const [preview, setPreview] = useState<{ id: string; tab?: string } | null>(null);
  const [creating, setCreating] = useState(params.get("add") === "true");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [replaceView, setReplaceView] = useState(false);
  const views = useQuery({ queryKey: ["saved-views"], queryFn: workflowApi.savedViews.list, enabled: bootstrapped && !!user });
  const currentView = views.data?.items.find(view => view.id === params.get("view"));
  const defaultViewUrl = defaultSavedViewUrl(views.data?.items ?? [], pathname, new URLSearchParams(params.toString()));
  useEffect(() => {
    if (defaultViewUrl) router.replace(defaultViewUrl, { scroll: false });
  }, [defaultViewUrl, router]);
  const saveView = useMutation({ mutationFn: async () => {
    const payload = savedViewPayload(new URLSearchParams(params.toString()), pathname.slice(1), saveName, profileId, type);
    return replaceView && currentView ? workflowApi.savedViews.update(currentView.id, payload) : workflowApi.savedViews.create(payload);
  }, onSuccess: view => { client.invalidateQueries({ queryKey: ["saved-views"] }); setSaveOpen(false); change("view", view.id); toast.success(copy.savedToast); }, onError: error => toast.error(error.message) });
  const mode = params.get("mode") ?? "list";
  const identityParams = new URLSearchParams(params.toString());
  identityParams.delete("mode"); identityParams.delete("add"); identityParams.delete("fields"); identityParams.delete("columnWidths");
  const selectionContext = `${identityParams}:${profileId ?? ""}`;
  const [selection, setSelection] = useState<{ context: string; ids: Set<string> }>({ context: selectionContext, ids: new Set() });
  const selected = selection.context === selectionContext ? selection.ids : new Set<string>();
  function setSelected(value: Set<string> | ((ids: Set<string>) => Set<string>)) {
    setSelection(previous => ({ context: selectionContext, ids: typeof value === "function" ? value(previous.context === selectionContext ? previous.ids : new Set()) : value }));
  }
  function change(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText !== (params.get("q") ?? "")) change("q", searchText.trim());
    }, 300);
    return () => clearTimeout(timer);
    // URL is authoritative; text is the debounced input buffer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);
  const queryParams = buildOpportunityQuery(new URLSearchParams(params.toString()), profileId, type);
  function resetFilters() { const next = new URLSearchParams(params.toString()); for (const key of filterKeys) next.delete(key); router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }); }
  const queryString = queryParams.toString();
  const query = useInfiniteQuery({ queryKey: ["opportunities", profileId, queryString], initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => api.get<Page<OpportunityRecord>>(`/opportunities?${queryString}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`, { signal }),
    getNextPageParam: page => page.nextCursor ?? undefined, enabled: bootstrapped && !!user && !(params.size === 0 && views.isPending) && !defaultViewUrl,
  });
  const catalog = useQuery({ queryKey: ["sources", "public"], queryFn: getPublicSources, enabled: !!user });
  const items = query.data?.pages.flatMap(page => page.items) ?? [];
  const previewIndex = items.findIndex(item => item.id === preview?.id);
  const stateMutation = useMutation({ mutationFn: ({ id, value }: { id: string; value: Record<string, unknown> }) => api.patch(`/opportunities/${id}/personal`, { ...value, profileId }),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ["opportunities"] }), client.invalidateQueries({ queryKey: ["dashboard"] })]), onError: error => toast.error(error instanceof ApiError && error.kind === "NetworkError" ? copy.stateSaveNetworkError : error.message) });
  const bulk = useMutation({ mutationFn: ({ action, value }: { action: string; value: Record<string, unknown> }) => api.post("/opportunities/bulk", { ids: [...selected], action, value: { ...value, profileId } }),
    onSuccess: () => { setSelected(new Set()); client.invalidateQueries({ queryKey: ["opportunities"] }); client.invalidateQueries({ queryKey: ["dashboard"] }); }, onError: error => toast.error(error.message) });
  function toggle(id: string) { setSelected(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  const filters = filterKeys.filter(key => params.has(key));
  const sourceNames = Object.fromEntries((catalog.data ?? []).map(source => [source.id, source.name]));
  return <AppShell><header className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">{type ? inventoryTypeLabels[locale][type] : copy.allTitle}</h1><p className="mt-1 text-sm text-muted-foreground">{params.get("profileScope") === "all" ? copy.allProfilesScope : copy.profilePrefix} · {profileId ? profiles.data?.find(profile => profile.id === profileId)?.name : copy.noProfileActions}</p></div><Button onClick={() => setCreating(true)}><Plus className="size-4" />{copy.add}</Button></header>
    <nav className="mb-4 flex gap-2 overflow-x-auto border-b pb-3" aria-label={copy.typeTabsAria}>{[["/opportunities", copy.tabs.all], ["/vacancies", copy.tabs.vacancy], ["/freelance", copy.tabs.freelance], ["/tenders", copy.tabs.tender]].map(([href, label]) => <Button key={href} variant={pathname === href ? "secondary" : "ghost"} asChild><Link href={href}>{label}</Link></Button>)}</nav>
    {!!views.data?.items.length && <nav aria-label={copy.savedViewsAria} className="mb-3 flex gap-2 overflow-x-auto pb-1"><Button size="sm" className="shrink-0 whitespace-nowrap" variant="ghost" asChild><Link href="/saved-views">{copy.savedViewsAll}</Link></Button>{views.data.items.filter(view => view.pinned || view.id === currentView?.id).map(view => <Button key={view.id} size="sm" className="shrink-0 whitespace-nowrap" variant={view.id === currentView?.id ? "secondary" : "outline"} asChild><Link href={savedViewUrl(view)}>{view.name}</Link></Button>)}</nav>}
    <section className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3" aria-label={copy.searchFiltersAria}><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" value={searchText} onChange={event => setSearchText(event.target.value)} aria-label={copy.searchAria} placeholder={copy.searchPlaceholder} /></div>
      <select className={selectClass} aria-label={copy.sortAria} value={params.get("sort") ?? "recommended"} onChange={event => { const next = new URLSearchParams(params.toString()); next.set("sort", event.target.value); next.delete("advancedSort"); router.replace(`${pathname}?${next}`, { scroll: false }); }}><option value="recommended">{copy.sortOptions.recommended}</option><option value="newest">{copy.sortOptions.newest}</option><option value="deadline">{copy.sortOptions.deadline}</option><option value="highest-pay">{copy.sortOptions["highest-pay"]}</option><option value="highestAI">{copy.sortOptions.highestAI}</option></select>
      <Button variant={params.has("advancedSort") ? "secondary" : "outline"} size="icon" aria-label={copy.advancedSort} onClick={() => setSortOpen(true)}><SlidersHorizontal className="size-4" /></Button>
      <Button variant={params.has("favorite") ? "secondary" : "outline"} onClick={() => change("favorite", params.has("favorite") ? "" : "true")}><Heart className="size-4" />{copy.favorite}</Button>
      <Button variant="outline" onClick={() => { setSaveName(currentView?.name ?? ""); setReplaceView(false); setSaveOpen(true); }}><Save className="size-4" />{copy.saveView}</Button>
      <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="size-4" />{copy.export}</Button>
      <Button variant="outline" onClick={() => setFiltersOpen(true)}><Filter className="size-4" />{copy.filters(filters.length)}</Button>
      <div className="flex rounded-md border p-0.5">{[["list", List], ["table", Table2], ["cards", LayoutGrid]].map(([value, Icon]) => { const Component = Icon as typeof List; return <Button key={String(value)} size="icon" variant={mode === value ? "secondary" : "ghost"} aria-label={copy.viewModes[value as keyof typeof copy.viewModes]} onClick={() => change("mode", String(value))}><Component className="size-4" /></Button>; })}</div>
    </section>
    {!!filters.length && <div className="mb-4 flex flex-wrap gap-2">{filters.map(key => { const label = filterLabel(key, locale); return <button key={key} aria-label={copy.removeFilter(label)} onClick={() => change(key, "")} className="flex max-w-full items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs"><span className="truncate">{label}: {filterValueLabel(key, params.get(key)!, sourceNames, locale)}</span><X className="size-3 shrink-0" /></button>; })}<Button variant="ghost" size="sm" onClick={resetFilters}>{copy.reset}</Button></div>}
    <div className="mb-3 flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>{copy.loaded(items.length, !!query.hasNextPage)}</span>{!!items.length && <label className="flex items-center gap-2"><input type="checkbox" checked={items.every(item => selected.has(item.id))} onChange={event => setSelected(event.target.checked ? new Set(items.map(item => item.id)) : new Set())} />{copy.selectLoaded}</label>}</div>
    {mode !== "cards" && !!items.length && <div className="mb-4 space-y-3 md:hidden">{items.map(item => <OpportunityCard key={item.id} selected={selected.has(item.id)} onSelect={() => toggle(item.id)} opportunity={toMini(item, catalog.data, locale)} onOpen={id => setPreview({ id })} onFavoriteChange={profileId ? (id, favorite) => stateMutation.mutate({ id, value: { favorite } }) : undefined} onAiAnalyze={profileId ? id => setPreview({ id, tab: "ai" }) : undefined} />)}</div>}
    {query.isPending ? <div className="space-y-3" aria-busy="true">{[1, 2, 3].map(id => <div key={id} className="h-36 animate-pulse rounded-lg border bg-muted" />)}</div> : query.isError ? <ErrorState message={query.error.message} onRetry={() => query.refetch()} /> : !items.length ? <EmptyState title={copy.emptyTitle} description={filters.length || searchText ? copy.emptyFiltered : copy.emptyDefault} actionLabel={copy.addOpportunity} onAction={() => setCreating(true)} /> : mode === "cards" ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{items.map(item => <div key={item.id}><OpportunityCard selected={selected.has(item.id)} onSelect={() => toggle(item.id)} opportunity={toMini(item, catalog.data, locale)} onOpen={id => setPreview({ id })} onFavoriteChange={profileId ? (id, favorite) => stateMutation.mutate({ id, value: { favorite } }) : undefined} onAiAnalyze={profileId ? id => setPreview({ id, tab: "ai" }) : undefined} /></div>)}</div> : <OpportunityTable items={items} sources={catalog.data ?? []} mode={mode} params={new URLSearchParams(params.toString())} change={change} selected={selected} toggle={toggle} onOpen={id => setPreview({ id })} onFavorite={profileId ? (id, enabled) => stateMutation.mutate({ id, value: { favorite: enabled } }) : undefined} favoritePending={stateMutation.isPending} hasNextPage={query.hasNextPage} loadingMore={query.isFetchingNextPage} onLoadMore={() => query.fetchNextPage()} />}
    {query.hasNextPage && <div className="mt-5 text-center"><Button variant="outline" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{copy.loadMore}</Button></div>}
    {!!selected.size && <aside className="fixed bottom-20 left-1/2 z-40 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl border bg-card p-3 shadow-xl xl:bottom-5"><span className="mr-2 text-sm font-medium">{copy.selected(selected.size)}</span><Button size="sm" variant="outline" disabled={!profileId || bulk.isPending} onClick={() => bulk.mutate({ action: "favorite", value: { enabled: true } })}>{copy.addFavorite}</Button><Button size="sm" variant="outline" disabled={!profileId || bulk.isPending} onClick={() => bulk.mutate({ action: "hide", value: { enabled: true } })}>{copy.hide}</Button><Button size="sm" variant="outline" disabled={!profileId || bulk.isPending} onClick={() => bulk.mutate({ action: "archive", value: { enabled: true } })}>{copy.archive}</Button><Button size="sm" variant="outline" onClick={() => setExportOpen(true)}><Download className="size-3.5" />{copy.export}</Button><Button variant="ghost" size="icon" aria-label={copy.clearSelection} onClick={() => setSelected(new Set())}><X className="size-4" /></Button></aside>}
    <Modal open={!!preview} onOpenChange={open => !open && setPreview(null)} title={copy.previewTitle} placement="drawer" wide>{preview && <><nav className="mb-4 flex items-center justify-between gap-3 border-b pb-3" aria-label={copy.loadedPreviewAria}><span className="text-sm text-muted-foreground">{previewIndex >= 0 ? copy.previewPosition(previewIndex + 1, items.length) : copy.commonRecord}</span><div className="flex gap-2"><Button size="sm" variant="outline" aria-label={copy.previousAria} disabled={previewIndex <= 0} onClick={() => setPreview({ id: items[previewIndex - 1].id, tab: preview.tab })}><ChevronLeft className="size-4" />{copy.previous}</Button><Button size="sm" variant="outline" aria-label={copy.nextAria} disabled={previewIndex < 0 || previewIndex >= items.length - 1} onClick={() => setPreview({ id: items[previewIndex + 1].id, tab: preview.tab })}>{copy.next}<ChevronRight className="size-4" /></Button></div></nav><OpportunityWorkspace key={`${preview.id}:${preview.tab ?? "description"}`} id={preview.id} initialTab={preview.tab} profileIdOverride={profileId} compact onUpdated={() => client.invalidateQueries({ queryKey: ["opportunities"] })} /></>}</Modal>
    <ExportModal key={exportOpen ? `open-${selected.size}` : "closed"} open={exportOpen} onOpenChange={setExportOpen} query={Object.fromEntries(queryParams)} selectedIds={[...selected]} loadedIds={items.map(item => item.id)} profileId={profileId} />
    <Modal open={creating} onOpenChange={setCreating} title={copy.createTitle} description={copy.createDescription} wide><ImportForm type={type} profileId={profileId} locale={locale} onCreated={id => { setCreating(false); client.invalidateQueries({ queryKey: ["opportunities"] }); client.invalidateQueries({ queryKey: ["dashboard"] }); if (id) setPreview({ id }); }} /></Modal>
    <OpportunityFilters open={filtersOpen} onOpenChange={setFiltersOpen} params={new URLSearchParams(params.toString())} sources={catalog.data ?? []} change={change} reset={resetFilters} fixedType={type} locale={locale} />
    <Modal open={sortOpen} onOpenChange={setSortOpen} title={copy.sortTitle}><AdvancedSort params={new URLSearchParams(params.toString())} change={change} locale={locale} /><Button className="mt-5" onClick={() => setSortOpen(false)}>{copy.done}</Button></Modal>
    <Modal open={saveOpen} onOpenChange={setSaveOpen} title={copy.saveTitle} description={copy.saveDescription}><form className="space-y-4" onSubmit={event => { event.preventDefault(); saveView.mutate(); }}><label className="block text-sm">{copy.saveName}<Input className="mt-1" autoFocus required maxLength={160} value={saveName} onChange={event => setSaveName(event.target.value)} placeholder={copy.savePlaceholder} /></label>{currentView && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={replaceView} onChange={event => setReplaceView(event.target.checked)} /><span>{copy.replaceView(currentView.name)}</span></label>}<div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">{copy.activeFilterCount(filters.length)}{searchText ? copy.searchSummary(searchText) : ""}</div><Button type="submit" disabled={!saveName.trim()} loading={saveView.isPending}>{replaceView ? copy.replaceViewButton : copy.saveNewButton}</Button></form></Modal>
  </AppShell>;
}

function ImportForm({ type, profileId, locale, onCreated }: { type?: OpportunityType; profileId?: string; locale: OpportunityLocale; onCreated: (id?: string) => void }) {
  const copy = inventoryCopy[locale];
  const [mode, setMode] = useState("manual");
  const [kind, setKind] = useState<OpportunityType>(type ?? "vacancy");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [money, setMoney] = useState("");
  const [url, setUrl] = useState("");
  const [requiredSections, setRequiredSections] = useState<TenderApplicationSectionType[]>([]);
  const mutation = useMutation({ mutationFn: async () => {
    if (mode === "url") { const result = await api.post<{ persistedOpportunityIds: string[] }>("/sources/import-url", { url, type: kind, ...(profileId ? { profileId } : {}) }); if (!result.persistedOpportunityIds.length) throw new Error(copy.importFailed); return result.persistedOpportunityIds[0]; }
    const result = await api.post<{ opportunity: OpportunityRecord }>("/opportunities/manual", { type: kind, title: title.trim(), companyOrClient: company.trim(), description, skills: skills.split(",").map(value => value.trim()).filter(Boolean), money: { originalText: money }, ...(kind === "tender" ? { requiredApplicationSections: requiredSections } : {}), ...(url ? { url } : {}) }); return result.opportunity.id;
  }, onSuccess: id => { toast.success(copy.createdToast); onCreated(id); }, onError: error => toast.error(error.message) });
  function submit(event: FormEvent) { event.preventDefault(); if (mode !== "file") mutation.mutate(); }
  return <form onSubmit={submit} className="space-y-4"><div className="flex gap-2"><Button type="button" variant={mode === "manual" ? "secondary" : "ghost"} onClick={() => setMode("manual")}>{copy.manual}</Button><Button type="button" variant={mode === "url" ? "secondary" : "ghost"} onClick={() => setMode("url")}>{copy.urlImport}</Button><Button type="button" variant={mode === "file" ? "secondary" : "ghost"} onClick={() => setMode("file")}>{copy.fileImport}</Button></div>{mode === "file" ? <ImportFilePanel type={type} profileId={profileId} onImported={onCreated} /> : <><label className="block text-sm">{copy.type}<select className={`${selectClass} mt-1 w-full`} value={kind} onChange={event => setKind(event.target.value as OpportunityType)}>{Object.entries(inventoryTypeLabels[locale]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{mode === "manual" && <><label className="block text-sm">{copy.title}<Input required value={title} onChange={event => setTitle(event.target.value)} maxLength={300} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm">{copy.company}<Input value={company} onChange={event => setCompany(event.target.value)} /></label><label className="block text-sm">{copy.pay}<Input value={money} onChange={event => setMoney(event.target.value)} placeholder={copy.payPlaceholder} /></label></div><label className="block text-sm">{copy.description}<Textarea className="min-h-40" value={description} onChange={event => setDescription(event.target.value)} /></label><label className="block text-sm">{copy.skills}<Input value={skills} onChange={event => setSkills(event.target.value)} /></label>{kind === "tender" && <fieldset className="rounded-lg border p-4"><legend className="px-1 text-sm font-medium">{locale === "ru" ? "Обязательные разделы заявки" : "Required application sections"}</legend><p className="mb-3 text-xs text-muted-foreground">{locale === "ru" ? "Отметьте только разделы, которые требует этот тендер. Остальные не будут обязательными." : "Select only the sections required by this tender. Other sections will remain optional."}</p><div className="grid gap-3 sm:grid-cols-2">{TENDER_APPLICATION_SECTION_TYPES.map(section => <label key={section} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5" checked={requiredSections.includes(section)} onChange={event => setRequiredSections(current => event.target.checked ? [...current, section] : current.filter(value => value !== section))} /><span>{tenderApplicationSectionLabels(locale)[section]}</span></label>)}</div></fieldset>}</>}<label className="block text-sm">{copy.sourceLink}{mode === "manual" ? copy.optional : ""}<Input type="url" required={mode === "url"} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" /></label><Button type="submit" loading={mutation.isPending}>{copy.addToCorpus}</Button>{mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}</>}</form>;
}
