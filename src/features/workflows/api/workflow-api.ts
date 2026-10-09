import { api } from "@/services/api";
import type {
  ApiList,
  CalendarEvent,
  NotificationFilter,
  NotificationListResponse,
  NotificationItem,
  PipelineBoard,
  PipelineStage,
  PipelineType,
  PipelineFilters,
  SavedView,
  TaskBoard,
  TaskItem,
  Watchlist,
  WatchlistHit
} from "@/types";
import { normalizeUnifiedSearchResponse, type UnifiedSearchTransportResponse } from "./search-adapter";

export type CreateTaskPayload = Pick<TaskItem, "boardId" | "title" | "statusColumnId"> & Partial<TaskItem>;
export type NotificationListInput = { unreadOnly?: boolean; filter?: NotificationFilter; archived?: boolean; cursor?: string | null; limit?: number };

function asApiList<T>(value: ApiList<T> | T[]): ApiList<T> {
  return Array.isArray(value) ? { items: value, nextCursor: null } : value;
}

export type CalendarEventPayload = {
  type: string;
  startAt: string;
  endAt?: string;
  title: string;
  opportunityId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
  reminders?: Array<Record<string, unknown>>;
};

export const workflowApi = {
  watchlists: {
    list: () => api.get<ApiList<Watchlist> | Watchlist[]>("/watchlists").then(asApiList),
    create: (body: Partial<Watchlist>) => api.post<Watchlist>("/watchlists", body),
    update: (id: string, body: Partial<Watchlist>) => api.patch<Watchlist>(`/watchlists/${id}`, body),
    remove: (id: string) => api.delete<{ success: true }>(`/watchlists/${id}`),
    pause: (id: string) => api.post<Watchlist>(`/watchlists/${id}/pause`),
    resume: (id: string) => api.post<Watchlist>(`/watchlists/${id}/resume`),
    duplicate: (id: string) => api.post<Watchlist>(`/watchlists/${id}/duplicate`),
    hits: (id: string) => api.get<ApiList<WatchlistHit> & { watchlist: Watchlist }>(`/watchlists/${id}/hits`)
  },
  savedViews: {
    list: () => api.get<ApiList<SavedView> | SavedView[]>("/saved-views").then(asApiList),
    create: (body: Partial<SavedView>) => api.post<SavedView>("/saved-views", body),
    update: (id: string, body: Partial<SavedView>) => api.patch<SavedView>(`/saved-views/${id}`, body),
    remove: (id: string) => api.delete<{ success: true }>(`/saved-views/${id}`),
    setDefault: (id: string) => api.post<SavedView>(`/saved-views/${id}/set-default`),
    pin: (id: string) => api.post<SavedView>(`/saved-views/${id}/pin`),
    duplicate: (id: string) => api.post<SavedView>(`/saved-views/${id}/duplicate`)
  },
  search: {
    run: (query: string, scope: string = "all") =>
      api.post<UnifiedSearchTransportResponse>("/search", { query, scope, mode: "hybrid", limit: 20 }).then(normalizeUnifiedSearchResponse),
    recent: () => api.get<ApiList<{ id: string; query: string; scope?: string; createdAt: string }>>("/search/recent"),
    clearRecent: () => api.delete<{ success: true }>("/search/recent")
  },
  pipelines: {
    board: (type: PipelineType, profileId?: string | null, filters?: PipelineFilters) => {
      const params = new URLSearchParams({ type });
      if (profileId) params.set("profileId", profileId);
      if (filters?.sourceIds?.length) params.set("sourceIds", filters.sourceIds.join(","));
      if (typeof filters?.minMatch === "number") params.set("minMatch", String(filters.minMatch));
      if (typeof filters?.minAiScore === "number") params.set("minAiScore", String(filters.minAiScore));
      if (filters?.tags?.length) params.set("tags", filters.tags.join(","));
      if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters?.dateTo) params.set("dateTo", filters.dateTo);
      if (filters?.attention && filters.attention !== "all") params.set("attention", filters.attention);
      if (filters?.counterpart) params.set("counterpart", filters.counterpart);
      if (filters?.sort) params.set("sort", filters.sort);
      return api.get<PipelineBoard>(`/pipelines?${params.toString()}`);
    },
    move: (opportunityId: string, profileId: string, pipelineStatus: PipelineStage) =>
      api.patch<{ state: Record<string, unknown>; opportunity: Record<string, unknown> }>(`/pipelines/${opportunityId}`, { profileId, pipelineStatus }),
    attention: () => api.get<ApiList<Record<string, unknown>>>("/pipelines/attention")
  },
  tasks: {
    boards: () => api.get<TaskBoard[]>("/boards"),
    createBoard: (body: Partial<TaskBoard>) => api.post<TaskBoard>("/boards", body),
    board: (id: string) => api.get<TaskBoard>(`/boards/${id}`),
    updateBoard: (id: string, body: Partial<TaskBoard>) => api.patch<TaskBoard>(`/boards/${id}`, body),
    list: (query?: string | { boardId?: string; opportunityId?: string; type?: TaskItem["type"] }) => {
      const params = new URLSearchParams();
      if (typeof query === "string") params.set("boardId", query);
      if (query && typeof query === "object") {
        for (const [key, value] of Object.entries(query)) if (value) params.set(key, String(value));
      }
      const suffix = params.toString();
      return api.get<ApiList<TaskItem>>(`/tasks${suffix ? `?${suffix}` : ""}`);
    },
    get: (id: string) => api.get<TaskItem>(`/tasks/${id}`),
    create: (body: CreateTaskPayload) => api.post<TaskItem>("/tasks", body),
    update: (id: string, body: Partial<TaskItem>) => api.patch<TaskItem>(`/tasks/${id}`, body),
    remove: (id: string) => api.delete<{ success: true }>(`/tasks/${id}`),
    comment: (id: string, body: { body: string }) => api.post(`/tasks/${id}/comments`, body),
    reminder: (id: string, body: { remindAt: string; channels: string[] }) => api.post(`/tasks/${id}/reminders`, body)
  },
  calendar: {
    events: (start: string, end: string) =>
      api.get<ApiList<CalendarEvent>>(`/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
    create: (body: CalendarEventPayload) => api.post<CalendarEvent>("/calendar/events", body),
    update: (id: string, body: Partial<CalendarEventPayload>) => api.patch<CalendarEvent>(`/calendar/events/${id}`, body),
    remove: (id: string) => api.delete<{ success: true }>(`/calendar/events/${id}`)
  },
  analytics: {
    personal: () => api.get<Record<string, unknown>>("/analytics/personal"),
    market: () => api.get<Record<string, unknown>>("/analytics/market")
  },
  notifications: {
    list: (query?: NotificationListInput) => {
      const params = new URLSearchParams();
      if (query?.unreadOnly) params.set("unreadOnly", "true");
      if (query?.filter) params.set("filter", query.filter);
      if (query?.archived) params.set("archived", "true");
      if (query?.cursor) params.set("cursor", query.cursor);
      if (query?.limit) params.set("limit", String(query.limit));
      const suffix = params.toString();
      return api.get<NotificationListResponse>(`/notifications${suffix ? `?${suffix}` : ""}`);
    },
    markRead: (id: string) => api.patch<NotificationItem>(`/notifications/${id}/read`, {}),
    markAllRead: () => api.post<{ modifiedCount?: number }>("/notifications/mark-all-read"),
    setArchived: (id: string, archived: boolean) => api.patch<NotificationItem>(`/notifications/${id}/archive`, { archived })
  }
};
