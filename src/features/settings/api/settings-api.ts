import { api } from "@/services/api";
import type { AiPreferences, ApiList, ApiToken, ApiTokenScope, DashboardSettings, NotificationPreference, UserSettingsPayload, Webhook, WebhookDelivery, WebhookEvent } from "@/types";
import { buildApiTokenCreatePayload } from "./settings-form";

type BackendSettings = {
  name?: string;
  email?: string;
  status?: string;
  locale?: "ru" | "en";
  timezone?: string;
  uiSettings?: { theme?: "light" | "dark" | "system"; themePack?: UserSettingsPayload["themePack"]; density?: "compact" | "comfortable"; reducedMotion?: boolean; dashboard?: Partial<DashboardSettings>; exportDefaults?: { format?: UserSettingsPayload["exportFormat"] } };
  notificationSettings?: NotificationPreference;
  aiPreferences?: Partial<AiPreferences>;
  telegram?: { linked: boolean };
};

function normalizeSettings(settings: BackendSettings): UserSettingsPayload {
  return {
    name: settings.name,
    email: settings.email,
    status: settings.status,
    locale: settings.locale ?? "ru",
    timezone: settings.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    mode: settings.uiSettings?.theme ?? "system",
    themePack: settings.uiSettings?.themePack ?? "intly-plum",
    density: settings.uiSettings?.density ?? "comfortable",
    reducedMotion: settings.uiSettings?.reducedMotion ?? false,
    exportFormat: settings.uiSettings?.exportDefaults?.format ?? "csv",
    quietHours: settings.notificationSettings?.quietHours,
    telegram: settings.telegram ?? { linked: false }
  };
}

async function toSettingsPatch(body: Partial<UserSettingsPayload>) {
  return {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.locale !== undefined ? { locale: body.locale } : {}),
    ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
    ...(body.mode !== undefined || body.themePack !== undefined || body.density !== undefined || body.reducedMotion !== undefined || body.exportFormat !== undefined ? { uiSettings: { ...(body.mode !== undefined ? { theme: body.mode } : {}), ...(body.themePack !== undefined ? { themePack: body.themePack } : {}), ...(body.density !== undefined ? { density: body.density } : {}), ...(body.reducedMotion !== undefined ? { reducedMotion: body.reducedMotion } : {}), ...(body.exportFormat !== undefined ? { exportDefaults: { format: body.exportFormat } } : {}) } } : {})
  };
}


const defaultDashboardSettings: DashboardSettings = { period: "7d", widgets: ["recommended", "watchlistHits", "recentlyAdded", "tasks", "events", "profile", "health"] };

function normalizeDashboard(input: Partial<DashboardSettings> | undefined): DashboardSettings {
  const period = ["today", "7d", "30d", "90d", "custom"].includes(String(input?.period)) ? input?.period as DashboardSettings["period"] : defaultDashboardSettings.period;
  const widgets = Array.isArray(input?.widgets) && input.widgets.every((item) => typeof item === "string") ? input.widgets : defaultDashboardSettings.widgets;
  return { period, widgets };
}

function normalizeNotifications(settings?: NotificationPreference): NotificationPreference {
  return {
    inApp: settings?.inApp ?? true,
    email: settings?.email ?? false,
    telegram: settings?.telegram ?? false,
    digestMode: settings?.digestMode ?? "instant",
    quietHours: settings?.quietHours ?? null,
    eventChannels: settings?.eventChannels ?? {}
  };
}

function normalizeAi(input: Partial<AiPreferences> | undefined): AiPreferences {
  return { language: input?.language ?? "ru", userPrompt: input?.userPrompt, userPreferences: input?.userPreferences ?? "", customPrompt: input?.customPrompt ?? input?.userPrompt ?? "", promptPreview: input?.promptPreview };
}

function toAiPatch(body: Partial<AiPreferences>) {
  return {
    ...(body.language !== undefined ? { language: body.language } : {}),
    ...(body.userPreferences !== undefined ? { userPreferences: body.userPreferences } : {}),
    ...(body.customPrompt !== undefined ? { customPrompt: body.customPrompt } : {}),
    ...(body.userPrompt !== undefined ? { userPrompt: body.userPrompt } : {})
  };
}

export const settingsApi = {
  settings: async () => normalizeSettings(await api.get<BackendSettings>("/me/settings")),
  updateSettings: async (body: Partial<UserSettingsPayload>) => normalizeSettings(await api.patch<BackendSettings>("/me/settings", await toSettingsPatch(body))),
  changePassword: (body: { currentPassword: string; newPassword: string }) => api.post<{ success: true }>("/auth/change-password", body),
  notificationSettings: async () => normalizeNotifications((await api.get<BackendSettings>("/me/settings")).notificationSettings),
  updateNotificationSettings: (body: Partial<NotificationPreference>) => api.patch<NotificationPreference>("/notification-settings", body),
  linkTelegram: () => api.post<{ status: "pending"; token: string; deepLink: string | null; expiresInSeconds: number }>("/telegram/link", {}),
  unlinkTelegram: () => api.delete<{ success: true }>("/telegram/link"),
  apiTokens: () => api.get<ApiList<ApiToken>>("/api-tokens"),
  createApiToken: (body: { name: string; scopes: ApiTokenScope[]; expiresInDays: number }) => api.post<ApiToken & { token: string }>("/api-tokens", buildApiTokenCreatePayload(body)),
  revokeApiToken: (id: string) => api.delete<{ success: true }>(`/api-tokens/${id}`),
  webhooks: () => api.get<ApiList<Webhook>>("/webhooks"),
  createWebhook: (body: { name: string; url: string; events: WebhookEvent[]; secret: string; enabled?: boolean }) => api.post<Webhook>("/webhooks", body),
  updateWebhook: (id: string, body: Partial<Webhook> & { secret?: string }) => api.patch<Webhook>(`/webhooks/${id}`, body),
  deleteWebhook: (id: string) => api.delete<{ success: true }>(`/webhooks/${id}`),
  testWebhook: (id: string) => api.post<Record<string, unknown>>(`/webhooks/${id}/test`),
  webhookDeliveries: (id: string) => api.get<ApiList<WebhookDelivery>>(`/webhooks/${id}/deliveries?limit=10`),
  retryWebhookDelivery: (id: string) => api.post<WebhookDelivery>(`/webhooks/deliveries/${id}/retry`),
  aiPreferences: async () => normalizeAi((await api.get<BackendSettings>("/me/settings")).aiPreferences),
  updateAiPreferences: async (body: Partial<AiPreferences>) => normalizeAi((await api.patch<BackendSettings>("/me/settings", { aiPreferences: toAiPatch(body) })).aiPreferences),
  dashboardSettings: async () => normalizeDashboard((await api.get<BackendSettings>("/me/settings")).uiSettings?.dashboard),
  updateDashboardSettings: async (body: Partial<DashboardSettings>) => {
    const current = await api.get<BackendSettings>("/me/settings");
    const next = normalizeDashboard({ ...current.uiSettings?.dashboard, ...body });
    const updated = await api.patch<BackendSettings>("/me/settings", { uiSettings: { dashboard: next } });
    return normalizeDashboard(updated.uiSettings?.dashboard);
  }
};
