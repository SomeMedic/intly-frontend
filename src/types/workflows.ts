import type { ApiList } from "./api";
import type { OpportunityType, PipelineStage } from "./opportunity";

export type Watchlist = {
  id: string;
  name: string;
  profileId: string;
  filters: Record<string, unknown>;
  matchMin?: number | null;
  aiMin?: number | null;
  autoAiRules?: { enabled?: boolean; dailyMax?: number | null; rerunOnMaterialChange?: boolean };
  notificationPolicy?: Record<string, unknown>;
  exclusions?: Record<string, unknown>;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  totalHits?: number;
  lastHitAt?: string;
};

export type WatchlistHit = {
  id: string;
  watchlistId: string;
  opportunityId: string;
  matchScore: number;
  aiScore?: number;
  notificationState: string;
  autoAiState: string;
  matchedAt: string;
};

export type SavedView = {
  id: string;
  name: string;
  scope: "opportunities" | "vacancies" | "freelance" | "tenders" | string;
  query?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  sort?: Record<string, unknown>;
  mode?: "list" | "table" | "board" | string;
  visibleFields?: string[];
  columnState?: Record<string, unknown>;
  isDefault?: boolean;
  pinned?: boolean;
};

export type TaskType = "Task" | "Follow-up" | "Interview Prep" | "Application" | "Tender Step" | "Resume Update" | "Research";

export type TaskChecklistItem = { id?: string; text?: string; title?: string; done?: boolean; completed?: boolean };
export type TaskSubtask = { id?: string; title: string; completed?: boolean; assigneeId?: string };
export type TaskReminder = { id?: string; remindAt: string; channels: string[] };
export type TaskComment = { id: string; body: string; authorId?: string; authorEmail?: string; mentionUserIds?: string[]; createdAt?: string };

export type TaskItem = {
  id: string;
  boardId: string;
  title: string;
  description?: string;
  type: TaskType;
  statusColumnId: string;
  priority: string;
  assigneeId?: string;
  assigneeName?: string;
  reporterId?: string;
  dueAt?: string;
  opportunityId?: string;
  opportunityTitle?: string;
  profileId?: string;
  labels?: string[];
  subtasks?: TaskSubtask[];
  checklist?: TaskChecklistItem[];
  reminders?: TaskReminder[];
  comments?: TaskComment[];
  completedAt?: string;
};

export type TaskBoard = {
  id: string;
  name: string;
  ownerUserId?: string;
  scope?: string;
  members?: string[];
  columns: Array<{ id: string; name: string; order: number }>;
  tasks?: TaskItem[];
};

export type PipelineType = OpportunityType;

export type PipelineAttentionCode = "needs_attention" | "overdue" | "follow_up_due" | "deadline_urgent";
export type PipelineAttentionFilter = "all" | PipelineAttentionCode;
export type PipelineSuggestedActionKey = "follow_up" | "interview_prep" | "negotiation" | "project" | "application" | "submission_reminder" | "contracting";
export type PipelineSort = "recommended" | "freshness" | "score" | "deadline";

export type PipelineFilters = {
  sourceIds?: string[];
  minMatch?: number;
  minAiScore?: number;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  attention?: PipelineAttentionFilter;
  counterpart?: string;
  sort?: PipelineSort;
};

export type PipelineSuggestedAction = {
  key: PipelineSuggestedActionKey;
  title?: string;
  description?: string;
  dueAt?: string;
  checklist?: TaskChecklistItem[];
  taskType?: TaskType;
  priority?: string;
  boardId?: string;
};

export type PipelineCard = {
  id: string;
  opportunityId: string;
  profileId?: string;
  title: string;
  counterpart: string;
  money?: string;
  matchScore?: number | null;
  aiScore?: number | null;
  pipelineStatus: PipelineStage;
  attention?: PipelineAttentionCode[];
  attentionDetails?: Array<{ code: PipelineAttentionCode; label?: string; dueAt?: string }>;
  attentionCount?: number;
  dueAt?: string;
  sourceId?: string;
  sourceName?: string;
  tags?: string[];
  firstSeenAt?: string;
  publishedAt?: string;
  suggestedActions?: PipelineSuggestedAction[];
  favorite?: boolean;
  archived?: boolean;
  hidden?: boolean;
  closed?: boolean;
  rawOpportunity?: Record<string, unknown> | null;
};

export type PipelineBoardItem = {
  state: { id: string; opportunityId: string; profileId: string; pipelineStatus: PipelineStage; matchScore?: number | null; aiScore?: number | null; attention?: PipelineAttentionCode[]; attentionCount?: number; dueAt?: string; suggestedActions?: Array<PipelineSuggestedAction | PipelineSuggestedActionKey>; tags?: string[]; favorite?: boolean; isFavorite?: boolean; archived?: boolean; hidden?: boolean };
  opportunity: Record<string, unknown> | null;
  attention?: PipelineAttentionCode[];
  dueAt?: string;
  suggestedActions?: Array<PipelineSuggestedAction | PipelineSuggestedActionKey>;
  aiScore?: number | null;
};

export type PipelineBoard = {
  type?: PipelineType;
  profileId?: string;
  columns: Array<{
    status: PipelineStage;
    attentionCount?: number;
    items: PipelineBoardItem[];
  }>;
};

export type CalendarEvent = {
  id: string;
  type: string;
  title: string;
  startAt: string;
  endAt?: string;
  opportunityId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
  reminders?: Array<Record<string, unknown>>;
};

export type SearchResult = {
  id: string;
  type: "opportunity" | "task" | "profile" | "watchlist" | "knowledge" | string;
  title: string;
  subtitle?: string;
  href: string;
  score?: number;
  preview?: Record<string, unknown>;
};

export type NotificationFilter = "all" | "unread" | "system" | "opportunities" | "tasks" | "archived";

export type NotificationItem = {
  id: string;
  type?: string;
  category?: "opportunity" | "ai" | "workflow" | "collaboration" | "system" | "admin" | "Opportunity" | "AI" | "Workflow" | "Collaboration" | "System" | "Admin" | string;
  title: string;
  body: string;
  readAt?: string;
  read?: boolean;
  archived?: boolean;
  archivedAt?: string;
  createdAt: string;
  data?: Record<string, unknown> & {
    fileId?: string;
    filename?: string;
    opportunityId?: string;
    taskId?: string;
    resumeAdaptationId?: string;
  };
  href?: string;
};

export type NotificationCounts = Record<NotificationFilter, number>;

export type NotificationListResponse = ApiList<NotificationItem> & {
  total: number;
  counts: NotificationCounts;
};
