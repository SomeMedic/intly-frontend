"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Columns3, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MatchScore } from "@/components/intly/match-score";
import type { PublicSource } from "@/features/profiles";
import { formatRelativeTime } from "@/lib/utils";
import { formatOpportunityFieldDate } from "./opportunity-workspace-labels";
import {
  moneyLabel,
  opportunityPlaceLabel,
  resolveOpportunityTableLocale,
  stageLabelsByLocale,
  tableColumns,
  tableColumnsByLocale,
  toMini,
  type OpportunityRecord
} from "./contracts";

type Column = keyof typeof tableColumns;

const tableCopy = {
  ru: {
    widthHint: "Настройте ширину столбцов прямо в заголовке.",
    columnsButton: "Столбцы",
    tableAria: "Возможности",
    selectColumn: "Выбор",
    titleColumn: "Возможность",
    favoriteColumn: "Избранное",
    columnWidth: (label: string) => `Ширина столбца ${label}`,
    selectRow: (title: string) => `Выбрать ${title}`,
    unknownCompany: "Компания не указана",
    unknownFormat: "Формат не указан",
    sourceStatus: {
      Active: "Активна",
      Unknown: "Статус не подтверждён",
      Closed: "Закрыта",
      Expired: "Истекла",
      Removed: "Удалена"
    },
    notSetFeminine: "Не указана",
    notSetMasculine: "Не указан",
    notSetPlural: "Не указаны",
    favorite: (title: string, favorite: boolean) =>
      `${favorite ? "Убрать из избранного" : "В избранное"}: ${title}`,
    columnsTitle: "Столбцы списка",
    columnsDescription:
      "Название и личные действия видны всегда. Набор столбцов сохраняется в ссылке и сохранённом поиске.",
    done: "Готово",
    defaultSet: "Стандартный набор",
    relativeLocale: "ru"
  },
  en: {
    widthHint: "Resize columns from the right edge of each header.",
    columnsButton: "Columns",
    tableAria: "Opportunities",
    selectColumn: "Select",
    titleColumn: "Opportunity",
    favoriteColumn: "Favorite",
    columnWidth: (label: string) => `Column width ${label}`,
    selectRow: (title: string) => `Select ${title}`,
    unknownCompany: "Company not specified",
    unknownFormat: "Format not specified",
    sourceStatus: {
      Active: "Active",
      Unknown: "Status not confirmed",
      Closed: "Closed",
      Expired: "Expired",
      Removed: "Removed"
    },
    notSetFeminine: "Not specified",
    notSetMasculine: "Not specified",
    notSetPlural: "Not specified",
    favorite: (title: string, favorite: boolean) =>
      `${favorite ? "Remove from favorites" : "Add to favorites"}: ${title}`,
    columnsTitle: "List columns",
    columnsDescription:
      "Title and personal actions are always visible. Columns are saved in the link and saved search.",
    done: "Done",
    defaultSet: "Default set",
    relativeLocale: "en"
  }
} as const;

const defaultWidths: Record<string, number> = {
  title: 340,
  money: 200,
  match: 92,
  ai: 92,
  source: 180,
  status: 140,
  firstSeen: 130,
  published: 130,
  deadline: 145,
  skills: 220,
  location: 180
};
const defaults = {
  list: ["money", "match", "status", "firstSeen"],
  table: ["money", "match", "ai", "source", "status", "firstSeen"]
};

export function readTableFields(raw: string | null, mode: string): Column[] {
  const requested = raw === null ? defaults[mode === "table" ? "table" : "list"] : raw.split(",");
  return [...new Set(requested)].filter((key): key is Column => key in tableColumns);
}

export function OpportunityTable({
  items,
  sources,
  mode,
  params,
  change,
  selected,
  toggle,
  onOpen,
  onFavorite,
  favoritePending,
  hasNextPage,
  loadingMore,
  onLoadMore
}: {
  items: OpportunityRecord[];
  sources: PublicSource[];
  mode: string;
  params: URLSearchParams;
  change: (key: string, value: string) => void;
  selected: Set<string>;
  toggle: (id: string) => void;
  onOpen: (id: string) => void;
  onFavorite?: (id: string, enabled: boolean) => void;
  favoritePending: boolean;
  hasNextPage?: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  "use no memo"; // TanStack Virtual exposes mutable measurement functions.
  const { user } = useAuth();
  const locale = resolveOpportunityTableLocale(user?.settings.locale);
  const copy = tableCopy[locale];
  const columns: Record<Column, string> = tableColumnsByLocale[locale];
  const parent = useRef<HTMLDivElement>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [resizing, setResizing] = useState<{ key: string; width: number } | null>(null);
  const resizeStart = useRef<{ key: string; x: number; width: number } | null>(null);
  const fields = readTableFields(params.get("fields"), mode);
  let savedWidths: Record<string, number> = {};
  try {
    const parsed = JSON.parse(params.get("columnWidths") ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      savedWidths = Object.fromEntries(
        Object.entries(parsed)
          .filter(
            ([key, width]) =>
              key in defaultWidths && typeof width === "number" && Number.isFinite(width)
          )
          .map(([key, width]) => [
            key,
            Math.max(key === "title" ? 240 : 80, Math.min(800, Number(width)))
          ])
      );
  } catch {
    /* Use default widths for invalid links. */
  }
  const width = (key: string) =>
    resizing?.key === key ? resizing.width : (savedWidths[key] ?? defaultWidths[key]);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parent.current,
    getItemKey: (index) => items[index].id,
    estimateSize: () => (mode === "list" ? 106 : 84),
    overscan: 8,
    useFlushSync: false
  });
  const virtualRows = virtualizer.getVirtualItems();
  const lastIndex = virtualRows[virtualRows.length - 1]?.index ?? -1;
  useEffect(() => {
    if (lastIndex >= items.length - 5 && hasNextPage && !loadingMore) onLoadMore();
  }, [lastIndex, items.length, hasNextPage, loadingMore, onLoadMore]);
  const template = `48px minmax(${width("title")}px, 1fr) ${fields.map((key) => `${width(key)}px`).join(" ")} 48px`;
  const minimumWidth = 96 + width("title") + fields.reduce((sum, key) => sum + width(key), 0);
  const saveWidth = (key: string, nextWidth: number) =>
    change("columnWidths", JSON.stringify({ ...savedWidths, [key]: Math.round(nextWidth) }));
  function startResize(event: PointerEvent<HTMLSpanElement>, key: string) {
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStart.current = { key, x: event.clientX, width: width(key) };
  }
  function moveResize(event: PointerEvent<HTMLSpanElement>) {
    const start = resizeStart.current;
    if (start)
      setResizing({
        key: start.key,
        width: Math.max(
          start.key === "title" ? 240 : 80,
          Math.min(800, start.width + event.clientX - start.x)
        )
      });
  }
  function endResize() {
    const start = resizeStart.current;
    if (start && resizing) saveWidth(start.key, resizing.width);
    resizeStart.current = null;
    setResizing(null);
  }
  const heading = (key: string, label: string) => (
    <div
      role="columnheader"
      className={`relative flex items-center px-3 py-3 ${key === "title" ? "sticky left-12 z-10 bg-muted/90" : ""}`}
      key={key}
    >
      <span>{label}</span>
      <span
        role="separator"
        aria-label={copy.columnWidth(label)}
        aria-orientation="vertical"
        aria-valuenow={width(key)}
        aria-valuemin={key === "title" ? 240 : 80}
        aria-valuemax={800}
        tabIndex={0}
        className="absolute inset-y-1 right-0 w-2 cursor-col-resize rounded hover:bg-primary/20 focus:bg-primary/20 focus:outline-none"
        onPointerDown={(event) => startResize(event, key)}
        onPointerMove={moveResize}
        onPointerUp={endResize}
        onPointerCancel={() => {
          resizeStart.current = null;
          setResizing(null);
        }}
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
            event.preventDefault();
            saveWidth(
              key,
              Math.max(
                key === "title" ? 240 : 80,
                Math.min(800, width(key) + (event.key === "ArrowRight" ? 16 : -16))
              )
            );
          }
        }}
      />
    </div>
  );
  return (
    <section className="hidden md:block">
      <div className="mb-2 flex items-center justify-end gap-2">
        <p className="mr-auto text-xs text-muted-foreground">{copy.widthHint}</p>
        <Button size="sm" variant="ghost" onClick={() => setColumnsOpen(true)}>
          <Columns3 className="size-4" />
          {copy.columnsButton}
        </Button>
      </div>
      <div
        ref={parent}
        className="intly-table-wrap max-h-[65vh] overflow-auto"
        style={{ height: Math.min(650, 47 + items.length * (mode === "list" ? 106 : 84)) }}
        role="table"
        aria-label={copy.tableAria}
        aria-rowcount={items.length + 1}
        aria-colcount={fields.length + 3}
      >
        <div
          role="rowgroup"
          className="sticky top-0 z-20 bg-muted/90 backdrop-blur"
          style={{ minWidth: minimumWidth }}
        >
          <div
            role="row"
            className="grid border-b text-xs font-medium text-muted-foreground"
            style={{ gridTemplateColumns: template }}
          >
            <div role="columnheader" className="sticky left-0 z-10 bg-muted/90">
              <span className="sr-only">{copy.selectColumn}</span>
            </div>
            {heading("title", copy.titleColumn)}
            {fields.map((key) => heading(key, columns[key]))}
            <div role="columnheader">
              <span className="sr-only">{copy.favoriteColumn}</span>
            </div>
          </div>
        </div>
        <div
          role="rowgroup"
          className="relative"
          style={{ height: virtualizer.getTotalSize(), minWidth: minimumWidth }}
        >
          {virtualRows.map((row) => {
            const item = items[row.index];
            const mini = toMini(item, sources, locale);
            return (
              <div
                role="row"
                aria-rowindex={row.index + 2}
                key={row.key}
                data-index={row.index}
                ref={virtualizer.measureElement}
                className="group absolute left-0 top-0 grid w-full border-b border-border/60 bg-card/95 text-sm hover:bg-muted/30"
                style={{
                  gridTemplateColumns: template,
                  transform: `translateY(${row.start}px)`,
                  minHeight: mode === "list" ? 106 : 84
                }}
              >
                <div
                  role="cell"
                  className="sticky left-0 z-10 flex items-start justify-center bg-card/95 pt-5 group-hover:bg-muted/90"
                >
                  <input
                    type="checkbox"
                    aria-label={copy.selectRow(item.title)}
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                  />
                </div>
                <div
                  role="cell"
                  className="sticky left-12 z-10 min-w-0 bg-card/95 px-3 py-3 group-hover:bg-muted/90"
                >
                  <button
                    className="line-clamp-2 text-left font-medium hover:text-primary"
                    onClick={() => onOpen(item.id)}
                  >
                    {item.title}
                  </button>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.companyOrClient || copy.unknownCompany} ·{" "}
                    {mini.placeLabel || copy.unknownFormat}
                  </p>
                  {mode === "list" && (
                    <div className="mt-2 flex gap-1 overflow-hidden">
                      {mini.skills.slice(0, 4).map((skill) => (
                        <Badge key={skill}>{skill}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                {fields.map((key) => (
                  <div role="cell" key={key} className="min-w-0 px-3 py-3 text-xs">
                    {key === "money" ? (
                      moneyLabel(item.money, locale)
                    ) : key === "match" ? (
                      <MatchScore
                        value={mini.matchScore}
                        label={locale === "ru" ? "Подходит" : "Fit"}
                        compact
                      />
                    ) : key === "ai" ? (
                      <MatchScore value={item.aiScore ?? null} label="AI" compact />
                    ) : key === "source" ? (
                      <>
                        <span>
                          {mini.source.name}
                          {mini.source.extraCount ? ` +${mini.source.extraCount}` : ""}
                        </span>
                        <p className="mt-1 text-muted-foreground">
                          {copy.sourceStatus[item.sourceStatus]}
                        </p>
                      </>
                    ) : key === "status" ? (
                      <Badge>{stageLabelsByLocale[locale][mini.pipelineStage]}</Badge>
                    ) : key === "firstSeen" ? (
                      formatRelativeTime(item.firstSeenAt, copy.relativeLocale)
                    ) : key === "published" ? (
                      item.publishedAt ? (
                        formatOpportunityFieldDate(item, "publishedAt", locale, false)
                      ) : (
                        copy.notSetFeminine
                      )
                    ) : key === "deadline" ? (
                      item.deadline ? (
                        formatOpportunityFieldDate(item, "deadline", locale, false)
                      ) : (
                        copy.notSetMasculine
                      )
                    ) : key === "skills" ? (
                      <div className="flex flex-wrap gap-1">
                        {mini.skills.slice(0, 6).map((skill) => (
                          <Badge key={skill}>{skill}</Badge>
                        ))}
                      </div>
                    ) : (
                      opportunityPlaceLabel(item, locale) || copy.notSetPlural
                    )}
                  </div>
                ))}
                <div role="cell" className="py-3">
                  <Button
                    variant={mini.favorite ? "secondary" : "ghost"}
                    size="icon"
                    aria-label={copy.favorite(item.title, mini.favorite)}
                    aria-pressed={mini.favorite}
                    aria-disabled={!onFavorite || favoritePending}
                    disabled={!onFavorite}
                    className={favoritePending ? "cursor-wait opacity-50" : undefined}
                    onClick={() => {
                      if (!favoritePending) onFavorite?.(item.id, !mini.favorite);
                    }}
                  >
                    <Heart className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Modal
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        title={copy.columnsTitle}
        description={copy.columnsDescription}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(columns).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <input
                type="checkbox"
                checked={fields.includes(key as Column)}
                onChange={(event) =>
                  change(
                    "fields",
                    (event.target.checked
                      ? [...fields, key]
                      : fields.filter((field) => field !== key)
                    ).join(",") || "none"
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => setColumnsOpen(false)}>{copy.done}</Button>
          <Button
            variant="ghost"
            onClick={() => {
              change("fields", "");
            }}
          >
            {copy.defaultSet}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
