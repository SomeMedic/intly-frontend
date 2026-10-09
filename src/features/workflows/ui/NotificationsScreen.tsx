"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCheck, Download, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";
import type { NotificationFilter, NotificationItem, NotificationListResponse } from "@/types";
import { downloadStoredFile } from "@/services/files/download-file";
import { formatRelativeTime } from "@/lib/utils";
import { workflowApi } from "../api/workflow-api";
import { QueryState, ScreenScaffold } from "./ScreenScaffold";
import {
  emptyNotificationCounts,
  mergeNotificationPages,
  notificationFile,
  notificationFilters,
  notificationHref,
  notificationIsArchived,
  notificationIsRead,
  notificationKind,
  notificationTitle,
  notificationMatchesFilter,
  updateNotificationPages
} from "./notification-center";
import { notificationFilterLabels, notificationKindLabels, resolveWorkflowLocale, type WorkflowLocale } from "./workflow-labels";

const notificationPageLimit = 50;
const dashboardSummaryPrefix = ["dashboard", "summary"] as const;

function notificationQueryKey(userId: string | undefined, filter: NotificationFilter) {
  return ["notifications", userId ?? "anonymous", filter] as const;
}

const copy = {
  ru: {
    title: "Уведомления",
    description: "Рабочие события, выгрузки, задачи и системные статусы.",
    emptyTitle: "Уведомлений нет",
    emptyDescription: "Здесь появятся новые события по возможностям, задачам и системе.",
    filteredEmptyTitle: "В этом фильтре пусто",
    filteredEmptyDescription: "Попробуйте другой фильтр или вернитесь позже.",
    markAllRead: "Прочитать все",
    unread: "Новое",
    archived: "В архиве",
    markRead: "Прочитать",
    archive: "Архивировать",
    restore: "Восстановить",
    open: "Открыть",
    download: "Скачать файл",
    loadMore: "Загрузить ещё",
    loadMoreError: "Следующая страница не загрузилась.",
    shown: (shown: number, total: number) => `Показано ${shown} из ${total}`,
    noBody: "Без описания",
    archivedToast: "Уведомление в архиве",
    restoredToast: "Уведомление восстановлено"
  },
  en: {
    title: "Notifications",
    description: "Work events, exports, tasks, and system status.",
    emptyTitle: "No notifications",
    emptyDescription: "New opportunity, task, and system events will appear here.",
    filteredEmptyTitle: "Nothing in this filter",
    filteredEmptyDescription: "Try another filter or check back later.",
    markAllRead: "Mark all read",
    unread: "Unread",
    archived: "Archived",
    markRead: "Mark read",
    archive: "Archive",
    restore: "Restore",
    open: "Open",
    download: "Download file",
    loadMore: "Load more",
    loadMoreError: "The next page did not load.",
    shown: (shown: number, total: number) => `Showing ${shown} of ${total}`,
    noBody: "No description",
    archivedToast: "Notification archived",
    restoredToast: "Notification restored"
  }
} as const;

function ownerNotificationPrefix(ownerId: string) {
  return ["notifications", ownerId] as const;
}

export function NotificationsScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const ownerId = user?.id ?? "anonymous";
  const currentOwnerPrefix = useMemo(() => ownerNotificationPrefix(ownerId), [ownerId]);
  const locale = resolveWorkflowLocale(user?.settings.locale);
  const text = copy[locale];
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const query = useInfiniteQuery({
    queryKey: notificationQueryKey(user?.id, filter),
    queryFn: ({ pageParam }) => workflowApi.notifications.list({ filter, cursor: typeof pageParam === "string" ? pageParam : null, limit: notificationPageLimit }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(user),
    refetchInterval: 15_000
  });
  const items = useMemo(() => mergeNotificationPages(query.data?.pages), [query.data?.pages]);
  const firstPage = query.data?.pages[0];
  const counts = firstPage?.counts ?? emptyNotificationCounts;
  const total = firstPage?.total ?? items.length;
  const ownerHistoryTotal = counts.all + counts.archived;

  const updateNotification = (actionOwnerId: string, id: string, patch: Partial<NotificationItem>) => {
    for (const cache of queryClient.getQueryCache().findAll({ queryKey: ownerNotificationPrefix(actionOwnerId) })) {
      const cacheFilter = notificationFilters.find((value) => value === cache.queryKey[2]);
      queryClient.setQueryData(cache.queryKey, (current: unknown) => {
        return updateNotificationPages(current as undefined | { pages: NotificationListResponse[]; pageParams: unknown[] }, (item) => {
          if (item.id !== id) return item;
          const next = { ...item, ...patch };
          return cacheFilter && !notificationMatchesFilter(next, cacheFilter) ? null : next;
        });
      });
    }
  };
  const invalidateNotificationHistory = (actionOwnerId: string) => {
    void queryClient.invalidateQueries({ queryKey: ownerNotificationPrefix(actionOwnerId) });
    void queryClient.invalidateQueries({ queryKey: dashboardSummaryPrefix });
  };

  const markRead = useMutation({
    mutationFn: ({ id }: { id: string; ownerId: string }) => workflowApi.notifications.markRead(id),
    onMutate: async ({ id, ownerId: actionOwnerId }) => {
      await queryClient.cancelQueries({ queryKey: ownerNotificationPrefix(actionOwnerId) });
      updateNotification(actionOwnerId, id, { read: true, readAt: new Date().toISOString() });
    },
    onSuccess: (item, variables) => {
      updateNotification(variables.ownerId, item.id, item);
      invalidateNotificationHistory(variables.ownerId);
    },
    onError: (error) => {
      toast.error(error.message);
      void queryClient.invalidateQueries({ queryKey: currentOwnerPrefix });
    }
  });
  const markAll = useMutation({
    mutationFn: (variables: { ownerId: string }) => {
      void variables;
      return workflowApi.notifications.markAllRead();
    },
    onMutate: async ({ ownerId: actionOwnerId }) => {
      await queryClient.cancelQueries({ queryKey: ownerNotificationPrefix(actionOwnerId) });
      const readAt = new Date().toISOString();
      for (const cache of queryClient.getQueryCache().findAll({ queryKey: ownerNotificationPrefix(actionOwnerId) })) {
        const cacheFilter = notificationFilters.find((value) => value === cache.queryKey[2]);
        queryClient.setQueryData(cache.queryKey, (current: unknown) => {
          return updateNotificationPages(current as undefined | { pages: NotificationListResponse[]; pageParams: unknown[] }, (item) => {
            if (notificationIsArchived(item)) return item;
            const next = { ...item, read: true, readAt: item.readAt ?? readAt };
            return cacheFilter && !notificationMatchesFilter(next, cacheFilter) ? null : next;
          });
        });
      }
    },
    onSuccess: (_result, variables) => invalidateNotificationHistory(variables.ownerId),
    onError: (error) => {
      toast.error(error.message);
      void queryClient.invalidateQueries({ queryKey: currentOwnerPrefix });
    }
  });
  const archive = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean; ownerId: string }) => workflowApi.notifications.setArchived(id, archived),
    onMutate: async ({ id, archived, ownerId: actionOwnerId }) => {
      await queryClient.cancelQueries({ queryKey: ownerNotificationPrefix(actionOwnerId) });
      updateNotification(actionOwnerId, id, { archived, archivedAt: archived ? new Date().toISOString() : undefined });
    },
    onSuccess: (item, variables) => {
      updateNotification(variables.ownerId, item.id, item);
      invalidateNotificationHistory(variables.ownerId);
      toast.success(variables.archived ? text.archivedToast : text.restoredToast);
    },
    onError: (error) => {
      toast.error(error.message);
      void queryClient.invalidateQueries({ queryKey: currentOwnerPrefix });
    }
  });
  const download = useMutation({
    mutationFn: async ({ fileId, filename }: { fileId: string; filename: string; notificationId: string }) => {
      await downloadStoredFile(fileId, filename);
    },
    onError: (error) => toast.error(error.message)
  });

  return (
    <ScreenScaffold
      title={text.title}
      description={text.description}
      artwork="workflow"
      action={
        <Button variant="outline" onClick={() => markAll.mutate({ ownerId })} loading={markAll.isPending} disabled={!counts.unread}>
          <CheckCheck className="size-4" aria-hidden />
          {text.markAllRead}
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={text.title}>
        {notificationFilters.map((value) => (
          <Button key={value} type="button" variant={filter === value ? "secondary" : "outline"} size="sm" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {notificationFilterLabels[locale][value]}
            <span className="text-xs text-muted-foreground">{counts[value]}</span>
          </Button>
        ))}
      </div>
      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={!items.length}
        emptyTitle={ownerHistoryTotal ? text.filteredEmptyTitle : text.emptyTitle}
        emptyDescription={ownerHistoryTotal ? text.filteredEmptyDescription : text.emptyDescription}
        onRetry={() => { void query.refetch(); }}
      >
        <div className="space-y-2">
          <p role="status" className="text-sm text-muted-foreground">{text.shown(items.length, total)}</p>
          {items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              locale={locale}
              onOpen={() => { if (!notificationIsRead(item)) markRead.mutate({ id: item.id, ownerId }); }}
              onMarkRead={() => markRead.mutate({ id: item.id, ownerId })}
              onArchive={() => archive.mutate({ id: item.id, archived: !notificationIsArchived(item), ownerId })}
              onDownload={(file) => download.mutate({ ...file, notificationId: item.id })}
              isReading={markRead.isPending && markRead.variables?.id === item.id}
              isArchiving={archive.isPending && archive.variables?.id === item.id}
              isDownloading={download.isPending && download.variables?.notificationId === item.id}
            />
          ))}
          {query.isFetchNextPageError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <p>{text.loadMoreError}</p>
            </div>
          ) : null}
          {query.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>
                {text.loadMore}
              </Button>
            </div>
          ) : null}
        </div>
      </QueryState>
    </ScreenScaffold>
  );
}

function NotificationRow({
  item,
  locale,
  onOpen,
  onMarkRead,
  onArchive,
  onDownload,
  isReading,
  isArchiving,
  isDownloading
}: {
  item: NotificationItem;
  locale: WorkflowLocale;
  onOpen: () => void;
  onMarkRead: () => void;
  onArchive: () => void;
  onDownload: (file: { fileId: string; filename: string }) => void;
  isReading?: boolean;
  isArchiving?: boolean;
  isDownloading?: boolean;
}) {
  const text = copy[locale];
  const read = notificationIsRead(item);
  const archived = notificationIsArchived(item);
  const href = notificationHref(item);
  const file = notificationFile(item);
  const kind = notificationKind(item);
  const title = notificationTitle(item, locale);

  return (
    <article className="rounded-lg border bg-card p-[var(--card-padding)] transition hover:border-primary/45 focus-within:border-primary/45">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 w-full sm:flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words font-semibold">{title}</h2>
            {!read ? <Badge intent="primary">{text.unread}</Badge> : null}
            {archived ? <Badge intent="warning">{text.archived}</Badge> : null}
            <Badge>{notificationKindLabels[locale][kind]}</Badge>
          </div>
          <p className="mt-1 break-words text-sm text-muted-foreground">{item.body || text.noBody}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatRelativeTime(item.createdAt, locale)} · {notificationKindLabels[locale][kind]}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {href ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={href} onClick={onOpen}>
                <ExternalLink className="size-4" aria-hidden />
                {text.open}
              </Link>
            </Button>
          ) : null}
          {file ? (
            <Button size="sm" variant="outline" loading={isDownloading} onClick={() => onDownload(file)}>
              <Download className="size-4" aria-hidden />
              {text.download}
            </Button>
          ) : null}
          {!read ? (
            <Button size="sm" variant="outline" loading={isReading} onClick={onMarkRead}>
              <CheckCheck className="size-4" aria-hidden />
              {text.markRead}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" loading={isArchiving} aria-label={archived ? text.restore : text.archive} onClick={onArchive}>
            {archived ? <RotateCcw className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
            {archived ? text.restore : text.archive}
          </Button>
        </div>
      </div>
    </article>
  );
}
