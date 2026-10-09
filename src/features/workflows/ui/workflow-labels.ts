import type { AdminUser, CurrentUser, TaskBoard, TaskItem, TaskType } from "@/types";

export type WorkflowLocale = "ru" | "en";

export const localeTags: Record<WorkflowLocale, string> = {
  ru: "ru-RU",
  en: "en-US"
};

export function resolveWorkflowLocale(locale?: string | null): WorkflowLocale {
  return locale === "en" ? "en" : "ru";
}

export const taskTypeLabels: Record<WorkflowLocale, Record<TaskType, string>> = {
  ru: {
    Task: "Задача",
    "Follow-up": "Напомнить о себе",
    "Interview Prep": "Подготовка к интервью",
    Application: "Отклик",
    "Tender Step": "Шаг тендера",
    "Resume Update": "Обновить резюме",
    Research: "Исследование"
  },
  en: {
    Task: "Task",
    "Follow-up": "Follow-up",
    "Interview Prep": "Interview prep",
    Application: "Application",
    "Tender Step": "Tender step",
    "Resume Update": "Resume update",
    Research: "Research"
  }
};

export const priorityLabels: Record<WorkflowLocale, Record<string, string>> = {
  ru: {
    low: "Низкий",
    normal: "Обычный",
    high: "Высокий",
    urgent: "Срочный"
  },
  en: {
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent"
  }
};

export const eventTypeLabels: Record<WorkflowLocale, Record<string, string>> = {
  ru: {
    follow_up: "Напомнить о себе",
    interview: "Интервью",
    technical_interview: "Техническое интервью",
    call: "Звонок",
    application_deadline: "Дедлайн отклика",
    tender_deadline: "Дедлайн тендера",
    freelance_deadline: "Срок проекта",
    task_due: "Срок задачи"
  },
  en: {
    follow_up: "Follow-up",
    interview: "Interview",
    technical_interview: "Technical interview",
    call: "Call",
    application_deadline: "Application deadline",
    tender_deadline: "Tender deadline",
    freelance_deadline: "Project deadline",
    task_due: "Task due"
  }
};

export const boardScopeLabels: Record<WorkflowLocale, Record<string, string>> = {
  ru: {
    personal: "Личная",
    team: "Команда",
    admin: "Админ"
  },
  en: {
    personal: "Personal",
    team: "Team",
    admin: "Admin"
  }
};

export const pipelineStageLabels: Record<WorkflowLocale, Record<string, string>> = {
  ru: {
    New: "Новые",
    Reviewed: "Просмотрено",
    Interested: "Интересно",
    Applied: "Отклик отправлен",
    HRReply: "Ответ HR",
    Interview: "Интервью",
    TechnicalInterview: "Техническое интервью",
    Offer: "Оффер",
    Rejected: "Отклонено",
    Archived: "Архив",
    ResponseSent: "Предложение отправлено",
    ClientReplied: "Ответ клиента",
    Negotiation: "Переговоры",
    Won: "Выиграно",
    InProgress: "В работе",
    Completed: "Завершено",
    Lost: "Проиграно",
    PreparingApplication: "Готовим заявку",
    ApplicationSubmitted: "Заявка подана",
    Admitted: "Допущены",
    BiddingEvaluation: "Торги / оценка",
    Contracting: "Контрактование"
  },
  en: {
    New: "New",
    Reviewed: "Reviewed",
    Interested: "Interested",
    Applied: "Applied",
    HRReply: "HR reply",
    Interview: "Interview",
    TechnicalInterview: "Technical interview",
    Offer: "Offer",
    Rejected: "Rejected",
    Archived: "Archived",
    ResponseSent: "Response sent",
    ClientReplied: "Client replied",
    Negotiation: "Negotiation",
    Won: "Won",
    InProgress: "In progress",
    Completed: "Completed",
    Lost: "Lost",
    PreparingApplication: "Preparing application",
    ApplicationSubmitted: "Application submitted",
    Admitted: "Admitted",
    BiddingEvaluation: "Bidding / evaluation",
    Contracting: "Contracting"
  }
};

export const pipelineTypeLabels: Record<WorkflowLocale, Record<string, string>> = {
  ru: {
    vacancy: "Вакансии",
    freelance: "Проекты",
    tender: "Тендеры"
  },
  en: {
    vacancy: "Vacancies",
    freelance: "Project",
    tender: "Tenders"
  }
};

export const searchTypeLabels: Record<WorkflowLocale, Record<string, string>> = {
  ru: {
    opportunity: "Возможность",
    opportunities: "Возможности",
    task: "Задача",
    tasks: "Задачи",
    profile: "Профиль",
    profiles: "Профили",
    watchlist: "Автопоиск",
    watchlists: "Автопоиск",
    saved_view: "Сохранённый поиск",
    savedViews: "Сохранённые поиски",
    knowledge: "База знаний"
  },
  en: {
    opportunity: "Opportunity",
    opportunities: "Opportunities",
    task: "Task",
    tasks: "Tasks",
    profile: "Profile",
    profiles: "Profiles",
    watchlist: "Autosearch",
    watchlists: "Autosearch",
    saved_view: "Saved search",
    savedViews: "Saved searches",
    knowledge: "Knowledge"
  }
};

export const notificationCategoryLabels: Record<WorkflowLocale, Record<string, string>> = {
  ru: {
    opportunity: "Возможности",
    ai: "AI",
    workflow: "Работа",
    collaboration: "Совместная работа",
    system: "Система",
    admin: "Админ",
    Opportunity: "Возможности",
    AI: "AI",
    Workflow: "Работа",
    Collaboration: "Совместная работа",
    System: "Система",
    Admin: "Админ"
  },
  en: {
    opportunity: "Opportunities",
    ai: "AI",
    workflow: "Work",
    collaboration: "Collaboration",
    system: "System",
    admin: "Admin",
    Opportunity: "Opportunities",
    AI: "AI",
    Workflow: "Work",
    Collaboration: "Collaboration",
    System: "System",
    Admin: "Admin"
  }
};

export const notificationFilterLabels: Record<WorkflowLocale, Record<string, string>> = {
  ru: {
    all: "Все",
    unread: "Новые",
    system: "Система",
    opportunities: "Возможности",
    tasks: "Задачи",
    archived: "Архив"
  },
  en: {
    all: "All",
    unread: "Unread",
    system: "System",
    opportunities: "Opportunities",
    tasks: "Tasks",
    archived: "Archived"
  }
};

export const notificationKindLabels: Record<WorkflowLocale, Record<string, string>> = {
  ru: {
    system: "Система",
    opportunity: "Возможность",
    task: "Задача",
    workflow: "Работа"
  },
  en: {
    system: "System",
    opportunity: "Opportunity",
    task: "Task",
    workflow: "Work"
  }
};

export function enumLabel(
  labels: Record<WorkflowLocale, Record<string, string>> | Record<string, string>,
  value?: string,
  locale: WorkflowLocale = "ru"
) {
  if (!value) return "";
  const localized =
    "ru" in labels || "en" in labels
      ? (labels as Record<WorkflowLocale, Record<string, string>>)[locale]
      : (labels as Record<string, string>);
  return localized?.[value] ?? value;
}

export function formatWorkflowDateTime(
  value?: string | Date | null,
  locale: WorkflowLocale = "ru",
  timeZone?: string
) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(+date)) return "";
  return new Intl.DateTimeFormat(localeTags[locale], {
    timeZone,
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function formatWorkflowNumber(value: number, locale: WorkflowLocale = "ru") {
  return new Intl.NumberFormat(localeTags[locale], { maximumFractionDigits: 1 }).format(value);
}

export function countLabel(
  count: number,
  ruForms: [string, string, string],
  enSingular: string,
  enPlural = `${enSingular}s`,
  locale: WorkflowLocale = "ru"
) {
  if (locale === "en")
    return `${formatWorkflowNumber(count, locale)} ${count === 1 ? enSingular : enPlural}`;
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  const form =
    mod10 === 1 && mod100 !== 11
      ? ruForms[0]
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? ruForms[1]
        : ruForms[2];
  return `${formatWorkflowNumber(count, locale)} ${form}`;
}

export type DirectoryUser = Pick<AdminUser, "id" | "_id" | "name" | "email">;

export function userDirectory(users?: DirectoryUser[], currentUser?: CurrentUser | null) {
  const map = new Map<string, string>();
  if (currentUser?.id)
    map.set(currentUser.id, currentUser.name || currentUser.email || currentUser.id);
  for (const user of users ?? []) {
    const id = user.id ?? user._id;
    if (!id) continue;
    map.set(id, user.name || user.email || id);
  }
  return map;
}

export function participantOptions(board: TaskBoard | null, userId?: string) {
  return Array.from(
    new Set([userId, board?.ownerUserId, ...(board?.members ?? [])].filter(Boolean) as string[])
  );
}

export function participantLabel(
  id: string,
  directory: Map<string, string>,
  currentUserId?: string,
  locale: WorkflowLocale = "ru"
) {
  if (id === currentUserId) return locale === "en" ? "Me" : "Я";
  return directory.get(id) ?? (locale === "en" ? "Board member" : "Участник доски");
}

export function assigneeLabel(
  task: Pick<TaskItem, "assigneeId" | "assigneeName">,
  directory: Map<string, string>,
  currentUserId?: string,
  locale: WorkflowLocale = "ru"
) {
  if (!task.assigneeId) return "";
  if (task.assigneeName) return task.assigneeName;
  if (task.assigneeId === currentUserId) return locale === "en" ? "Me" : "Я";
  return directory.get(task.assigneeId) ?? (locale === "en" ? "Assigned" : "Назначена");
}
