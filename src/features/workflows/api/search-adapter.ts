import type { ApiList, SearchResult } from "@/types";

type BackendSearchItem = {
  id: string;
  entityType: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  score?: number;
  url: string;
  payload?: Record<string, unknown>;
};

type BackendSearchGroup = {
  items?: BackendSearchItem[];
  nextCursor?: string | null;
};

type BackendUnifiedSearchResponse = {
  query?: string;
  mode?: string;
  indexAvailable?: boolean;
  groups?: Record<string, BackendSearchGroup | undefined>;
};

export type UnifiedSearchTransportResponse = ApiList<SearchResult> | SearchResult[] | BackendUnifiedSearchResponse;

function isFlatSearchList(value: UnifiedSearchTransportResponse): value is ApiList<SearchResult> | SearchResult[] {
  return Array.isArray(value) || "items" in value;
}

function asFlatList(value: ApiList<SearchResult> | SearchResult[]): ApiList<SearchResult> {
  return Array.isArray(value) ? { items: value, nextCursor: null } : value;
}

function fromBackendItem(item: BackendSearchItem): SearchResult {
  return {
    id: item.id,
    type: item.entityType,
    title: item.title,
    subtitle: item.subtitle,
    href: item.url,
    score: item.score,
    excerpt: item.excerpt,
    preview: item.payload
  };
}

export function normalizeUnifiedSearchResponse(value: UnifiedSearchTransportResponse): ApiList<SearchResult> {
  if (isFlatSearchList(value)) return asFlatList(value);

  const groups = Object.values(value.groups ?? {});
  return {
    items: groups.flatMap((group) => (group?.items ?? []).map(fromBackendItem)),
    nextCursor: groups.find((group) => group?.nextCursor)?.nextCursor ?? null
  };
}
