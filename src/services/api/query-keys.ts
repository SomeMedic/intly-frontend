export const queryKeys = {
  session: () => ["session"] as const,
  dashboard: {
    summary: (profileId?: string | null, period?: string | null) => ["dashboard", "summary", profileId ?? "active", period ?? "7d"] as const
  },
  opportunities: {
    list: (params: Record<string, unknown>) => ["opportunities", "list", params] as const,
    detail: (id: string, profileId?: string | null) =>
      ["opportunities", "detail", id, profileId ?? "active"] as const
  },
  profiles: {
    all: () => ["profiles"] as const,
    detail: (id: string) => ["profiles", id] as const
  },
  onboarding: () => ["me", "onboarding"] as const,
  notifications: () => ["notifications"] as const
};
