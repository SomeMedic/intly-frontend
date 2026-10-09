"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import enLocale from "@fullcalendar/core/locales/en-gb";
import ruLocale from "@fullcalendar/core/locales/ru";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, LinkIcon, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth";
import type { CalendarEvent, TaskItem } from "@/types";
import { workflowApi } from "../api/workflow-api";
import { QueryState, ScreenScaffold } from "./ScreenScaffold";
import { formatDateTimeInTimeZone, isoToZonedCalendarDateTime, isoToZonedDateTimeLocal, resolveCalendarTimeZone, toDateInputInTimeZone, toDateTimeLocalInput, zonedDateTimeLocalToIso } from "./calendar-time";
import { countLabel, enumLabel, eventTypeLabels, priorityLabels, resolveWorkflowLocale, taskTypeLabels, type WorkflowLocale } from "./workflow-labels";

const eventTypes = ["follow_up", "interview", "technical_interview", "call", "application_deadline", "tender_deadline", "freelance_deadline"];
const selectClass = "h-[var(--control-height)] rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export function CalendarScreen() {
  const { user } = useAuth();
  const locale = resolveWorkflowLocale(user?.settings.locale);
  const timezone = resolveCalendarTimeZone(user?.settings.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [anchor, setAnchor] = useState(() => toDateInputInTimeZone(new Date(), timezone));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", type: "follow_up", startAt: isoToZonedDateTimeLocal(new Date(), timezone), endAt: "", notes: "", taskId: "" });
  const queryClient = useQueryClient();
  const range = useMemo(() => {
    const start = new Date(`${anchor}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 45);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [anchor]);

  const query = useQuery({ queryKey: ["calendar", range.start, range.end], queryFn: () => workflowApi.calendar.events(range.start, range.end) });
  const boards = useQuery({ queryKey: ["tasks", "boards"], queryFn: workflowApi.tasks.boards });
  const tasksQuery = useQuery({ queryKey: ["tasks", "calendar-linkable"], queryFn: () => workflowApi.tasks.list() });
  const create = useMutation({ mutationFn: workflowApi.calendar.create, onSuccess: () => { setDraft((value) => ({ ...value, title: "", notes: "" })); setCreateOpen(false); invalidateCalendar(queryClient); } });
  const updateEvent = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof workflowApi.calendar.update>[1] }) => workflowApi.calendar.update(id, patch), onSuccess: () => invalidateCalendar(queryClient) });
  const updateTaskDue = useMutation({ mutationFn: ({ id, dueAt }: { id: string; dueAt: string }) => workflowApi.tasks.update(id, { dueAt }), onSuccess: () => invalidateCalendar(queryClient) });
  const remove = useMutation({ mutationFn: workflowApi.calendar.remove, onSuccess: () => { setSelectedEventId(null); invalidateCalendar(queryClient); } });

  const events = query.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const fullCalendarEvents = events.map((event) => {
    const derived = Boolean(event.metadata?.derived) || event.id.startsWith("task:");
    const deadline = event.type.includes("deadline");
    return {
      id: event.id,
      title: event.title,
      start: isoToZonedCalendarDateTime(event.startAt, timezone),
      end: deadline ? undefined : isoToZonedCalendarDateTime(event.endAt, timezone),
      allDay: false,
      extendedProps: { type: event.type, derived, taskId: event.taskId, opportunityId: event.opportunityId },
      className: derived ? "intly-derived-event" : deadline ? "intly-deadline-event" : ""
    };
  });

  function createFromDraft() {
    if (!draft.title.trim() || !draft.startAt) return;
    create.mutate({
      title: draft.title.trim(),
      type: draft.type,
      startAt: zonedDateTimeLocalToIso(draft.startAt, timezone) ?? new Date(draft.startAt).toISOString(),
      endAt: zonedDateTimeLocalToIso(draft.endAt, timezone),
      taskId: draft.taskId || undefined,
      metadata: draft.notes ? { notes: draft.notes } : {},
      reminders: [{ offsetMinutes: 60, channels: ["inApp"] }]
    });
  }

  function onDateClick(arg: DateClickArg) {
    setDraft((value) => ({ ...value, startAt: toDateTimeLocalInput(arg.date) }));
    setCreateOpen(true);
  }

  function onEventDrop(arg: EventDropArg) {
    const startAt = arg.event.start ? zonedDateTimeLocalToIso(toDateTimeLocalInput(arg.event.start), timezone) : undefined;
    if (!startAt) return arg.revert();
    const taskId = String(arg.event.extendedProps.taskId ?? "");
    if (arg.event.extendedProps.derived) {
      const rawTaskId = taskId || arg.event.id.replace("task:", "");
      if (!rawTaskId) return arg.revert();
      updateTaskDue.mutate({ id: rawTaskId, dueAt: startAt }, { onError: () => arg.revert() });
      return;
    }
    updateEvent.mutate({ id: arg.event.id, patch: { startAt, endAt: arg.event.end ? zonedDateTimeLocalToIso(toDateTimeLocalInput(arg.event.end), timezone) : undefined } }, { onError: () => arg.revert() });
  }

  function onEventClick(arg: EventClickArg) {
    setSelectedEventId(arg.event.id);
  }

  return (
    <ScreenScaffold artwork="workflow" title={locale === "en" ? "Calendar" : "Календарь"} description={locale === "en" ? "Tasks, interviews, calls, follow-ups and INTLY deadlines in one schedule." : "Задачи, интервью, звонки, follow-up и дедлайны INTLY в одном расписании."}>
      <div className="mb-4 rounded-lg border bg-card p-3">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="min-w-0 space-y-1 text-sm">
            <span className="font-medium">{locale === "en" ? "Range start" : "Начало диапазона"}</span>
            <Input type="date" value={anchor} onChange={(event) => setAnchor(event.target.value)} />
          </label>
          <div className="min-w-0 flex-1 rounded-md border bg-background/70 p-3 text-sm text-muted-foreground">
            {locale === "en" ? "Timezone" : "Часовой пояс"}: <span className="font-medium text-foreground">{timezone}</span>. {locale === "en" ? "Task due dates can be dragged in the calendar; the change is saved back to the task." : "Сроки задач можно перетаскивать в календаре; изменение сохранится в задаче."}
          </div>
          <Button onClick={() => setCreateOpen(true)}><CalendarPlus className="size-4" />{locale === "en" ? "Event" : "Событие"}</Button>
        </div>
      </div>
      <QueryState isLoading={query.isLoading} isError={query.isError} isEmpty={false} emptyTitle={locale === "en" ? "No events" : "Нет событий"} onRetry={() => query.refetch()}>
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="min-w-0 rounded-lg border bg-card p-3 text-sm [&_.fc]:!text-foreground [&_.fc-theme-standard_.fc-scrollgrid]:!border-border [&_.fc-theme-standard_td]:!border-border [&_.fc-theme-standard_th]:!border-border [&_.fc-col-header-cell]:!bg-muted [&_.fc-col-header-cell-cushion]:!text-foreground [&_.fc-daygrid-day]:!bg-card [&_.fc-timegrid-slot]:!bg-card [&_.fc-timegrid-axis]:!bg-card [&_.fc-list-day-cushion]:!bg-muted [&_.fc-button]:rounded-md [&_.fc-button]:border [&_.fc-button]:px-2 [&_.fc-button]:py-1 [&_.fc-button-primary]:!border-border [&_.fc-button-primary]:!bg-card [&_.fc-button-primary]:!text-foreground [&_.fc-button-primary:hover]:!bg-muted [&_.fc-button-primary.fc-button-active]:!border-primary [&_.fc-button-primary.fc-button-active]:!bg-primary [&_.fc-button-primary.fc-button-active]:!text-primary-foreground [&_.fc-day-today]:!bg-primary/10 [&_.fc-daygrid-event]:!border-primary [&_.fc-daygrid-event]:!bg-primary/10 [&_.fc-event-main]:!text-foreground [&_.fc-event-title]:text-foreground [&_.fc-toolbar-title]:!text-base [&_.fc-header-toolbar]:flex-wrap [&_.fc-header-toolbar]:gap-2 [&_.fc-toolbar-chunk]:shrink-0 [&_.fc-toolbar-chunk:nth-child(2)]:order-first [&_.fc-toolbar-chunk:nth-child(2)]:w-full [&_.fc-toolbar-chunk:nth-child(2)]:text-center sm:[&_.fc-toolbar-chunk:nth-child(2)]:order-none sm:[&_.fc-toolbar-chunk:nth-child(2)]:w-auto [&_.fc-toolbar-title]:font-semibold [&_.intly-deadline-event]:!border-warning [&_.intly-deadline-event]:!bg-warning/15 [&_.intly-derived-event]:!border-ai [&_.intly-derived-event]:!bg-ai/10">
            <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} locale={locale === "en" ? enLocale : ruLocale} timeZone="local" initialView="dayGridMonth" headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }} events={fullCalendarEvents} editable eventDurationEditable={false} dateClick={onDateClick} eventDrop={onEventDrop} eventClick={onEventClick} height="auto" />
          </section>
          <aside className="min-w-0 space-y-2">
            <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
              {locale === "en" ? `${countLabel(events.length, ["событие", "события", "событий"], "event", "events", locale)} loaded. Task boards: ${boards.data?.length ?? "…"}. Overdue and completed tasks are managed on the Tasks page.` : `Загружено событий: ${events.length}. Досок задач: ${boards.data?.length ?? "…"}. Просроченные и завершённые задачи управляются на странице задач.`}
            </div>
            {events.map((event) => <CalendarEventCard key={event.id} event={event} timezone={timezone} locale={locale} onOpen={() => setSelectedEventId(event.id)} />)}
          </aside>
        </div>
      </QueryState>
      <Modal open={createOpen} onOpenChange={setCreateOpen} title={locale === "en" ? "New event" : "Новое событие"} description={locale === "en" ? `Time is saved for ${timezone}.` : `Время сохраняется для ${timezone}.`} wide>
        <form className="grid min-w-0 gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); createFromDraft(); }}>
          <label className="space-y-1 text-sm md:col-span-2"><span className="font-medium">{locale === "en" ? "Title" : "Название"}</span><Input value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} placeholder={locale === "en" ? "Event title" : "Название события"} /></label>
          <label className="space-y-1 text-sm"><span className="font-medium">{locale === "en" ? "Type" : "Тип"}</span><select className={`${selectClass} w-full`} value={draft.type} onChange={(event) => setDraft((value) => ({ ...value, type: event.target.value }))}>{eventTypes.map((type) => <option key={type} value={type}>{enumLabel(eventTypeLabels, type, locale)}</option>)}</select></label>
          <label className="space-y-1 text-sm"><span className="font-medium">{locale === "en" ? "Linked task" : "Связанная задача"}</span><select className={`${selectClass} w-full`} value={draft.taskId} onChange={(event) => setDraft((value) => ({ ...value, taskId: event.target.value }))}><option value="">{locale === "en" ? "No linked task" : "Без связанной задачи"}</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
          <label className="space-y-1 text-sm"><span className="font-medium">{locale === "en" ? "Start" : "Начало"}</span><Input type="datetime-local" value={draft.startAt} onChange={(event) => setDraft((value) => ({ ...value, startAt: event.target.value }))} /></label>
          <label className="space-y-1 text-sm"><span className="font-medium">{locale === "en" ? "End" : "Окончание"}</span><Input type="datetime-local" value={draft.endAt} onChange={(event) => setDraft((value) => ({ ...value, endAt: event.target.value }))} /></label>
          <label className="space-y-1 text-sm md:col-span-2"><span className="font-medium">{locale === "en" ? "Notes" : "Заметки"}</span><Textarea className="min-h-20" value={draft.notes} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} placeholder={locale === "en" ? "Notes" : "Заметки"} /></label>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <Button type="submit" loading={create.isPending} disabled={!draft.title.trim() || !draft.startAt}><CalendarPlus className="size-4" />{locale === "en" ? "Add event" : "Добавить событие"}</Button>
            {create.isError ? <p className="text-sm text-destructive">{create.error.message}</p> : null}
          </div>
        </form>
      </Modal>
      {selectedEvent ? (
        <EventDrawer
          key={selectedEvent.id}
          event={selectedEvent}
          tasks={tasks}
          timezone={timezone}
          locale={locale}
          onClose={() => setSelectedEventId(null)}
          onSave={(id, patch) => updateEvent.mutate({ id, patch })}
          saving={updateEvent.isPending || updateTaskDue.isPending}
          onDelete={(id) => remove.mutate(id)}
          deleting={remove.isPending}
          onTaskDueChange={(id, dueAt) => updateTaskDue.mutate({ id, dueAt })}
        />
      ) : null}
    </ScreenScaffold>
  );
}

function invalidateCalendar(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["calendar"] });
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
}

function CalendarEventCard({ event, timezone, locale, onOpen }: { event: CalendarEvent; timezone: string; locale: WorkflowLocale; onOpen: () => void }) {
  const derived = Boolean(event.metadata?.derived) || event.id.startsWith("task:");
  return (
    <button type="button" onClick={onOpen} className="block w-full rounded-lg border bg-card p-3 text-left transition hover:border-primary/45">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><h2 className="truncate font-semibold">{event.title}</h2><p className="mt-1 text-xs text-muted-foreground">{formatDateTimeInTimeZone(event.startAt, timezone, locale)} {event.endAt ? `— ${formatDateTimeInTimeZone(event.endAt, timezone, locale)}` : ""}</p></div>
        <Badge intent={derived ? "ai" : event.type.includes("deadline") ? "warning" : "primary"}>{enumLabel(eventTypeLabels, event.type, locale)}</Badge>
      </div>
      {event.taskId ? <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><LinkIcon className="size-3" />{locale === "en" ? "Linked to task" : "Связано с задачей"}</p> : null}
    </button>
  );
}

function EventDrawer({ event, tasks, timezone, locale, onClose, onSave, saving, onDelete, deleting, onTaskDueChange }: { event: CalendarEvent; tasks: TaskItem[]; timezone: string; locale: WorkflowLocale; onClose: () => void; onSave: (id: string, patch: Parameters<typeof workflowApi.calendar.update>[1]) => void; saving: boolean; onDelete: (id: string) => void; deleting: boolean; onTaskDueChange: (id: string, dueAt: string) => void }) {
  const derived = Boolean(event.metadata?.derived) || event.id.startsWith("task:");
  const taskId = event.taskId || (event.id.startsWith("task:") ? event.id.replace("task:", "") : "");
  const linkedTask = tasks.find((task) => task.id === taskId);
  const [title, setTitle] = useState(event.title);
  const [type, setType] = useState(event.type);
  const [startAt, setStartAt] = useState(isoToZonedDateTimeLocal(event.startAt, timezone));
  const [endAt, setEndAt] = useState(isoToZonedDateTimeLocal(event.endAt ?? "", timezone));
  const [notes, setNotes] = useState(typeof event.metadata?.notes === "string" ? event.metadata.notes : "");
  const [selectedTaskId, setSelectedTaskId] = useState(taskId);

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} title={derived ? locale === "en" ? "Task due date" : "Срок задачи" : locale === "en" ? "Calendar event" : "Событие календаря"} description={derived ? locale === "en" ? "This event comes from the task due date. Changing it saves the due date back to the task." : "Это событие создано из срока задачи. Изменение срока сохранится в задаче." : locale === "en" ? "Edit the event and task link." : "Редактирование события и связи с задачей."} placement="drawer">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border bg-background/60 p-4">
          <label className="space-y-1 text-sm"><span className="font-medium">{locale === "en" ? "Title" : "Название"}</span><Input value={title} onChange={(event) => setTitle(event.target.value)} disabled={derived} /></label>
          <label className="space-y-1 text-sm"><span className="font-medium">{locale === "en" ? "Type" : "Тип"}</span><select className={`${selectClass} w-full`} value={type} onChange={(event) => setType(event.target.value)} disabled={derived}>{eventTypes.map((item) => <option key={item} value={item}>{enumLabel(eventTypeLabels, item, locale)}</option>)}</select></label>
          <label className="space-y-1 text-sm"><span className="font-medium">{locale === "en" ? "Start / due date" : "Начало / срок"}</span><Input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>
          {!derived ? <label className="space-y-1 text-sm"><span className="font-medium">{locale === "en" ? "End" : "Окончание"}</span><Input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label> : null}
          {!derived ? <label className="space-y-1 text-sm"><span className="font-medium">{locale === "en" ? "Linked task" : "Связанная задача"}</span><select className={`${selectClass} w-full`} value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}><option value="">{locale === "en" ? "No link" : "Без связи"}</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label> : null}
          {!derived ? <label className="space-y-1 text-sm"><span className="font-medium">{locale === "en" ? "Notes" : "Заметки"}</span><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label> : null}
          <div className="flex flex-wrap gap-2">
            <Button loading={saving} disabled={!startAt || (!derived && !title.trim())} onClick={() => {
              if (derived && taskId) {
                const dueAt = zonedDateTimeLocalToIso(startAt, timezone);
                if (dueAt) onTaskDueChange(taskId, dueAt);
                return;
              }
              onSave(event.id, { title: title.trim(), type, startAt: zonedDateTimeLocalToIso(startAt, timezone), endAt: zonedDateTimeLocalToIso(endAt, timezone), taskId: selectedTaskId || undefined, metadata: notes ? { ...event.metadata, notes } : event.metadata });
            }}>{locale === "en" ? "Save" : "Сохранить"}</Button>
            {!derived ? <Button variant="danger" loading={deleting} onClick={() => onDelete(event.id)}><Trash2 className="size-4" />{locale === "en" ? "Delete" : "Удалить"}</Button> : null}
          </div>
        </section>
        <aside className="space-y-3 rounded-lg border bg-card p-4">
          <h3 className="font-semibold">{locale === "en" ? "Context" : "Контекст"}</h3>
          {linkedTask ? <div className="rounded-md border bg-background/70 p-3 text-sm"><p className="font-medium">{linkedTask.title}</p><p className="mt-1 text-muted-foreground">{enumLabel(taskTypeLabels, linkedTask.type, locale)} · {enumLabel(priorityLabels, linkedTask.priority, locale)}</p>{linkedTask.dueAt ? <p className="mt-1 text-muted-foreground">{locale === "en" ? "Due" : "Срок"}: {formatDateTimeInTimeZone(linkedTask.dueAt, timezone, locale)}</p> : null}</div> : <p className="text-sm text-muted-foreground">{locale === "en" ? "No linked task is selected or available in the current list." : "Связанная задача не выбрана или недоступна в текущем списке."}</p>}
          {event.opportunityId ? <p className="text-sm text-muted-foreground">Opportunity ID: {event.opportunityId}</p> : null}
          {event.reminders?.length ? <div className="text-sm text-muted-foreground"><p className="font-medium text-foreground">Напоминания</p>{event.reminders.map((reminder, index) => <p key={index}>{JSON.stringify(reminder)}</p>)}</div> : null}
        </aside>
      </div>
    </Modal>
  );
}
