import type { InfiniteData } from "@tanstack/react-query";
import type { NotificationCounts, NotificationFilter, NotificationItem, NotificationListResponse } from "@/types";

export type NotificationKind = "system" | "opportunity" | "task" | "workflow";

export const notificationFilters: NotificationFilter[] = ["all", "unread", "system", "opportunities", "tasks", "archived"];
export const emptyNotificationCounts: NotificationCounts = { all: 0, unread: 0, system: 0, opportunities: 0, tasks: 0, archived: 0 };

export function notificationIsRead(item: NotificationItem): boolean {
  return Boolean(item.read ?? item.readAt);
}

export function notificationIsArchived(item: NotificationItem): boolean {
  return Boolean(item.archived ?? item.archivedAt);
}

export function notificationKind(item: NotificationItem): NotificationKind {
  const category = (item.category ?? "").toLowerCase();
  const type = (item.type ?? "").toLowerCase();

  if (category.includes("opportunity") || type.startsWith("opportunity") || type.startsWith("watchlist") || type.startsWith("response")) return "opportunity";
  if (category.includes("workflow") || type.startsWith("task") || type.startsWith("calendar") || type.includes("reminder")) return "task";
  if (category.includes("system") || category.includes("admin") || type.startsWith("system") || type.startsWith("admin")) return "system";
  return "workflow";
}

export function notificationHref(item: NotificationItem): string | undefined {
  if (item.href) return item.href;

  const opportunityId = item.data?.opportunityId;
  const taskId = item.data?.taskId;
  const resumeAdaptationId = item.data?.resumeAdaptationId;

  if (opportunityId) return `/opportunities/${encodeURIComponent(opportunityId)}`;
  if (taskId) return `/tasks?taskId=${encodeURIComponent(taskId)}`;
  if (resumeAdaptationId) return "/resumes";
  if (notificationKind(item) === "task") return "/tasks";
  return undefined;
}

export function notificationFile(item: NotificationItem): { fileId: string; filename: string } | undefined {
  const fileId = item.data?.fileId;
  if (!fileId) return undefined;
  return {
    fileId,
    filename: item.data?.filename?.trim() || "notification-export.csv"
  };
}

const standardWatchlistHitTitles = new Set(["New watchlist hit", "Новая возможность по правилу"]);

export function notificationTitle(item: NotificationItem, locale: "ru" | "en"): string {
  if (item.type === "watchlist.hit" && standardWatchlistHitTitles.has(item.title)) {
    return locale === "ru" ? "Новая возможность по правилу" : "New watchlist hit";
  }
  return item.title;
}

export function filterNotifications(items: NotificationItem[], filter: NotificationFilter): NotificationItem[] {
  return items.filter((item) => {
    const archived = notificationIsArchived(item);
    if (filter === "archived") return archived;
    if (archived) return false;
    if (filter === "all") return true;
    if (filter === "unread") return !notificationIsRead(item);
    const kind = notificationKind(item);
    if (filter === "system") return kind === "system";
    if (filter === "opportunities") return kind === "opportunity";
    return kind === "task";
  });
}

export function notificationMatchesFilter(item: NotificationItem, filter: NotificationFilter): boolean {
  return filterNotifications([item], filter).length === 1;
}

export function notificationCounts(items: NotificationItem[]): Record<NotificationFilter, number> {
  return notificationFilters.reduce<Record<NotificationFilter, number>>((counts, filter) => {
    counts[filter] = filterNotifications(items, filter).length;
    return counts;
  }, { ...emptyNotificationCounts });
}

export function mergeNotificationPages(pages: NotificationListResponse[] = []): NotificationItem[] {
  const seen = new Set<string>();
  const result: NotificationItem[] = [];

  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
    }
  }

  return result;
}

export function updateNotificationPages(
  data: InfiniteData<NotificationListResponse> | undefined,
  update: (item: NotificationItem) => NotificationItem | null
): InfiniteData<NotificationListResponse> | undefined {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => {
      const items = page.items.flatMap((item) => {
        const next = update(item);
        return next ? [next] : [];
      });
      return { ...page, items };
    })
  };
}
