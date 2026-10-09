export type NotificationChannel = "inApp" | "email" | "telegram";
export type NotificationCategory = "opportunity" | "ai" | "workflow" | "collaboration" | "system" | "admin";

export type NotificationPreference = {
  inApp: boolean;
  email: boolean;
  telegram: boolean;
  digestMode: "instant" | "daily" | "weekly" | "digest";
  quietHours?: { start?: string; end?: string; timezone?: string } | null;
  eventChannels?: Partial<Record<NotificationCategory, Partial<Record<NotificationChannel, boolean>> & { mode?: "instant" | "digest" }>>;
};

export type UserSettingsPayload = {
  name?: string;
  email?: string;
  status?: string;
  telegram?: { linked: boolean };
  locale: "ru" | "en";
  timezone: string;
  mode: "light" | "dark" | "system";
  themePack: "intly-plum" | "forest-teal" | "warm-clay" | "graphite-copper";
  density: "compact" | "comfortable";
  reducedMotion: boolean;
  exportFormat: "csv" | "xlsx" | "json";
  quietHours?: { start?: string; end?: string; timezone?: string } | null;
};

export type ApiToken = {
  id: string;
  _id?: string;
  name: string;
  scopes: string[];
  tokenPrefix?: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
};

export type ApiTokenScope = "read:opportunities" | "read:profiles" | "read:responses" | "read:resumes" | "write:responses" | "write:resumes";

export type Webhook = {
  id: string;
  _id?: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type WebhookDelivery = {
  id: string;
  _id?: string;
  webhookId: string;
  event: string;
  status: "queued" | "sent" | "failed";
  statusCode?: number;
  errorSummary?: string;
  attempts: number;
  deliveredAt?: string;
  createdAt?: string;
};

export type WebhookEvent = "opportunity.created" | "opportunity.updated" | "response.submitted" | "resume.ready" | "notification.created" | "test";

export type AiPreferences = {
  language: "ru" | "en";
  userPrompt?: string;
  userPreferences: string;
  customPrompt: string;
  promptPreview?: {
    core: string;
    task: string;
    schema: string;
  };
};

export type DashboardSettings = {
  period: "today" | "7d" | "30d" | "90d" | "custom";
  widgets: string[];
};
