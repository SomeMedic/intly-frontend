"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth";
import { suggestionToTaskDraft } from "@/lib/pipeline-model";
import type { PipelineCard, PipelineSuggestedAction, TaskBoard } from "@/types";
import { workflowApi, type CreateTaskPayload } from "../api/workflow-api";
import { isoToZonedDateTimeLocal, resolveCalendarTimeZone, zonedDateTimeLocalToIso } from "./calendar-time";
import { enumLabel, participantLabel, participantOptions, taskTypeLabels, userDirectory, type WorkflowLocale } from "./workflow-labels";

const selectClass = "h-[var(--control-height)] rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const copy = {
  ru: {
    suggestionTitle: "Подтвердить задачу",
    suggestionDescription: "Задача будет создана только после подтверждения. Отмена ничего не записывает.",
    board: "Доска",
    newBoard: "Новая доска",
    boardName: "Название доски",
    titleField: "Название",
    typeField: "Тип",
    dueAt: "Срок",
    assignee: "Исполнитель",
    unassigned: "Без исполнителя",
    checklist: "Чеклист",
    descriptionField: "Описание",
    cancel: "Отмена",
    submitTask: "Создать задачу",
    taskFailed: "Не удалось создать задачу",
    defaultBoardName: "Задачи по воронкам",
    defaultTodo: "К выполнению",
    defaultDoing: "В работе",
    defaultDone: "Готово",
    checklistPlaceholder: "Один пункт на строку"
  },
  en: {
    suggestionTitle: "Confirm task",
    suggestionDescription: "The task is created only after confirmation. Cancel writes nothing.",
    board: "Board",
    newBoard: "New board",
    boardName: "Board name",
    titleField: "Title",
    typeField: "Type",
    dueAt: "Due",
    assignee: "Assignee",
    unassigned: "Unassigned",
    checklist: "Checklist",
    descriptionField: "Description",
    cancel: "Cancel",
    submitTask: "Create task",
    taskFailed: "Could not create task",
    defaultBoardName: "Pipeline tasks",
    defaultTodo: "To do",
    defaultDoing: "In progress",
    defaultDone: "Done",
    checklistPlaceholder: "One item per line"
  }
};

export type PipelineSuggestionTaskState = { card: PipelineCard; action: PipelineSuggestedAction } | null;

export function PipelineSuggestionTaskDialog({ state, locale, profileId, onClose, onCreated }: { state: PipelineSuggestionTaskState; locale: WorkflowLocale; profileId?: string; onClose: () => void; onCreated: () => void }) {
  const text = copy[locale];
  const [creating, setCreating] = useState(false);
  const boardsQuery = useQuery({ queryKey: ["tasks", "boards"], queryFn: workflowApi.tasks.boards, enabled: !!state });
  const boards = boardsQuery.data ?? [];
  const firstBoard = boards[0];
  const firstColumn = firstBoard?.columns?.[0];
  const initial = state ? suggestionToTaskDraft(state.action, { opportunityId: state.card.opportunityId, opportunityTitle: state.card.title, profileId, boardId: firstBoard?.id, statusColumnId: firstColumn?.id, locale }) : null;
  return <Modal open={!!state} onOpenChange={open => !open && !creating && onClose()} title={text.suggestionTitle} description={text.suggestionDescription} wide>
    {state && initial ? <PipelineSuggestionTaskForm key={`${state.card.opportunityId}:${state.action.key}:${firstBoard?.id ?? "new"}`} initial={initial} boards={boards} locale={locale} onClose={onClose} onCreated={onCreated} onPendingChange={setCreating} /> : null}
  </Modal>;
}

function PipelineSuggestionTaskForm({ initial, boards, locale, onClose, onCreated, onPendingChange }: { initial: ReturnType<typeof suggestionToTaskDraft>; boards: TaskBoard[]; locale: WorkflowLocale; onClose: () => void; onCreated: () => void; onPendingChange: (pending: boolean) => void }) {
  const text = copy[locale];
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const timezone = resolveCalendarTimeZone(user?.settings.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const directory = useMemo(() => userDirectory(undefined, user), [user]);
  const [boardId, setBoardId] = useState(initial.boardId ?? "");
  const [newBoardName, setNewBoardName] = useState("");
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [dueAt, setDueAt] = useState(isoToZonedDateTimeLocal(initial.dueAt, timezone));
  const [checklist, setChecklist] = useState((initial.checklist ?? []).map(item => item.text ?? item.title ?? "").filter(Boolean).join("\n"));
  const activeBoard = useMemo(() => boards.find(board => board.id === boardId) ?? null, [boards, boardId]);
  const participants = participantsForBoard(activeBoard, boardId, user?.id);
  const [assigneeId, setAssigneeId] = useState(() => defaultAssigneeId(boards.find(board => board.id === initial.boardId) ?? null, initial.boardId, user?.id));
  const [assigneeTouched, setAssigneeTouched] = useState(false);

  function changeBoard(nextBoardId: string) {
    const nextBoard = boards.find(board => board.id === nextBoardId) ?? null;
    const nextParticipants = participantsForBoard(nextBoard, nextBoardId, user?.id);
    setBoardId(nextBoardId);
    setAssigneeId(current => {
      if (!assigneeTouched) return defaultAssigneeId(nextBoard, nextBoardId, user?.id);
      return current && nextParticipants.includes(current) ? current : "";
    });
  }

  const createTask = useMutation({ mutationFn: async (values: SubmittedTaskForm) => {
    let targetBoardId = values.boardId;
    let targetColumnId = boards.find(board => board.id === targetBoardId)?.columns?.[0]?.id;
    if (!targetBoardId) {
      const board = await workflowApi.tasks.createBoard({ name: values.newBoardName || text.defaultBoardName, scope: "personal", columns: [{ id: "todo", name: text.defaultTodo, order: 10 }, { id: "doing", name: text.defaultDoing, order: 20 }, { id: "done", name: text.defaultDone, order: 30 }] });
      targetBoardId = board.id;
      targetColumnId = board.columns[0]?.id;
      setBoardId(board.id);
      queryClient.invalidateQueries({ queryKey: ["tasks", "boards"] });
    }
    const payload: CreateTaskPayload = {
      ...initial,
      boardId: targetBoardId,
      statusColumnId: targetColumnId ?? "todo",
      title: values.title,
      description: values.description,
      dueAt: localDateTimeToIso(values.dueAt, timezone),
      assigneeId: values.assigneeId || undefined,
      checklist: values.checklist.split("\n").map(item => item.trim()).filter(Boolean).map(text => ({ text }))
    };
    return workflowApi.tasks.create(payload);
  }, onMutate: () => onPendingChange(true), onSettled: () => onPendingChange(false), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); onCreated(); }, onError: () => undefined });

  return <form className="grid gap-3 md:grid-cols-2" onSubmit={event => {
    event.preventDefault();
    const values = submittedTaskForm(new FormData(event.currentTarget));
    if (values.title) createTask.mutate(values);
  }}>
    <label className="text-sm md:col-span-2"><span className="font-medium">{text.board}</span><select name="boardId" className={`${selectClass} mt-1 w-full`} value={boardId} onChange={event => changeBoard(event.target.value)}><option value="">{text.newBoard}</option>{boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}</select></label>
    {!boardId ? <label className="text-sm md:col-span-2"><span className="font-medium">{text.boardName}</span><Input name="newBoardName" className="mt-1" value={newBoardName} onChange={event => setNewBoardName(event.target.value)} placeholder={text.defaultBoardName} /></label> : null}
    <label className="text-sm md:col-span-2"><span className="font-medium">{text.titleField}</span><Input name="title" className="mt-1" value={title} onChange={event => setTitle(event.target.value)} /></label>
    <label className="text-sm"><span className="font-medium">{text.typeField}</span><Input className="mt-1" value={enumLabel(taskTypeLabels, initial.type, locale)} readOnly /></label>
    <label className="text-sm"><span className="font-medium">{text.dueAt}</span><Input name="dueAt" className="mt-1" type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} /></label>
    <label className="text-sm md:col-span-2"><span className="font-medium">{text.assignee}</span><select name="assigneeId" className={`${selectClass} mt-1 w-full`} value={assigneeId} onChange={event => { setAssigneeTouched(true); setAssigneeId(event.target.value); }}><option value="">{text.unassigned}</option>{participants.map(id => <option key={id} value={id}>{participantLabel(id, directory, user?.id, locale)}</option>)}</select></label>
    <label className="text-sm md:col-span-2"><span className="font-medium">{text.descriptionField}</span><Textarea name="description" className="mt-1" value={description} onChange={event => setDescription(event.target.value)} /></label>
    <label className="text-sm md:col-span-2"><span className="font-medium">{text.checklist}</span><Textarea name="checklist" className="mt-1" value={checklist} onChange={event => setChecklist(event.target.value)} placeholder={text.checklistPlaceholder} /></label>
    <div className="flex flex-wrap gap-2 md:col-span-2"><Button type="submit" disabled={!title.trim() || createTask.isPending} loading={createTask.isPending}><Plus className="size-4" />{text.submitTask}</Button><Button type="button" variant="outline" disabled={createTask.isPending} onClick={onClose}>{text.cancel}</Button>{createTask.isError ? <p className="text-sm text-destructive">{createTask.error.message || text.taskFailed}</p> : null}</div>
  </form>;
}

type SubmittedTaskForm = {
  boardId: string;
  newBoardName: string;
  title: string;
  description: string;
  dueAt: string;
  assigneeId: string;
  checklist: string;
};

function submittedTaskForm(formData: FormData): SubmittedTaskForm {
  return {
    boardId: String(formData.get("boardId") ?? "").trim(),
    newBoardName: String(formData.get("newBoardName") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    dueAt: String(formData.get("dueAt") ?? "").trim(),
    assigneeId: String(formData.get("assigneeId") ?? "").trim(),
    checklist: String(formData.get("checklist") ?? "")
  };
}

function localDateTimeToIso(value?: string, timezone?: string) {
  return zonedDateTimeLocalToIso(value, timezone) ?? (value ? new Date(value).toISOString() : undefined);
}

function participantsForBoard(board: TaskBoard | null, boardId?: string, userId?: string) {
  return boardId ? participantOptions(board, userId) : (userId ? [userId] : []);
}

function defaultAssigneeId(board: TaskBoard | null, boardId?: string, userId?: string) {
  if (!userId) return "";
  if (!boardId) return userId;
  if (!board) return "";
  return board.ownerUserId === userId || (board.members ?? []).includes(userId) ? userId : "";
}
