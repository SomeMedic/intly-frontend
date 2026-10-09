import type { OpportunityMini } from "./opportunity";
import type { ProfileSummary } from "./profile";

export type DashboardPeriod = "today" | "7d" | "30d" | "90d" | "custom";

export type KpiMetric = {
  id: string;
  label: string;
  value: string;
  delta?: string;
  intent?: "neutral" | "success" | "warning" | "danger";
  sparkline?: number[];
};

export type SystemHealth = {
  status: "operational" | "degraded" | "issue" | "unknown";
  label: string;
  activeSources: number;
  failedSources: number;
  lastSyncAt?: string;
};

export type DashboardTask = {
  id?: string;
  _id?: string;
  title?: string;
  dueAt?: string;
  priority?: string;
  statusColumnId?: string;
  opportunityId?: string;
};

export type DashboardEvent = {
  id?: string;
  _id?: string;
  title?: string;
  type?: string;
  startAt?: string;
  endAt?: string;
  opportunityId?: string;
  taskId?: string;
};

export type DashboardSummary = {
  userName: string;
  activeProfile: ProfileSummary | null;
  profiles: ProfileSummary[];
  period: DashboardPeriod;
  statusLine: string;
  kpis: KpiMetric[];
  recommended: OpportunityMini[];
  watchlistHits: OpportunityMini[];
  recentlyAdded: OpportunityMini[];
  tasks?: DashboardTask[];
  events?: DashboardEvent[];
  systemHealth: SystemHealth;
  notificationsUnread: number;
};
