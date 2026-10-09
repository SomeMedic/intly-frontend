"use client";

import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, GripVertical, MessageSquare, Plus, Settings2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/features/admin";
import { useAuth } from "@/features/auth";
import type { TaskBoard, TaskChecklistItem, TaskItem, TaskSubtask, TaskType } from "@/types";
import { cn } from "@/lib/utils";
import { workflowApi } from "../api/workflow-api";
import {
  QueryState,
  ScreenScaffold,
  workflowPanelClass,
  workflowSubPanelClass
} from "./ScreenScaffold";
import {
  isoToZonedDateTimeLocal,
  resolveCalendarTimeZone,
  zonedDateTimeLocalToIso
} from "./calendar-time";
import {
  assigneeLabel,
  boardScopeLabels,
  countLabel,
  enumLabel,
  formatWorkflowDateTime,
  participantLabel,
  participantOptions,
  priorityLabels,
  resolveWorkflowLocale,
  taskTypeLabels,
  userDirectory,
  type WorkflowLocale
} from "./workflow-labels";

const defaultColumns = [
  { id: "todo", name: "К выполнению", order: 10 },
  { id: "doing", name: "В работе", order: 20 },
  { id: "done", name: "Готово", order: 30 }
];

function localizedDefaultColumns(locale: WorkflowLocale) {
  if (locale === "en") {
    return [
      { id: "todo", name: "To do", order: 10 },
      { id: "doing", name: "In progress", order: 20 },
      { id: "done", name: "Done", order: 30 }
    ];
  }
  return defaultColumns;
}

const taskTypes: TaskType[] = [
  "Task",
  "Follow-up",
  "Interview Prep",
  "Application",
  "Tender Step",
  "Resume Update",
  "Research"
];
const priorities = ["low", "normal", "high", "urgent"];
const selectClass =
  "h-[var(--control-height)] rounded-md border border-border/80 bg-card px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring";

type TaskDraft = {
  title: string;
  description: string;
  type: TaskType;
  dueAt: string;
  priority: string;
  statusColumnId: string;
  assigneeId: string;
  labels: string;
};

const initialDraft: TaskDraft = {
  title: "",
  description: "",
  type: "Task",
  dueAt: "",
  priority: "normal",
  statusColumnId: "todo",
  assigneeId: "",
  labels: ""
};

export function TasksScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState("Моя доска");
  const [boardScope, setBoardScope] = useState("personal");
  const [boardMembers, setBoardMembers] = useState("");
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(initialDraft);
  const [renderNow] = useState(() => Date.now());
  const locale = resolveWorkflowLocale(user?.settings.locale);
  const timezone = resolveCalendarTimeZone(
    user?.settings.timezone,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const boardsQuery = useQuery({
    queryKey: ["tasks", "boards"],
    queryFn: workflowApi.tasks.boards
  });
  const usersQuery = useQuery({
    queryKey: ["admin", "users", "directory"],
    queryFn: () => adminApi.users.list(),
    enabled: user?.role === "Admin",
    staleTime: 60_000
  });
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);
  const activeBoard = useMemo<TaskBoard | null>(
    () => boards.find((board) => board.id === selectedBoardId) ?? boards[0] ?? null,
    [boards, selectedBoardId]
  );
  const columns = activeBoard?.columns?.length
    ? activeBoard.columns
    : localizedDefaultColumns(locale);
  const tasksQuery = useQuery({
    queryKey: ["tasks", activeBoard?.id],
    queryFn: () => workflowApi.tasks.list(activeBoard?.id),
    enabled: Boolean(activeBoard?.id)
  });
  const tasks = tasksQuery.data?.items ?? [];
  const selectedTask = tasks.find((item) => item.id === selectedTaskId) ?? null;
  const participants = participantOptions(activeBoard, user?.id);
  const directory = useMemo(
    () => userDirectory(usersQuery.data?.items, user),
    [usersQuery.data?.items, user]
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const createBoard = useMutation({
    mutationFn: () =>
      workflowApi.tasks.createBoard({
        name: boardName.trim(),
        scope: boardScope,
        members: boardScope === "personal" ? [] : splitValues(boardMembers),
        columns: localizedDefaultColumns(locale)
      }),
    onSuccess: (board) => {
      setSelectedBoardId(board.id);
      setCreateBoardOpen(false);
      setBoardMembers("");
      queryClient.invalidateQueries({ queryKey: ["tasks", "boards"] });
    }
  });
  const createTask = useMutation({
    mutationFn: () => {
      if (!activeBoard) throw new Error("Сначала создайте доску");
      return workflowApi.tasks.create({
        boardId: activeBoard.id,
        title: draft.title.trim(),
        description: draft.description.trim(),
        statusColumnId: draft.statusColumnId,
        priority: draft.priority,
        type: draft.type,
        assigneeId: draft.assigneeId || undefined,
        labels: splitValues(draft.labels),
        dueAt: localDateTimeToIso(draft.dueAt, timezone)
      });
    },
    onSuccess: () => {
      setDraft((value) => ({ ...initialDraft, statusColumnId: value.statusColumnId }));
      setCreateTaskOpen(false);
      invalidateTasks(queryClient, activeBoard?.id);
    }
  });
  const updateTask = useMutation({
    mutationFn: ({
      id,
      patch
    }: {
      id: string;
      patch: Partial<TaskItem> & { completed?: boolean };
    }) => workflowApi.tasks.update(id, patch),
    onSuccess: () => invalidateTasks(queryClient, activeBoard?.id, selectedTaskId)
  });
  const updateBoard = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TaskBoard> }) =>
      workflowApi.tasks.updateBoard(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", "boards"] })
  });
  const remove = useMutation({
    mutationFn: workflowApi.tasks.remove,
    onSuccess: () => {
      setSelectedTaskId(null);
      invalidateTasks(queryClient, activeBoard?.id);
    }
  });

  function onDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id).replace("task:", "");
    const targetColumnId = event.over?.id ? String(event.over.id).replace("column:", "") : null;
    const task = tasks.find((item) => item.id === taskId);
    if (task && targetColumnId && targetColumnId !== task.statusColumnId) {
      updateTask.mutate({ id: task.id, patch: { statusColumnId: targetColumnId } });
    }
  }

  return (
    <ScreenScaffold
      artwork="workflow"
      title={locale === "en" ? "Tasks" : "Задачи"}
      description={
        locale === "en"
          ? "Work boards for applications, interviews, follow-ups, and next steps."
          : "Рабочие доски для откликов, интервью, напоминаний и следующих шагов."
      }
    >
      <div className={`${workflowPanelClass} mb-4`}>
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="min-w-0 flex-1 space-y-1 text-sm">
            <span className="font-medium">Доска</span>
            <select
              className={`${selectClass} w-full min-w-0`}
              value={activeBoard?.id ?? ""}
              onChange={(event) => setSelectedBoardId(event.target.value)}
            >
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
              {!boards.length ? <option value="">Нет досок</option> : null}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCreateBoardOpen(true)}>
              <Plus className="size-4" />
              Доска
            </Button>
            <Button onClick={() => setCreateTaskOpen(true)} disabled={!activeBoard}>
              <Plus className="size-4" />
              Задача
            </Button>
            <Button
              variant="outline"
              onClick={() => setBoardSettingsOpen(true)}
              disabled={!activeBoard}
            >
              <Settings2 className="size-4" />
              {locale === "en" ? "Access" : "Доступ"}
            </Button>
          </div>
        </div>
        {activeBoard ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {enumLabel(boardScopeLabels, activeBoard.scope, locale)} ·{" "}
            {countLabel(tasks.length, ["задача", "задачи", "задач"], "task", "tasks", locale)} ·{" "}
            {countLabel(
              participants.length,
              ["участник", "участника", "участников"],
              "member",
              "members",
              locale
            )}
          </p>
        ) : null}
      </div>
      <QueryState
        isLoading={boardsQuery.isLoading || tasksQuery.isLoading}
        isError={boardsQuery.isError || tasksQuery.isError}
        isEmpty={!activeBoard}
        emptyTitle={locale === "en" ? "No task board" : "Нет доски задач"}
        emptyDescription={
          locale === "en"
            ? "Create a board to add tasks and run the Kanban flow."
            : "Создайте доску, чтобы добавлять задачи и вести Kanban."
        }
        onRetry={() => {
          boardsQuery.refetch();
          tasksQuery.refetch();
        }}
      >
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid min-w-0 gap-3 xl:grid-cols-3">
            {columns.map((column) => (
              <TaskColumn
                key={column.id}
                column={column}
                tasks={tasks.filter((task) => task.statusColumnId === column.id)}
                now={renderNow}
                directory={directory}
                currentUserId={user?.id}
                locale={locale}
                timezone={timezone}
                onOpen={setSelectedTaskId}
                onRemove={(id) => remove.mutate(id)}
              />
            ))}
          </div>
        </DndContext>
      </QueryState>
      <Modal
        open={createBoardOpen}
        onOpenChange={setCreateBoardOpen}
        title={locale === "en" ? "New board" : "Новая доска"}
        description={
          locale === "en"
            ? "Create a personal or team task board."
            : "Создайте личную или командную доску задач."
        }
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (boardName.trim()) createBoard.mutate();
          }}
        >
          <label className="space-y-1 text-sm">
            <span className="font-medium">{locale === "en" ? "Name" : "Название"}</span>
            <Input
              value={boardName}
              onChange={(event) => setBoardName(event.target.value)}
              placeholder={
                locale === "en" ? "For example, October applications" : "Например, Отклики октября"
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{locale === "en" ? "Access" : "Тип доступа"}</span>
            <select
              className={`${selectClass} w-full`}
              value={boardScope}
              onChange={(event) => {
                setBoardScope(event.target.value);
                if (event.target.value === "personal") setBoardMembers("");
              }}
            >
              {Object.entries(boardScopeLabels[locale]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {boardScope === "personal" ? null : (
            <MemberSelector
              label={locale === "en" ? "Members" : "Участники"}
              value={splitValues(boardMembers)}
              directory={directory}
              currentUserId={user?.id}
              locale={locale}
              onChange={(next) => setBoardMembers(next.join(", "))}
            />
          )}
          <Button type="submit" loading={createBoard.isPending} disabled={!boardName.trim()}>
            <Plus className="size-4" />
            {locale === "en" ? "Create board" : "Создать доску"}
          </Button>
          {createBoard.isError ? (
            <p className="text-sm text-destructive">{createBoard.error.message}</p>
          ) : null}
        </form>
      </Modal>
      <Modal
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        title={locale === "en" ? "New task" : "Новая задача"}
        description={
          activeBoard
            ? `${locale === "en" ? "Board" : "Доска"}: ${activeBoard.name}`
            : locale === "en"
              ? "Select a board first."
              : "Сначала выберите доску."
        }
        wide
      >
        <TaskCreateForm
          draft={draft}
          setDraft={setDraft}
          columns={columns}
          participants={participants}
          directory={directory}
          currentUserId={user?.id}
          locale={locale}
          createTaskPending={createTask.isPending}
          createTaskError={createTask.isError ? createTask.error.message : null}
          disabled={!activeBoard}
          onSubmit={() => createTask.mutate()}
        />
      </Modal>
      {activeBoard ? (
        <Modal
          open={boardSettingsOpen}
          onOpenChange={setBoardSettingsOpen}
          title={locale === "en" ? "Board access" : "Доступ к доске"}
          description={
            locale === "en"
              ? "Edit the name, access type and members."
              : "Изменение названия, типа доступа и списка участников."
          }
        >
          <BoardAclForm
            key={activeBoard.id}
            board={activeBoard}
            directory={directory}
            currentUserId={user?.id}
            locale={locale}
            saving={updateBoard.isPending}
            onSave={(patch) =>
              updateBoard.mutate(
                { id: activeBoard.id, patch },
                { onSuccess: () => setBoardSettingsOpen(false) }
              )
            }
          />
        </Modal>
      ) : null}
      {selectedTask ? (
        <TaskDetailDrawer
          key={selectedTask.id}
          task={selectedTask}
          board={activeBoard}
          participants={participants}
          directory={directory}
          currentUserId={user?.id}
          locale={locale}
          timezone={timezone}
          onClose={() => setSelectedTaskId(null)}
          onRemove={(id) => remove.mutate(id)}
          removing={remove.isPending}
          onPatch={(patch) => updateTask.mutate({ id: selectedTask.id, patch })}
          patching={updateTask.isPending}
        />
      ) : null}
    </ScreenScaffold>
  );
}

function splitValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function localDateTimeToIso(value?: string, timezone?: string) {
  return (
    zonedDateTimeLocalToIso(value, timezone) ?? (value ? new Date(value).toISOString() : undefined)
  );
}

function toDateTimeLocal(value?: string, timezone?: string) {
  if (!value) return "";
  return isoToZonedDateTimeLocal(value, timezone);
}

type NormalizedChecklistItem = { id?: string; text: string; completed: boolean };
type NormalizedSubtask = { id?: string; title: string; completed: boolean; assigneeId?: string };

function normalizeChecklist(items?: TaskChecklistItem[]): NormalizedChecklistItem[] {
  return (items ?? [])
    .map((item) => ({
      id: item.id,
      text: item.text ?? item.title ?? "",
      completed: item.completed ?? item.done ?? false
    }))
    .filter((item) => item.text.trim());
}

function normalizeSubtasks(items?: TaskSubtask[]): NormalizedSubtask[] {
  return (items ?? [])
    .map((item) => ({
      id: item.id,
      title: item.title,
      completed: item.completed ?? false,
      assigneeId: item.assigneeId
    }))
    .filter((item) => item.title.trim());
}

function invalidateTasks(
  queryClient: ReturnType<typeof useQueryClient>,
  boardId?: string,
  taskId?: string | null
) {
  queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
  queryClient.invalidateQueries({ queryKey: ["calendar"] });
  if (taskId) queryClient.invalidateQueries({ queryKey: ["tasks", "detail", taskId] });
}

function FieldLabel({
  label,
  children,
  className
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("min-w-0 space-y-1 text-sm", className)}>
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function MemberSelector({
  label,
  value,
  directory,
  currentUserId,
  locale,
  onChange
}: {
  label: string;
  value: string[];
  directory: Map<string, string>;
  currentUserId?: string;
  locale: WorkflowLocale;
  onChange: (next: string[]) => void;
}) {
  const choices = Array.from(directory.entries()).filter(([id]) => id !== currentUserId);
  const selected = new Set(value);
  const visibleSelected = value.filter((id) => !choices.some(([choiceId]) => choiceId === id));
  const toggle = (id: string, checked: boolean) => {
    const next = new Set(value);
    if (checked) next.add(id);
    else next.delete(id);
    onChange(Array.from(next));
  };
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">{label}</p>
      {choices.length ? (
        <div className="max-h-56 space-y-2 overflow-auto rounded-md border border-border/70 bg-background/70 p-3">
          {choices.map(([id, name]) => (
            <label key={id} className="flex items-center gap-2">
              <Checkbox
                checked={selected.has(id)}
                onCheckedChange={(checked) => toggle(id, Boolean(checked))}
              />
              <span>{name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className={workflowSubPanelClass + " text-xs text-muted-foreground"}>
          {locale === "en"
            ? "User selection is unavailable now. You can keep the board personal; the current user remains the owner."
            : "Выбор пользователей сейчас недоступен. Можно оставить доску личной; текущий пользователь останется владельцем."}
        </p>
      )}
      {visibleSelected.length ? (
        <div className={`${workflowSubPanelClass} text-xs text-muted-foreground`}>
          <p className="mb-1 font-medium text-foreground">
            {locale === "en"
              ? "Current members outside the available directory"
              : "Текущие участники вне доступного каталога"}
          </p>
          {visibleSelected.map((id) => (
            <p key={id}>{participantLabel(id, directory, currentUserId, locale)}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TaskCreateForm({
  draft,
  setDraft,
  columns,
  participants,
  directory,
  currentUserId,
  locale,
  createTaskPending,
  createTaskError,
  disabled,
  onSubmit
}: {
  draft: TaskDraft;
  setDraft: Dispatch<SetStateAction<TaskDraft>>;
  columns: TaskBoard["columns"];
  participants: string[];
  directory: Map<string, string>;
  currentUserId?: string;
  locale: WorkflowLocale;
  createTaskPending: boolean;
  createTaskError: string | null;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      className="grid min-w-0 gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (draft.title.trim()) onSubmit();
      }}
    >
      <FieldLabel label={locale === "en" ? "Title" : "Название"} className="md:col-span-2">
        <Input
          value={draft.title}
          onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))}
          placeholder={locale === "en" ? "Task title" : "Название задачи"}
        />
      </FieldLabel>
      <FieldLabel label={locale === "en" ? "Description" : "Описание"} className="md:col-span-2">
        <Textarea
          value={draft.description}
          onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))}
          placeholder={
            locale === "en"
              ? "Context, next-step link, done criteria"
              : "Контекст, ссылка на следующий шаг, критерий готовности"
          }
          className="min-h-24"
        />
      </FieldLabel>
      <FieldLabel label={locale === "en" ? "Column" : "Колонка"}>
        <select
          className={`${selectClass} w-full min-w-0`}
          value={draft.statusColumnId}
          onChange={(event) =>
            setDraft((value) => ({ ...value, statusColumnId: event.target.value }))
          }
        >
          {columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.name}
            </option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel label={locale === "en" ? "Type" : "Тип"}>
        <select
          className={`${selectClass} w-full min-w-0`}
          value={draft.type}
          onChange={(event) =>
            setDraft((value) => ({ ...value, type: event.target.value as TaskType }))
          }
        >
          {taskTypes.map((type) => (
            <option key={type} value={type}>
              {enumLabel(taskTypeLabels, type, locale)}
            </option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel label={locale === "en" ? "Due date" : "Срок"}>
        <Input
          type="datetime-local"
          value={draft.dueAt}
          onChange={(event) => setDraft((value) => ({ ...value, dueAt: event.target.value }))}
        />
      </FieldLabel>
      <FieldLabel label={locale === "en" ? "Priority" : "Приоритет"}>
        <select
          className={`${selectClass} w-full min-w-0`}
          value={draft.priority}
          onChange={(event) => setDraft((value) => ({ ...value, priority: event.target.value }))}
        >
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {enumLabel(priorityLabels, priority, locale)}
            </option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel label={locale === "en" ? "Assignee" : "Исполнитель"}>
        <select
          className={`${selectClass} w-full min-w-0`}
          value={draft.assigneeId}
          onChange={(event) => setDraft((value) => ({ ...value, assigneeId: event.target.value }))}
        >
          <option value="">{locale === "en" ? "Unassigned" : "Без исполнителя"}</option>
          {participants.map((id) => (
            <option key={id} value={id}>
              {participantLabel(id, directory, currentUserId, locale)}
            </option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel label={locale === "en" ? "Labels" : "Метки"}>
        <Input
          value={draft.labels}
          onChange={(event) => setDraft((value) => ({ ...value, labels: event.target.value }))}
          placeholder={locale === "en" ? "Comma-separated labels" : "Метки через запятую"}
        />
      </FieldLabel>
      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
        <Button
          type="submit"
          loading={createTaskPending}
          disabled={disabled || !draft.title.trim()}
        >
          <Plus className="size-4" />
          {locale === "en" ? "Create task" : "Создать задачу"}
        </Button>
        {createTaskError ? <p className="text-sm text-destructive">{createTaskError}</p> : null}
      </div>
    </form>
  );
}

function BoardAclForm({
  board,
  directory,
  currentUserId,
  locale,
  saving,
  onSave
}: {
  board: TaskBoard;
  directory: Map<string, string>;
  currentUserId?: string;
  locale: WorkflowLocale;
  saving: boolean;
  onSave: (patch: Partial<TaskBoard>) => void;
}) {
  const [name, setName] = useState(board.name);
  const [scope, setScope] = useState(board.scope ?? "personal");
  const [members, setMembers] = useState<string[]>(board.members ?? []);
  return (
    <form
      className="space-y-3 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          name: name.trim(),
          scope,
          members: scope === "personal" ? [] : members,
          columns: board.columns
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <FieldLabel label={locale === "en" ? "Name" : "Название"}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={locale === "en" ? "Board name" : "Название доски"}
          />
        </FieldLabel>
        <FieldLabel label={locale === "en" ? "Access" : "Тип доступа"}>
          <select
            className={`${selectClass} w-full`}
            value={scope}
            onChange={(event) => {
              const nextScope = event.target.value;
              setScope(nextScope);
              if (nextScope === "personal") setMembers([]);
            }}
          >
            {Object.entries(boardScopeLabels[locale]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FieldLabel>
      </div>
      {scope === "personal" ? (
        <p className={workflowSubPanelClass + " text-xs text-muted-foreground"}>
          {locale === "en"
            ? "A personal board is available only to the owner. It does not need a member list."
            : "Личная доска доступна только владельцу. Список участников здесь не нужен."}
        </p>
      ) : (
        <MemberSelector
          label={locale === "en" ? "Members" : "Участники"}
          value={members}
          directory={directory}
          currentUserId={currentUserId}
          locale={locale}
          onChange={setMembers}
        />
      )}
      <Button size="sm" type="submit" loading={saving} disabled={!name.trim()}>
        {locale === "en" ? "Save access" : "Сохранить доступ"}
      </Button>
    </form>
  );
}

function TaskColumn({
  column,
  tasks,
  now,
  directory,
  currentUserId,
  locale,
  timezone,
  onOpen,
  onRemove
}: {
  column: TaskBoard["columns"][number];
  tasks: TaskItem[];
  now: number;
  directory: Map<string, string>;
  currentUserId?: string;
  locale: WorkflowLocale;
  timezone: string;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${column.id}` });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "min-w-0 rounded-lg border border-border/70 bg-card/70 p-3 transition",
        isOver && "border-primary bg-primary/5"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{column.name}</h2>
        <Badge>{tasks.length}</Badge>
      </div>
      <SortableContext
        items={tasks.map((task) => `task:${task.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-24 space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              now={now}
              directory={directory}
              currentUserId={currentUserId}
              locale={locale}
              timezone={timezone}
              onOpen={onOpen}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

function TaskCard({
  task,
  now,
  directory,
  currentUserId,
  locale,
  timezone,
  onOpen,
  onRemove
}: {
  task: TaskItem;
  now: number;
  directory: Map<string, string>;
  currentUserId?: string;
  locale: WorkflowLocale;
  timezone: string;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task:${task.id}`
  });
  const checklist = normalizeChecklist(task.checklist);
  const subtasks = normalizeSubtasks(task.subtasks);
  const checklistDone = checklist.filter((item) => item.completed).length;
  const subtasksDone = subtasks.filter((item) => item.completed).length;
  const overdue = task.dueAt && !task.completedAt && +new Date(task.dueAt) < now;
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-md border border-border/70 bg-background/70 p-3 shadow-[0_1px_0_rgba(8,9,10,0.03)] transition hover:border-primary/45 hover:bg-card",
        isDragging && "opacity-60",
        task.completedAt && "opacity-65"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(task.id)}>
          <h3 className="line-clamp-2 text-sm font-semibold">{task.title}</h3>
          {task.description ? (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
          ) : null}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label={locale === "en" ? "Drag task" : "Перетащить задачу"}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onRemove(task.id)}
            aria-label={locale === "en" ? "Delete task" : "Удалить задачу"}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        <Badge>{enumLabel(taskTypeLabels, task.type, locale)}</Badge>
        <Badge
          intent={task.priority === "urgent" || task.priority === "high" ? "warning" : "neutral"}
        >
          {enumLabel(priorityLabels, task.priority, locale)}
        </Badge>
        {task.dueAt ? (
          <Badge intent={overdue ? "danger" : "primary"}>
            {formatWorkflowDateTime(task.dueAt, locale, timezone)}
          </Badge>
        ) : null}
        {task.assigneeId ? (
          <Badge intent="neutral">{assigneeLabel(task, directory, currentUserId, locale)}</Badge>
        ) : null}
      </div>
      {checklist.length || subtasks.length || task.comments?.length ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {checklist.length ? (
            <span>
              {checklistDone}/{checklist.length} {locale === "en" ? "checklist" : "чеклист"}
            </span>
          ) : null}
          {subtasks.length ? (
            <span>
              {subtasksDone}/{subtasks.length} {locale === "en" ? "subtasks" : "подзадачи"}
            </span>
          ) : null}
          {task.comments?.length ? (
            <span>
              {countLabel(
                task.comments.length,
                ["комментарий", "комментария", "комментариев"],
                "comment",
                "comments",
                locale
              )}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function TaskDetailDrawer({
  task,
  board,
  participants,
  directory,
  currentUserId,
  locale,
  timezone,
  onClose,
  onRemove,
  removing,
  onPatch,
  patching
}: {
  task: TaskItem;
  board: TaskBoard | null;
  participants: string[];
  directory: Map<string, string>;
  currentUserId?: string;
  locale: WorkflowLocale;
  timezone: string;
  onClose: () => void;
  onRemove: (id: string) => void;
  removing: boolean;
  onPatch: (patch: Partial<TaskItem> & { completed?: boolean }) => void;
  patching: boolean;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [type, setType] = useState<TaskType>(task.type);
  const [priority, setPriority] = useState(task.priority ?? "normal");
  const [statusColumnId, setStatusColumnId] = useState(task.statusColumnId);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [dueAt, setDueAt] = useState(toDateTimeLocal(task.dueAt, timezone));
  const [labels, setLabels] = useState((task.labels ?? []).join(", "));
  const [newChecklist, setNewChecklist] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [comment, setComment] = useState("");
  const detail = useQuery({
    queryKey: ["tasks", "detail", task.id],
    queryFn: () => workflowApi.tasks.get(task.id)
  });
  const detailedTask = detail.data ?? task;
  const checklist = normalizeChecklist(detailedTask.checklist);
  const subtasks = normalizeSubtasks(detailedTask.subtasks);
  const comments = detailedTask.comments ?? [];
  const commentMutation = useMutation({
    mutationFn: () => workflowApi.tasks.comment(task.id, { body: comment.trim() }),
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", task.id] });
    }
  });
  const reminderMutation = useMutation({
    mutationFn: () =>
      workflowApi.tasks.reminder(task.id, {
        remindAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        channels: ["inApp"]
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", "detail", task.id] })
  });

  function patchChecklist(next: ReturnType<typeof normalizeChecklist>) {
    onPatch({ checklist: next });
  }

  function patchSubtasks(next: ReturnType<typeof normalizeSubtasks>) {
    onPatch({ subtasks: next });
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={locale === "en" ? "Task" : "Задача"}
      description={
        locale === "en"
          ? "Edit details, checklist, subtasks, comments and reminders."
          : "Редактирование, чеклист, подзадачи, комментарии и напоминания."
      }
      placement="drawer"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <section className="grid gap-3 rounded-lg border border-border/70 bg-background/60 p-4 md:grid-cols-2">
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium">{locale === "en" ? "Title" : "Название"}</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium">{locale === "en" ? "Description" : "Описание"}</span>
              <Textarea
                className="min-h-28"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{locale === "en" ? "Column" : "Колонка"}</span>
              <select
                className={`${selectClass} w-full`}
                value={statusColumnId}
                onChange={(event) => setStatusColumnId(event.target.value)}
              >
                {(board?.columns ?? localizedDefaultColumns(locale)).map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{locale === "en" ? "Type" : "Тип"}</span>
              <select
                className={`${selectClass} w-full`}
                value={type}
                onChange={(event) => setType(event.target.value as TaskType)}
              >
                {taskTypes.map((item) => (
                  <option key={item} value={item}>
                    {enumLabel(taskTypeLabels, item, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{locale === "en" ? "Priority" : "Приоритет"}</span>
              <select
                className={`${selectClass} w-full`}
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                {priorities.map((item) => (
                  <option key={item} value={item}>
                    {enumLabel(priorityLabels, item, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{locale === "en" ? "Due date" : "Срок"}</span>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{locale === "en" ? "Assignee" : "Исполнитель"}</span>
              <select
                className={`${selectClass} w-full`}
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
              >
                <option value="">{locale === "en" ? "Unassigned" : "Без исполнителя"}</option>
                {participants.map((id) => (
                  <option key={id} value={id}>
                    {participantLabel(id, directory, currentUserId, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{locale === "en" ? "Labels" : "Метки"}</span>
              <Input value={labels} onChange={(event) => setLabels(event.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button
                loading={patching}
                disabled={!title.trim()}
                onClick={() =>
                  onPatch({
                    title: title.trim(),
                    description,
                    type,
                    priority,
                    statusColumnId,
                    assigneeId: assigneeId || undefined,
                    dueAt: localDateTimeToIso(dueAt, timezone),
                    labels: splitValues(labels)
                  })
                }
              >
                {locale === "en" ? "Save task" : "Сохранить задачу"}
              </Button>
              <Button
                variant="outline"
                loading={patching}
                onClick={() => onPatch({ completed: !detailedTask.completedAt })}
              >
                <CheckCircle2 className="size-4" />
                {detailedTask.completedAt
                  ? locale === "en"
                    ? "Return to work"
                    : "Вернуть в работу"
                  : locale === "en"
                    ? "Complete"
                    : "Завершить"}
              </Button>
              <Button variant="danger" loading={removing} onClick={() => onRemove(task.id)}>
                <Trash2 className="size-4" />
                {locale === "en" ? "Delete" : "Удалить"}
              </Button>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-card p-4">
              <h3 className="font-semibold">{locale === "en" ? "Checklist" : "Чеклист"}</h3>
              <div className="mt-3 space-y-2">
                {checklist.map((item, index) => (
                  <label
                    key={item.id ?? `${item.text}-${index}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={(checked) =>
                        patchChecklist(
                          checklist.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, completed: Boolean(checked) } : row
                          )
                        )
                      }
                    />
                    <span className={cn(item.completed && "text-muted-foreground line-through")}>
                      {item.text}
                    </span>
                  </label>
                ))}
                {!checklist.length ? (
                  <p className="text-sm text-muted-foreground">
                    {locale === "en" ? "Checklist is empty." : "Чеклист пуст."}
                  </p>
                ) : null}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (newChecklist.trim()) {
                    patchChecklist([...checklist, { text: newChecklist.trim(), completed: false }]);
                    setNewChecklist("");
                  }
                }}
              >
                <Input
                  value={newChecklist}
                  onChange={(event) => setNewChecklist(event.target.value)}
                  placeholder={locale === "en" ? "Checklist item" : "Пункт чеклиста"}
                />
                <Button type="submit" size="sm" disabled={!newChecklist.trim()}>
                  <Plus className="size-4" />
                  {locale === "en" ? "Add" : "Добавить"}
                </Button>
              </form>
            </div>
            <div className="rounded-lg border border-border/70 bg-card p-4">
              <h3 className="font-semibold">{locale === "en" ? "Subtasks" : "Подзадачи"}</h3>
              <div className="mt-3 space-y-2">
                {subtasks.map((item, index) => (
                  <label
                    key={item.id ?? `${item.title}-${index}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={(checked) =>
                        patchSubtasks(
                          subtasks.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, completed: Boolean(checked) } : row
                          )
                        )
                      }
                    />
                    <span className={cn(item.completed && "text-muted-foreground line-through")}>
                      {item.title}
                    </span>
                  </label>
                ))}
                {!subtasks.length ? (
                  <p className="text-sm text-muted-foreground">
                    {locale === "en" ? "No subtasks yet." : "Подзадач пока нет."}
                  </p>
                ) : null}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (newSubtask.trim()) {
                    patchSubtasks([...subtasks, { title: newSubtask.trim(), completed: false }]);
                    setNewSubtask("");
                  }
                }}
              >
                <Input
                  value={newSubtask}
                  onChange={(event) => setNewSubtask(event.target.value)}
                  placeholder={locale === "en" ? "Subtask" : "Подзадача"}
                />
                <Button type="submit" size="sm" disabled={!newSubtask.trim()}>
                  <Plus className="size-4" />
                  {locale === "en" ? "Add" : "Добавить"}
                </Button>
              </form>
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-lg border border-border/70 bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{locale === "en" ? "Comments" : "Комментарии"}</h3>
              <MessageSquare className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {comments.map((item) => (
                <article
                  key={item.id}
                  className="rounded-md border border-border/70 bg-background/70 p-2"
                >
                  <p className="text-sm">{item.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.authorEmail ?? item.authorId}{" "}
                    {item.createdAt
                      ? `· ${formatWorkflowDateTime(item.createdAt, locale, timezone)}`
                      : ""}
                  </p>
                </article>
              ))}
              {!comments.length ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "en" ? "No comments yet." : "Комментариев пока нет."}
                </p>
              ) : null}
            </div>
            <form
              className="mt-3 space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (comment.trim()) commentMutation.mutate();
              }}
            >
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={locale === "en" ? "Add a comment" : "Добавить комментарий"}
              />
              <Button
                type="submit"
                size="sm"
                loading={commentMutation.isPending}
                disabled={!comment.trim()}
              >
                {locale === "en" ? "Send" : "Отправить"}
              </Button>
              {commentMutation.isError ? (
                <p className="text-sm text-destructive">{commentMutation.error.message}</p>
              ) : null}
            </form>
          </section>
          <section className="rounded-lg border border-border/70 bg-card p-4">
            <h3 className="font-semibold">{locale === "en" ? "Reminders" : "Напоминания"}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {locale === "en"
                ? "Create a reminder for yourself inside the app."
                : "Создайте напоминание для себя внутри приложения."}
            </p>
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              loading={reminderMutation.isPending}
              onClick={() => reminderMutation.mutate()}
            >
              {locale === "en" ? "Remind in one hour" : "Напомнить через час"}
            </Button>
            {detailedTask.reminders?.length ? (
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {detailedTask.reminders.map((item) => (
                  <p key={item.id ?? item.remindAt}>
                    {formatWorkflowDateTime(item.remindAt, locale, timezone)} ·{" "}
                    {item.channels.join(", ")}
                  </p>
                ))}
              </div>
            ) : null}
            {reminderMutation.isError ? (
              <p className="mt-2 text-sm text-destructive">{reminderMutation.error.message}</p>
            ) : null}
          </section>
          {detail.isError ? (
            <p className="text-sm text-destructive">{detail.error.message}</p>
          ) : null}
        </aside>
      </div>
    </Modal>
  );
}
