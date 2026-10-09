import { describe, expect, it } from "vitest";
import type { NotificationItem, NotificationListResponse } from "@/types";
import { filterNotifications, mergeNotificationPages, notificationCounts, notificationFile, notificationHref, notificationIsArchived, notificationIsRead, notificationKind, notificationMatchesFilter, notificationTitle, updateNotificationPages } from "./notification-center";

const base = {
  body: "Body",
  createdAt: "2026-10-03T10:00:00.000Z",
  title: "Authored source title"
} satisfies Pick<NotificationItem, "body" | "createdAt" | "title">;

function item(input: Partial<NotificationItem> & Pick<NotificationItem, "id">): NotificationItem {
  return { ...base, ...input };
}

function page(items: NotificationItem[], nextCursor: string | null = null): NotificationListResponse {
  return {
    items,
    nextCursor,
    total: items.length,
    counts: { all: items.length, unread: items.filter((record) => !record.readAt).length, system: 0, opportunities: 0, tasks: 0, archived: 0 }
  };
}

describe("NotificationsScreen helpers", () => {
  const items = [
    item({ id: "system", category: "System", readAt: "2026-10-03T10:02:00.000Z" }),
    item({ id: "export", type: "opportunity_export.completed", data: { opportunityId: "opp 1", fileId: "file-1", filename: "real.csv" } }),
    item({ id: "task", type: "task.reminder", data: { taskId: "task-1" } }),
    item({ id: "archived-task", type: "task.reminder", archivedAt: "2026-10-03T10:03:00.000Z" })
  ];

  it("classifies backend authored notification records into center filters", () => {
    expect(notificationKind(items[0])).toBe("system");
    expect(notificationKind(items[1])).toBe("opportunity");
    expect(notificationKind(items[2])).toBe("task");
    expect(notificationIsRead(items[0])).toBe(true);
    expect(notificationIsRead(items[1])).toBe(false);
    expect(notificationIsArchived(items[3])).toBe(true);
  });

  it("filters active activity separately from the recoverable archive", () => {
    expect(filterNotifications(items, "all").map((record) => record.id)).toEqual(["system", "export", "task"]);
    expect(filterNotifications(items, "unread").map((record) => record.id)).toEqual(["export", "task"]);
    expect(filterNotifications(items, "system").map((record) => record.id)).toEqual(["system"]);
    expect(filterNotifications(items, "opportunities").map((record) => record.id)).toEqual(["export"]);
    expect(filterNotifications(items, "tasks").map((record) => record.id)).toEqual(["task"]);
    expect(filterNotifications(items, "archived").map((record) => record.id)).toEqual(["archived-task"]);
  });

  it("builds deeplinks and file actions without replacing source titles", () => {
    expect(notificationHref(items[1])).toBe("/opportunities/opp%201");
    expect(notificationHref(items[2])).toBe("/tasks?taskId=task-1");
    expect(notificationFile(items[1])).toEqual({ fileId: "file-1", filename: "real.csv" });
    expect(items[1].title).toBe("Authored source title");
  });


  it("localizes only the standard watchlist hit title for the active locale", () => {
    const standard = item({ id: "watchlist", type: "watchlist.hit", title: "New watchlist hit", body: "Senior React Engineer" });
    const standardRu = item({ id: "watchlist-ru", type: "watchlist.hit", title: "Новая возможность по правилу", body: "Senior React Engineer" });

    expect(notificationTitle(standard, "ru")).toBe("Новая возможность по правилу");
    expect(notificationTitle(standard, "en")).toBe("New watchlist hit");
    expect(notificationTitle(standardRu, "ru")).toBe("Новая возможность по правилу");
    expect(notificationTitle(standardRu, "en")).toBe("New watchlist hit");
    expect(standard.body).toBe("Senior React Engineer");
  });

  it("preserves custom notification titles and unknown types", () => {
    expect(notificationTitle(item({ id: "custom-watchlist", type: "watchlist.hit", title: "VIP rule matched", body: "Custom body" }), "ru")).toBe("VIP rule matched");
    expect(notificationTitle(item({ id: "custom-type", type: "system.notice", title: "New watchlist hit", body: "Custom body" }), "ru")).toBe("New watchlist hit");
  });

  it("derives tab counts from the same filter semantics", () => {
    expect(notificationCounts(items)).toEqual({ all: 3, unread: 2, system: 1, opportunities: 1, tasks: 1, archived: 1 });
  });

  it("keeps paginated history stable when backend pages overlap", () => {
    const largeFirstPage = Array.from({ length: 50 }, (_, index) => item({ id: `n-${index}`, type: "system.notice" }));
    const secondPage = [largeFirstPage[49], item({ id: "n-50", type: "watchlist.hit" })];

    expect(mergeNotificationPages([page(largeFirstPage, "cursor-2"), page(secondPage)]).map((record) => record.id).slice(-2)).toEqual(["n-49", "n-50"]);
    expect(mergeNotificationPages([page(largeFirstPage, "cursor-2"), page(secondPage)])).toHaveLength(51);
  });

  it("removes optimistic records from filters they no longer belong to", () => {
    const unread = item({ id: "unread", type: "watchlist.hit" });
    const data = { pages: [page([unread])], pageParams: [null] };
    const readAt = "2026-10-03T10:05:00.000Z";
    const next = updateNotificationPages(data, (record) => {
      const patched = record.id === unread.id ? { ...record, readAt } : record;
      return notificationMatchesFilter(patched, "unread") ? patched : null;
    });

    expect(next?.pages[0].items).toEqual([]);
  });
});
