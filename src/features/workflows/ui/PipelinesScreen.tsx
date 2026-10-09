"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
  type ScreenReaderInstructions
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  GripVertical,
  Heart,
  ListChecks,
  ListFilter,
  RefreshCcw,
  Search
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/features/auth";
import { getPublicSources, useProfiles } from "@/features/profiles";
import { OpportunityWorkspace } from "@/features/opportunities";
import { SseClient } from "@/services/sse";
import type {
  PipelineBoard,
  PipelineCard,
  PipelineStage,
  PipelineSuggestedAction,
  PipelineType
} from "@/types";
import type { SseEvent } from "@/types";
import { cn } from "@/lib/utils";
import { workflowApi } from "../api/workflow-api";
import {
  PipelineSuggestionTaskDialog,
  type PipelineSuggestionTaskState
} from "./PipelineSuggestionTaskDialog";
import { QueryState, ScreenScaffold, workflowPanelClass } from "./ScreenScaffold";
import {
  countLabel,
  enumLabel,
  formatWorkflowDateTime,
  pipelineStageLabels,
  pipelineTypeLabels,
  resolveWorkflowLocale,
  type WorkflowLocale
} from "./workflow-labels";
import {
  dragPayload,
  keyboardStageForPipelineMove,
  normalizePipelineBoard,
  pipelineAttentionFilters,
  pipelineFiltersForApi,
  pipelineSorts,
  pipelineStateToParams,
  pipelineTypes,
  pipelineUrlState,
  stagesForPipeline,
  pipelineItemToCard
} from "@/lib/pipeline-model";

const selectClass =
  "h-[var(--control-height)] rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
type DragHandleFocusRequest = { opportunityId: string; afterDataUpdatedAt: number | null };

const copy = {
  ru: {
    title: "Отклики",
    description:
      "Личные этапы по вакансиям, проектам и тендерам: что новое, где ждут ответа и какой следующий шаг сделать.",
    profile: "Профиль",
    noProfile: "Выберите профиль для откликов.",
    filters: "Фильтры",
    filtersActive: (count: number) => `Активно: ${count}`,
    source: "Источник",
    allSources: "Все источники",
    minMatch: "Соответствие от",
    minAi: "Оценка AI от",
    tags: "Теги",
    dateFrom: "Собрано с",
    dateTo: "по",
    attention: "Внимание",
    counterpart: "Контрагент",
    sort: "Сортировка",
    reset: "Сбросить",
    refresh: "Обновить",
    empty: "Пока нет карточек",
    emptyDescription:
      "Колонки уже готовы. Карточки появятся здесь, когда возможности попадут в личную работу выбранного профиля.",
    filterEmptyDescription:
      "По выбранным фильтрам ничего не найдено. Сбросьте фильтры или измените условия — колонки останутся на месте.",
    clearFilters: "Сбросить фильтры",
    favorite: "В избранном",
    dropHere: "Перетащите сюда",
    moveTo: "Переместить в",
    moving: "Сохраняем новый этап…",
    moveFailed: "Не удалось сохранить новый этап. Обновите воронку и повторите перенос.",
    preview: "Быстрый просмотр",
    attentionCount: (count: number) =>
      countLabel(count, ["сигнал", "сигнала", "сигналов"], "signal", "signals", "ru"),
    due: "Срок",
    match: "Соответствие",
    ai: "Оценка AI",
    createTask: "Создать задачу",
    dragCard: "Перетащить карточку",
    dueAt: "Срок",
    sse: {
      connected: "Обновления включены",
      connecting: "Подключаем обновления",
      reconnecting: "Восстанавливаем обновления",
      degraded: "Обновления задерживаются",
      offline: "Обновления недоступны",
      idle: "Ожидаем обновления"
    },
    attentionLabels: {
      all: "Все",
      needs_attention: "Требует внимания",
      overdue: "Просрочено",
      follow_up_due: "Пора связаться",
      deadline_urgent: "Скоро дедлайн"
    },
    sortLabels: {
      recommended: "Рекомендовано",
      freshness: "Свежесть",
      score: "Score",
      deadline: "Дедлайн"
    },
    suggestionLabels: {
      follow_up: "Связаться",
      interview_prep: "Подготовить интервью",
      negotiation: "Подготовить переговоры",
      project: "План проекта",
      application: "Подготовить заявку",
      submission_reminder: "Проверить результат заявки",
      contracting: "Подготовить договор"
    },
    dndInstructions:
      "Чтобы взять карточку, нажмите пробел или Enter. Перемещайте её стрелками. Нажмите пробел или Enter ещё раз, чтобы положить, или Escape, чтобы отменить.",
    dndCardFallback: "карточка",
    dndPicked: (title: string) => `Карточка «${title}» взята.`,
    dndOver: (title: string, stage: string) => `Карточка «${title}» над этапом «${stage}».`,
    dndNoStage: (title: string) => `Карточка «${title}» вне этапов.`,
    dndDropped: (title: string, stage: string) =>
      `Карточка «${title}» перемещена в этап «${stage}».`,
    dndDroppedNoStage: (title: string) => `Карточка «${title}» отпущена без изменения этапа.`,
    dndCancelled: (title: string) => `Перемещение карточки «${title}» отменено.`
  },
  en: {
    title: "Responses",
    description:
      "Personal stages for vacancies, projects and tenders: what is new, what needs attention and which next step to take.",
    profile: "Profile",
    noProfile: "Choose a profile to manage your applications.",
    filters: "Filters",
    filtersActive: (count: number) => `${count} active`,
    source: "Source",
    allSources: "All sources",
    minMatch: "Minimum fit",
    minAi: "AI rating from",
    tags: "Tags",
    dateFrom: "Collected from",
    dateTo: "to",
    attention: "Attention",
    counterpart: "Counterpart",
    sort: "Sort",
    reset: "Reset",
    refresh: "Refresh",
    empty: "Pipeline is empty",
    emptyDescription:
      "Columns are ready. Cards appear here when opportunities enter personal work for the selected profile.",
    filterEmptyDescription:
      "Nothing matches the selected filters. Clear filters or adjust the conditions — columns stay visible.",
    clearFilters: "Clear filters",
    favorite: "Favorite",
    dropHere: "Drop here",
    moveTo: "Move to",
    moving: "Saving the new stage…",
    moveFailed: "Could not save the new stage. Refresh the pipeline and try moving the card again.",
    preview: "Quick preview",
    attentionCount: (count: number) =>
      countLabel(count, ["сигнал", "сигнала", "сигналов"], "signal", "signals", "en"),
    due: "Due",
    match: "Fit",
    ai: "AI rating",
    createTask: "Create task",
    dragCard: "Drag card",
    dueAt: "Due",
    sse: {
      connected: "Updates on",
      connecting: "Connecting updates",
      reconnecting: "Restoring updates",
      degraded: "Updates delayed",
      offline: "Updates unavailable",
      idle: "Waiting for updates"
    },
    attentionLabels: {
      all: "All",
      needs_attention: "Needs attention",
      overdue: "Overdue",
      follow_up_due: "Follow-up due",
      deadline_urgent: "Urgent deadline"
    },
    sortLabels: {
      recommended: "Recommended",
      freshness: "Freshness",
      score: "Score",
      deadline: "Deadline"
    },
    suggestionLabels: {
      follow_up: "Contact",
      interview_prep: "Prepare interview",
      negotiation: "Prepare negotiation",
      project: "Project plan",
      application: "Prepare application",
      submission_reminder: "Check application result",
      contracting: "Prepare contract"
    },
    dndInstructions:
      "Press Space or Enter to pick up a card. Use arrow keys to move it. Press Space or Enter again to drop, or Escape to cancel.",
    dndCardFallback: "card",
    dndPicked: (title: string) => `Card “${title}” picked up.`,
    dndOver: (title: string, stage: string) => `Card “${title}” is over stage “${stage}”.`,
    dndNoStage: (title: string) => `Card “${title}” is outside pipeline stages.`,
    dndDropped: (title: string, stage: string) => `Card “${title}” moved to stage “${stage}”.`,
    dndDroppedNoStage: (title: string) => `Card “${title}” dropped without changing stage.`,
    dndCancelled: (title: string) => `Moving card “${title}” cancelled.`
  }
};

export function PipelinesScreen() {
  const { user } = useAuth();
  const locale = resolveWorkflowLocale(user?.settings.locale);
  return (
    <Suspense
      fallback={
        <ScreenScaffold
          title={copy[locale].title}
          description={copy[locale].description}
          artwork="workflow"
        >
          <p role="status">{locale === "ru" ? "Загружаем воронку…" : "Loading pipeline…"}</p>
        </ScreenScaffold>
      }
    >
      <PipelineBoardScreen />
    </Suspense>
  );
}

function PipelineBoardScreen() {
  const { user } = useAuth();
  const locale = resolveWorkflowLocale(user?.settings.locale);
  const text = copy[locale];
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const profiles = useProfiles();
  const defaultProfileId =
    profiles.data?.find((profile) => profile.isActive)?.id ?? profiles.data?.[0]?.id ?? null;
  const state = pipelineUrlState(new URLSearchParams(params.toString()), defaultProfileId);
  const filters = pipelineFiltersForApi(state);
  const queryClient = useQueryClient();
  const sources = useQuery({
    queryKey: ["sources", "public"],
    queryFn: getPublicSources,
    enabled: !!user
  });
  const boardQuery = useQuery({
    queryKey: ["pipelines", state.type, state.profileId, filters],
    queryFn: () => workflowApi.pipelines.board(state.type, state.profileId, filters),
    enabled: !!state.profileId
  });
  const board = useMemo(
    () => normalizePipelineBoard(boardQuery.data, state.type),
    [boardQuery.data, state.type]
  );
  const sourceNames = useMemo(
    () => Object.fromEntries((sources.data ?? []).map((source) => [source.id, source.name])),
    [sources.data]
  );
  const [preview, setPreview] = useState<{ id: string; tab?: string } | null>(null);
  const [suggestion, setSuggestion] = useState<PipelineSuggestionTaskState>(null);
  const [sseState, setSseState] = useState("idle");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const dragHandleRefs = useRef(new Map<string, HTMLButtonElement>());
  const [focusRequest, setFocusRequest] = useState<DragHandleFocusRequest | null>(null);
  const keyboardCoordinateGetter = useMemo<KeyboardCoordinateGetter>(
    () =>
      (event, { active, currentCoordinates, context }) => {
        const currentStage = context.over?.id ? String(context.over.id) : undefined;
        const targetStage = keyboardStageForPipelineMove({
          activeId: String(active),
          key: event.code,
          board,
          type: state.type,
          currentStage
        });
        if (!targetStage) return undefined;
        const targetRect = context.droppableRects.get(targetStage);
        if (!targetRect) return currentCoordinates;
        const activeRect = context.collisionRect;
        return {
          x: targetRect.left + targetRect.width / 2 - (activeRect?.width ?? 0) / 2,
          y: targetRect.top + targetRect.height / 2 - (activeRect?.height ?? 0) / 2
        };
      },
    [board, state.type]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinateGetter,
      scrollBehavior: "auto"
    })
  );
  const focusDragHandle = useCallback(
    (opportunityId: string, afterDataUpdatedAt: number | null = null) => {
      setFocusRequest({ opportunityId, afterDataUpdatedAt });
    },
    []
  );
  const registerDragHandle = useCallback(
    (opportunityId: string, node: HTMLButtonElement | null) => {
      if (!node) {
        dragHandleRefs.current.delete(opportunityId);
        return;
      }
      dragHandleRefs.current.set(opportunityId, node);
      if (focusRequest?.opportunityId !== opportunityId) return;
      if (
        focusRequest.afterDataUpdatedAt !== null &&
        boardQuery.dataUpdatedAt <= focusRequest.afterDataUpdatedAt
      )
        return;
      node.focus();
      setFocusRequest(null);
    },
    [boardQuery.dataUpdatedAt, focusRequest]
  );

  const move = useMutation({
    mutationFn: ({ opportunityId, stage }: { opportunityId: string; stage: PipelineStage }) => {
      if (!state.profileId) throw new Error(text.noProfile);
      return workflowApi.pipelines.move(opportunityId, state.profileId, stage);
    },
    onSuccess: () => invalidatePipeline(queryClient, state.type, state.profileId),
    onError: () => undefined
  });

  useEffect(() => {
    const client = new SseClient({
      onEvent: (event) =>
        handlePipelineEvent(event, () =>
          invalidatePipeline(queryClient, state.type, state.profileId)
        ),
      onStateChange: setSseState
    });
    client.connect();
    return () => client.disconnect();
  }, [queryClient, state.type, state.profileId]);

  function update(next: Partial<typeof state>) {
    move.reset();
    const merged = { ...state, ...next };
    const nextParams = pipelineStateToParams(merged);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  function onDragEnd(event: DragEndEvent) {
    const keyboardDrag = isKeyboardDrag(event.activatorEvent);
    const focusOpportunityId = keyboardDrag ? activeOpportunityId(event) : null;
    const payload = dragPayload({
      activeId: String(event.active.id),
      overId: event.over?.id ? String(event.over.id) : null,
      board,
      type: state.type,
      profileId: state.profileId
    });
    if (!payload) {
      if (focusOpportunityId) focusDragHandle(focusOpportunityId);
      return;
    }
    if (focusOpportunityId) focusDragHandle(focusOpportunityId, boardQuery.dataUpdatedAt);
    move.mutate(
      { opportunityId: payload.opportunityId, stage: payload.to },
      {
        onError: () => {
          if (focusOpportunityId) focusDragHandle(focusOpportunityId);
        }
      }
    );
  }

  function onDragCancel(event: DragEndEvent) {
    if (!isKeyboardDrag(event.activatorEvent)) return;
    const focusOpportunityId = activeOpportunityId(event);
    if (focusOpportunityId) focusDragHandle(focusOpportunityId);
  }

  function clearFilters() {
    update({
      sourceIds: undefined,
      minMatch: undefined,
      minAiScore: undefined,
      tags: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      attention: "all",
      counterpart: undefined,
      sort: "recommended"
    });
  }

  const activeFilterCount = pipelineActiveFilterCount(state);
  const cards = useMemo(
    () =>
      board.columns.flatMap((column) =>
        column.items.map((item) => pipelineItemToCard(item, sourceNames))
      ),
    [board.columns, sourceNames]
  );
  const cardTitles = useMemo(() => new Map(cards.map((card) => [card.id, card.title])), [cards]);
  const dndAccessibility = useMemo<{
    screenReaderInstructions: ScreenReaderInstructions;
    announcements: Announcements;
  }>(() => {
    const cardTitle = (id: unknown) => cardTitles.get(String(id)) ?? text.dndCardFallback;
    const stageLabel = (id: unknown) =>
      id ? enumLabel(pipelineStageLabels, String(id), locale) : null;
    return {
      screenReaderInstructions: { draggable: text.dndInstructions },
      announcements: {
        onDragStart: ({ active }) => text.dndPicked(cardTitle(active.id)),
        onDragOver: ({ active, over }) => {
          const stage = stageLabel(over?.id);
          return stage
            ? text.dndOver(cardTitle(active.id), stage)
            : text.dndNoStage(cardTitle(active.id));
        },
        onDragEnd: ({ active, over }) => {
          const stage = stageLabel(over?.id);
          return stage
            ? text.dndDropped(cardTitle(active.id), stage)
            : text.dndDroppedNoStage(cardTitle(active.id));
        },
        onDragCancel: ({ active }) => text.dndCancelled(cardTitle(active.id))
      }
    };
  }, [cardTitles, locale, text]);

  return (
    <ScreenScaffold title={text.title} description={text.description} artwork="workflow">
      <div className={`${workflowPanelClass} mb-4 space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          {pipelineTypes.map((item) => (
            <Button
              key={item}
              variant={item === state.type ? "primary" : "outline"}
              onClick={() => update({ type: item })}
            >
              {enumLabel(pipelineTypeLabels, item, locale)}
            </Button>
          ))}
          <label className="ml-auto flex min-w-56 flex-1 items-center gap-2 text-sm sm:flex-none">
            <span className="font-medium">{text.profile}</span>
            <select
              className={`${selectClass} min-w-0 flex-1`}
              value={state.profileId ?? ""}
              onChange={(event) => update({ profileId: event.target.value || undefined })}
            >
              <option value="">{text.noProfile}</option>
              {(profiles.data ?? []).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <Badge>{text.sse[sseState as keyof typeof text.sse] ?? sseState}</Badge>
          <Button
            variant="outline"
            onClick={() => {
              move.reset();
              boardQuery.refetch();
            }}
            loading={boardQuery.isFetching}
          >
            <RefreshCcw className="size-4" />
            {text.refresh}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          aria-expanded={filtersOpen}
          aria-controls="pipeline-filters"
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <ListFilter className="size-4" />
          {text.filters}
          {activeFilterCount ? <Badge>{text.filtersActive(activeFilterCount)}</Badge> : null}
        </Button>
        <div id="pipeline-filters" className={filtersOpen ? "block" : "hidden"}>
          <PipelineFilters
            locale={locale}
            state={state}
            sources={sources.data ?? []}
            onChange={update}
            onReset={clearFilters}
          />
        </div>
      </div>
      {move.isError ? (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {text.moveFailed}
        </p>
      ) : null}
      <QueryState
        isLoading={profiles.isLoading || boardQuery.isLoading}
        isError={profiles.isError || boardQuery.isError}
        isEmpty={!state.profileId}
        emptyTitle={!state.profileId ? text.noProfile : text.empty}
        emptyDescription={text.emptyDescription}
        onRetry={() => {
          profiles.refetch();
          boardQuery.refetch();
        }}
      >
        {!cards.length ? (
          activeFilterCount > 0 ? (
            <div className="mb-3 flex flex-col gap-2 rounded-lg border border-dashed bg-card/70 p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>{text.filterEmptyDescription}</p>
              <Button type="button" variant="outline" onClick={clearFilters}>
                {text.clearFilters}
              </Button>
            </div>
          ) : (
            <p className="mb-3 rounded-lg border border-dashed bg-card/70 p-3 text-sm text-muted-foreground">
              {text.emptyDescription}
            </p>
          )
        ) : null}
        <DndContext
          sensors={sensors}
          accessibility={dndAccessibility}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <div className="flex snap-x gap-[var(--card-gap)] overflow-x-auto pb-4">
            {board.columns.map((column) => (
              <PipelineColumn
                key={column.status}
                type={state.type}
                column={column}
                locale={locale}
                profileId={state.profileId}
                moving={move.isPending}
                onMove={(id, stage) => move.mutate({ opportunityId: id, stage })}
                onOpen={(id) => setPreview({ id })}
                sourceNames={sourceNames}
                onSuggest={(card, action) => setSuggestion({ card, action })}
                registerDragHandle={registerDragHandle}
              />
            ))}
          </div>
        </DndContext>
      </QueryState>
      <Modal
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
        title={text.preview}
        placement="drawer"
        wide
      >
        {preview ? (
          <OpportunityWorkspace
            id={preview.id}
            initialTab={preview.tab}
            profileIdOverride={state.profileId}
            compact
            onUpdated={() => invalidatePipeline(queryClient, state.type, state.profileId)}
            onOpenPipeline={() => setPreview(null)}
          />
        ) : null}
      </Modal>
      <PipelineSuggestionTaskDialog
        state={suggestion}
        locale={locale}
        profileId={state.profileId}
        onClose={() => setSuggestion(null)}
        onCreated={() => {
          setSuggestion(null);
          invalidatePipeline(queryClient, state.type, state.profileId);
        }}
      />
    </ScreenScaffold>
  );
}

function pipelineActiveFilterCount(state: ReturnType<typeof pipelineUrlState>) {
  return [
    state.sourceIds?.length,
    state.minMatch !== undefined,
    state.minAiScore !== undefined,
    state.tags?.length,
    state.dateFrom,
    state.dateTo,
    state.attention && state.attention !== "all",
    state.counterpart,
    state.sort && state.sort !== "recommended"
  ].filter(Boolean).length;
}

function PipelineFilters({
  locale,
  state,
  sources,
  onChange,
  onReset
}: {
  locale: WorkflowLocale;
  state: ReturnType<typeof pipelineUrlState>;
  sources: Array<{ id: string; name: string }>;
  onChange: (state: Partial<ReturnType<typeof pipelineUrlState>>) => void;
  onReset: () => void;
}) {
  const text = copy[locale];
  const sourceValue = state.sourceIds?.[0] ?? "";
  const counterpartId = "pipeline-counterpart-filter";
  return (
    <section aria-label={text.filters} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-medium text-muted-foreground sm:col-span-2 xl:col-span-2">
        {text.source}
        <select
          className={`${selectClass} mt-1 w-full`}
          value={sourceValue}
          onChange={(event) =>
            onChange({ sourceIds: event.target.value ? [event.target.value] : undefined })
          }
        >
          <option value="">{text.allSources}</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        {text.minMatch}
        <Input
          className="mt-1"
          type="number"
          min={0}
          max={100}
          value={state.minMatch ?? ""}
          onChange={(event) =>
            onChange({ minMatch: event.target.value ? Number(event.target.value) : undefined })
          }
        />
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        {text.minAi}
        <Input
          className="mt-1"
          type="number"
          min={0}
          max={100}
          value={state.minAiScore ?? ""}
          onChange={(event) =>
            onChange({ minAiScore: event.target.value ? Number(event.target.value) : undefined })
          }
        />
      </label>
      <TagFilter
        key={state.tags?.join(",") ?? ""}
        label={text.tags}
        value={state.tags?.join(", ") ?? ""}
        onCommit={(value) =>
          onChange({
            tags: value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          })
        }
      />
      <label className="text-xs font-medium text-muted-foreground">
        {text.dateFrom}
        <Input
          className="mt-1"
          type="date"
          value={state.dateFrom ?? ""}
          onChange={(event) => onChange({ dateFrom: event.target.value || undefined })}
        />
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        {text.dateTo}
        <Input
          className="mt-1"
          type="date"
          value={state.dateTo ?? ""}
          onChange={(event) => onChange({ dateTo: event.target.value || undefined })}
        />
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        {text.attention}
        <select
          className={`${selectClass} mt-1 w-full`}
          value={state.attention ?? "all"}
          onChange={(event) => onChange({ attention: event.target.value as never })}
        >
          {pipelineAttentionFilters.map((value) => (
            <option key={value} value={value}>
              {text.attentionLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        {text.sort}
        <select
          className={`${selectClass} mt-1 w-full`}
          value={state.sort ?? "recommended"}
          onChange={(event) => onChange({ sort: event.target.value as never })}
        >
          {pipelineSorts.map((value) => (
            <option key={value} value={value}>
              {text.sortLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <div className="text-xs font-medium text-muted-foreground sm:col-span-2 xl:col-span-2">
        <label htmlFor={counterpartId}>{text.counterpart}</label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              id={counterpartId}
              className="pl-9"
              value={state.counterpart ?? ""}
              onChange={(event) => onChange({ counterpart: event.target.value || undefined })}
            />
          </div>
          <Button type="button" variant="outline" onClick={onReset}>
            {text.reset}
          </Button>
        </div>
      </div>
    </section>
  );
}

function TagFilter({
  label,
  value,
  onCommit
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  function commit() {
    onCommit(draft);
  }
  return (
    <label className="text-xs font-medium text-muted-foreground">
      {label}
      <Input
        className="mt-1"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
      />
    </label>
  );
}

function PipelineColumn({
  type,
  column,
  locale,
  profileId,
  moving,
  sourceNames,
  onMove,
  onOpen,
  onSuggest,
  registerDragHandle
}: {
  type: PipelineType;
  column: PipelineBoard["columns"][number];
  locale: WorkflowLocale;
  profileId?: string;
  moving: boolean;
  sourceNames: Record<string, string>;
  onMove: (id: string, stage: PipelineStage) => void;
  onOpen: (id: string) => void;
  onSuggest: (card: PipelineCard, action: PipelineSuggestedAction) => void;
  registerDragHandle: (opportunityId: string, node: HTMLButtonElement | null) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.status });
  const text = copy[locale];
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "min-h-[calc(var(--row-height)_+_21rem)] w-[clamp(18rem,calc(var(--row-height)_+_18rem),22rem)] shrink-0 snap-start rounded-lg border border-border/70 bg-card/80 p-[var(--card-padding)] transition motion-reduce:transition-none",
        isOver && "border-primary bg-primary/5 ring-2 ring-primary/30"
      )}
    >
      <div className="mb-[var(--card-gap)] flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{enumLabel(pipelineStageLabels, column.status, locale)}</h2>
          <p className="text-xs text-muted-foreground">
            {countLabel(
              column.items.length,
              ["карточка", "карточки", "карточек"],
              "card",
              "cards",
              locale
            )}{" "}
            · {text.attentionCount(column.attentionCount ?? 0)}
          </p>
        </div>
        <Badge intent={(column.attentionCount ?? 0) > 0 ? "warning" : "neutral"}>
          {column.items.length}
        </Badge>
      </div>
      {isOver ? (
        <p className="mb-[var(--card-gap)] rounded-md border border-primary/30 bg-primary/10 p-2 text-center text-xs text-primary">
          {text.dropHere}
        </p>
      ) : null}
      <div className="space-y-[var(--card-gap)]">
        {column.items.map((item) => (
          <PipelineCardView
            key={item.state.id}
            type={type}
            item={item}
            locale={locale}
            profileId={profileId}
            sourceNames={sourceNames}
            moving={moving}
            onMove={onMove}
            onOpen={onOpen}
            onSuggest={onSuggest}
            registerDragHandle={registerDragHandle}
          />
        ))}
      </div>
    </section>
  );
}

function PipelineCardView({
  type,
  item,
  locale,
  profileId,
  moving,
  sourceNames,
  onMove,
  onOpen,
  onSuggest,
  registerDragHandle
}: {
  type: PipelineType;
  item: PipelineBoard["columns"][number]["items"][number];
  locale: WorkflowLocale;
  profileId?: string;
  moving: boolean;
  sourceNames: Record<string, string>;
  onMove: (id: string, stage: PipelineStage) => void;
  onOpen: (id: string) => void;
  onSuggest: (card: PipelineCard, action: PipelineSuggestedAction) => void;
  registerDragHandle: (opportunityId: string, node: HTMLButtonElement | null) => void;
}) {
  const card = pipelineItemToCard(item, sourceNames);
  const text = copy[locale];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.state.id,
    data: { opportunityId: item.state.opportunityId }
  });
  const style = { transform: CSS.Translate.toString(transform) };
  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-border/70 bg-background/70 p-[var(--card-padding)] shadow-[0_1px_0_rgba(8,9,10,0.03)] transition motion-reduce:transition-none",
        card.favorite && "border-ai/45 bg-ai/5",
        card.closed && "border-muted bg-muted/30 text-muted-foreground saturate-75",
        isDragging
          ? "z-20 scale-[1.02] border-primary shadow-floating motion-reduce:scale-100"
          : "hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card motion-reduce:hover:translate-y-0"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          ref={(node) => registerDragHandle(card.opportunityId, node)}
          type="button"
          className="mt-0.5 cursor-grab rounded p-1 text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={text.dragCard}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(card.opportunityId)}
        >
          <h3 className="line-clamp-2 text-sm font-semibold">{card.title}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{card.counterpart}</p>
        </button>
      </div>
      <div className="mt-[var(--card-gap)] flex flex-wrap gap-1">
        {card.favorite ? (
          <Badge intent="ai">
            <Heart className="size-3" />
            {text.favorite}
          </Badge>
        ) : null}
        {card.money ? <Badge>{card.money}</Badge> : null}
        {card.sourceName ? <Badge>{card.sourceName}</Badge> : null}
        {typeof card.matchScore === "number" ? (
          <Badge intent="success">
            {text.match} {card.matchScore}
          </Badge>
        ) : null}
        {typeof card.aiScore === "number" ? (
          <Badge intent="ai">
            {text.ai} {card.aiScore}
          </Badge>
        ) : null}
      </div>
      {card.tags?.length ? (
        <div className="mt-[var(--card-gap)] flex flex-wrap gap-1">
          {card.tags.slice(0, 4).map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      ) : null}
      {card.dueAt ? (
        <p className="mt-[var(--card-gap)] flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" />
          {text.due}: {formatWorkflowDateTime(card.dueAt, locale)}
        </p>
      ) : null}
      {card.attention?.length ? (
        <div className="mt-[var(--card-gap)] flex flex-wrap gap-1">
          {card.attention.map((code) => (
            <Badge key={code} intent={code === "overdue" ? "danger" : "warning"}>
              <AlertTriangle className="size-3" />
              {text.attentionLabels[code] ?? code}
            </Badge>
          ))}
        </div>
      ) : null}
      <select
        className={`${selectClass} mt-[var(--card-gap)] w-full`}
        aria-label={`${text.moveTo} ${card.title}`}
        value={item.state.pipelineStatus}
        disabled={moving || !profileId}
        onChange={(event) => onMove(card.opportunityId, event.target.value as PipelineStage)}
      >
        {stagesForPipeline(type).map((stage) => (
          <option key={stage} value={stage}>
            {text.moveTo} {enumLabel(pipelineStageLabels, stage, locale)}
          </option>
        ))}
      </select>
      {card.suggestedActions?.length ? (
        <div className="mt-[var(--card-gap)] flex flex-wrap gap-1">
          {card.suggestedActions.map((action) => (
            <Button
              key={action.key}
              size="sm"
              variant="outline"
              onClick={() => onSuggest(card, action)}
            >
              <ListChecks className="size-3.5" />
              {text.suggestionLabels[action.key] ?? action.key}
            </Button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function isKeyboardDrag(event: Event) {
  return event instanceof KeyboardEvent || event.type === "keydown";
}

function activeOpportunityId(event: DragEndEvent) {
  const value = event.active.data.current?.opportunityId;
  return typeof value === "string" && value ? value : null;
}

function handlePipelineEvent(event: SseEvent, invalidate: () => void) {
  if (
    [
      "pipeline.changed",
      "task.created",
      "task.updated",
      "task.deleted",
      "opportunity.updated",
      "ai.analysis.completed",
      "calendar.event.created",
      "calendar.event.updated",
      "calendar.event.deleted"
    ].includes(event.type)
  )
    invalidate();
}

function invalidatePipeline(
  queryClient: ReturnType<typeof useQueryClient>,
  type: PipelineType,
  profileId?: string
) {
  queryClient.invalidateQueries({ queryKey: ["pipelines"] });
  queryClient.invalidateQueries({ queryKey: ["pipelines", type, profileId] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["opportunities"] });
  queryClient.invalidateQueries({ queryKey: ["calendar"] });
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
}
