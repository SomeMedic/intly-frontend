export type GlobalSearchScope = "all" | "opportunities" | "tasks" | "profiles" | "watchlists" | "knowledge";
export type GlobalSearchEntity = Exclude<GlobalSearchScope, "all">;
export type GlobalSearchLocale = "ru" | "en";

export type GlobalSearchItem = {
  id: string;
  entityType?: GlobalSearchEntity | string;
  type?: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  score?: number;
  url?: string;
  href?: string;
  payload?: Record<string, unknown>;
};

export type GlobalSearchGroup = {
  items?: GlobalSearchItem[];
  nextCursor?: string | null;
};

export type GlobalSearchResponse = {
  query: string;
  mode?: "keyword" | "semantic" | "hybrid";
  indexAvailable?: boolean;
  groups?: Partial<Record<GlobalSearchEntity, GlobalSearchGroup>>;
  items?: GlobalSearchItem[];
  nextCursor?: string | null;
};

export type FlatSearchItem = GlobalSearchItem & {
  scope: GlobalSearchEntity;
  href: string;
};

export const searchScopes: GlobalSearchEntity[] = ["opportunities", "tasks", "profiles", "watchlists", "knowledge"];

export const scopeLabels: Record<GlobalSearchLocale, Record<GlobalSearchScope, string>> = {
  ru: {
    all: "Все",
    opportunities: "Возможности",
    tasks: "Задачи",
    profiles: "Профили",
    watchlists: "Подборки",
    knowledge: "База знаний"
  },
  en: {
    all: "All",
    opportunities: "Opportunities",
    tasks: "Tasks",
    profiles: "Profiles",
    watchlists: "Watchlists",
    knowledge: "Knowledge"
  }
};

const scopeFromItem = (item: GlobalSearchItem, fallback: GlobalSearchEntity): GlobalSearchEntity => {
  const raw = item.entityType ?? item.type;
  if (raw === "opportunity") return "opportunities";
  if (raw === "task") return "tasks";
  if (raw === "profile") return "profiles";
  if (raw === "watchlist") return "watchlists";
  if (raw === "knowledge") return "knowledge";
  if (searchScopes.includes(raw as GlobalSearchEntity)) return raw as GlobalSearchEntity;
  return fallback;
};

const routeForItem = (item: GlobalSearchItem, scope: GlobalSearchEntity) => {
  if (item.url) return item.url;
  if (item.href) return item.href;
  if (scope === "opportunities") return `/opportunities/${item.id}`;
  if (scope === "tasks") return `/tasks/${item.id}`;
  if (scope === "profiles") return `/profiles/${item.id}`;
  if (scope === "watchlists") return `/watchlists/${item.id}`;
  return `/knowledge/documents/${item.id}`;
};

export function flattenSearchResponse(response: GlobalSearchResponse | null | undefined, activeScope: GlobalSearchScope = "all") {
  const sourceScopes = activeScope === "all" ? searchScopes : [activeScope];
  const byScope: Record<GlobalSearchEntity, FlatSearchItem[]> = {
    opportunities: [],
    tasks: [],
    profiles: [],
    watchlists: [],
    knowledge: []
  };

  for (const scope of sourceScopes) {
    const groupedItems = response?.groups?.[scope]?.items ?? [];
    for (const item of groupedItems) {
      const resolvedScope = scopeFromItem(item, scope);
      byScope[resolvedScope].push({ ...item, scope: resolvedScope, href: routeForItem(item, resolvedScope) });
    }
  }

  for (const item of response?.items ?? []) {
    const resolvedScope = scopeFromItem(item, activeScope === "all" ? "opportunities" : activeScope);
    byScope[resolvedScope].push({ ...item, scope: resolvedScope, href: routeForItem(item, resolvedScope) });
  }

  const visibleScopes = activeScope === "all" ? searchScopes : [activeScope];
  const flat = visibleScopes.flatMap((scope) => byScope[scope]);
  return { byScope, flat };
}

export function nextSelectedIndex(current: number, count: number, direction: 1 | -1) {
  if (count <= 0) return -1;
  if (current < 0) return direction === 1 ? 0 : count - 1;
  return (current + direction + count) % count;
}

export function scopeForCategory(category: string): GlobalSearchScope {
  if (category === "vacancies" || category === "freelance" || category === "tenders") return "opportunities";
  if (category === "tasks") return "tasks";
  if (category === "profiles") return "profiles";
  if (category === "watchlists") return "watchlists";
  return "all";
}
