"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Copy, Pencil, Pin, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { SavedView } from "@/types";
import { filterLabels, filterValueLabel, savedViewUrl } from "@/features/opportunities";
import { useAuth } from "@/features/auth";
import { getPublicSources } from "@/features/profiles";
import { workflowApi } from "../api/workflow-api";
import { QueryState, ScreenScaffold, workflowPanelClass } from "./ScreenScaffold";
import { resolveWorkflowLocale } from "./workflow-labels";

export function SavedViewsScreen() {
  const queryClient = useQueryClient();
  const { user, bootstrapped } = useAuth();
  const locale = resolveWorkflowLocale(user?.settings.locale);
  const [editing, setEditing] = useState<SavedView | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<SavedView | null>(null);
  const query = useQuery({
    queryKey: ["saved-views"],
    queryFn: workflowApi.savedViews.list,
    enabled: bootstrapped && !!user
  });
  const sources = useQuery({
    queryKey: ["sources", "public"],
    queryFn: getPublicSources,
    enabled: !!user
  });
  const sourceNames = Object.fromEntries(
    (sources.data ?? []).map((source) => [source.id, source.name])
  );
  const action = useMutation({
    mutationFn: async ({
      kind,
      view
    }: {
      kind: "rename" | "duplicate" | "pin" | "default" | "delete";
      view: SavedView;
    }) => {
      if (kind === "rename") return workflowApi.savedViews.update(view.id, { name: name.trim() });
      if (kind === "duplicate") return workflowApi.savedViews.duplicate(view.id);
      if (kind === "pin") return workflowApi.savedViews.pin(view.id);
      if (kind === "default") return workflowApi.savedViews.setDefault(view.id);
      return workflowApi.savedViews.remove(view.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views"] });
      setEditing(null);
      setDeleting(null);
      toast.success(locale === "en" ? "Saved search updated" : "Сохранённый поиск обновлён");
    },
    onError: (error) => toast.error(error.message)
  });
  const items = [...(query.data?.items ?? [])].sort(
    (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || a.name.localeCompare(b.name)
  );
  const scopeLabels: Record<string, string> =
    locale === "en"
      ? {
          opportunities: "All opportunities",
          vacancies: "Vacancies",
          freelance: "Projects",
          tenders: "Tenders"
        }
      : {
          opportunities: "Все возможности",
          vacancies: "Вакансии",
          freelance: "Проекты",
          tenders: "Тендеры"
        };
  const modeLabels: Record<string, string> =
    locale === "en"
      ? { list: "List", table: "Table", cards: "Cards" }
      : { list: "Список", table: "Таблица", cards: "Карточки" };
  return (
    <ScreenScaffold
      title={locale === "en" ? "Saved searches" : "Сохранённые поиски"}
      description={
        locale === "en"
          ? "Reusable opportunity filters for recurring sourcing work."
          : "Повторяющиеся поиски по возможностям: фильтры, сортировка и вид списка под рукой."
      }
      action={
        <Button asChild>
          <Link href="/opportunities">
            <Plus className="size-4" />
            {locale === "en" ? "Create from feed" : "Создать из ленты"}
          </Link>
        </Button>
      }
    >
      <QueryState
        isLoading={query.isLoading || !bootstrapped}
        isError={query.isError}
        isEmpty={!items.length}
        emptyTitle={locale === "en" ? "No saved searches yet" : "Сохранённых поисков пока нет"}
        emptyDescription={
          locale === "en"
            ? "Open Opportunities, tune filters, then save the search. It will appear here for quick return."
            : "Откройте «Возможности», настройте фильтры и сохраните поиск. Он появится здесь для быстрого возврата."
        }
        onRetry={() => query.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((view) => {
            const values = { ...view.query, ...view.filters };
            const filters = Object.entries(values).filter(
              ([key, value]) =>
                filterLabels[key] && value !== undefined && value !== null && value !== ""
            );
            return (
              <article key={view.id} className={`${workflowPanelClass} flex flex-col`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words font-semibold">{view.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {scopeLabels[view.scope] ??
                        (locale === "en" ? "Opportunities" : "Возможности")}{" "}
                      · {modeLabels[view.mode ?? "list"] ?? (locale === "en" ? "List" : "Список")}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {view.isDefault && (
                      <Badge intent="primary">{locale === "en" ? "Default" : "Основное"}</Badge>
                    )}
                    {view.pinned && (
                      <Badge intent="success">
                        <Pin className="mr-1 size-3" />
                        {locale === "en" ? "Pinned" : "Закреплено"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="my-4 flex min-h-16 flex-wrap content-start gap-1.5">
                  {values.query ? (
                    <Badge>
                      {locale === "en" ? "Query" : "Запрос"}: {String(values.query)}
                    </Badge>
                  ) : null}
                  {filters.length
                    ? filters.slice(0, 6).map(([key, value]) => (
                        <Badge key={key}>
                          {filterLabels[key]}:{" "}
                          {filterValueLabel(
                            key,
                            Array.isArray(value) ? value.join(",") : String(value),
                            sourceNames
                          )}
                        </Badge>
                      ))
                    : !values.query && (
                        <p className="text-sm text-muted-foreground">
                          {locale === "en"
                            ? "All opportunities without extra filters"
                            : "Все возможности без дополнительных фильтров"}
                        </p>
                      )}
                  {filters.length > 6 && (
                    <Badge>
                      {locale === "en" ? "More" : "Ещё"} {filters.length - 6}
                    </Badge>
                  )}
                </div>
                <Button className="mt-auto w-full" variant="secondary" asChild>
                  <Link href={savedViewUrl(view)}>
                    {locale === "en" ? "Open search" : "Открыть поиск"}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
                <div className="mt-3 flex flex-wrap gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`${locale === "en" ? "Rename" : "Переименовать"} ${view.name}`}
                    disabled={action.isPending}
                    onClick={() => {
                      setName(view.name);
                      setEditing(view);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`${locale === "en" ? "Duplicate" : "Дублировать"} ${view.name}`}
                    disabled={action.isPending}
                    onClick={() => action.mutate({ kind: "duplicate", view })}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={view.pinned ? "secondary" : "ghost"}
                    aria-label={`${view.pinned ? (locale === "en" ? "Unpin" : "Открепить") : locale === "en" ? "Pin" : "Закрепить"} ${view.name}`}
                    disabled={action.isPending}
                    onClick={() => action.mutate({ kind: "pin", view })}
                  >
                    <Pin className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={view.isDefault ? "secondary" : "ghost"}
                    aria-label={`${locale === "en" ? "Make default" : "Сделать основным"} ${view.name}`}
                    disabled={view.isDefault || action.isPending}
                    onClick={() => action.mutate({ kind: "default", view })}
                  >
                    <Star className="size-4" />
                  </Button>
                  <Button
                    className="ml-auto"
                    size="icon"
                    variant="ghost"
                    aria-label={`${locale === "en" ? "Delete" : "Удалить"} ${view.name}`}
                    disabled={action.isPending}
                    onClick={() => setDeleting(view)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </QueryState>
      <Modal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={locale === "en" ? "Search name" : "Название поиска"}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (editing) action.mutate({ kind: "rename", view: editing });
          }}
        >
          <label className="block text-sm">
            {locale === "en" ? "Name" : "Название"}
            <Input
              autoFocus
              required
              maxLength={160}
              className="mt-1"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <Button type="submit" disabled={!name.trim()} loading={action.isPending}>
            {locale === "en" ? "Save" : "Сохранить"}
          </Button>
        </form>
      </Modal>
      <Modal
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={locale === "en" ? "Delete saved search?" : "Удалить сохранённый поиск?"}
        description={
          locale === "en"
            ? `“${deleting?.name ?? ""}” will disappear from saved searches. Opportunities stay unchanged.`
            : `«${deleting?.name ?? ""}» исчезнет из сохранённых поисков. Сами возможности сохранятся.`
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            {locale === "en" ? "Cancel" : "Отмена"}
          </Button>
          <Button
            variant="danger"
            loading={action.isPending}
            onClick={() => deleting && action.mutate({ kind: "delete", view: deleting })}
          >
            {locale === "en" ? "Delete search" : "Удалить поиск"}
          </Button>
        </div>
      </Modal>
    </ScreenScaffold>
  );
}
