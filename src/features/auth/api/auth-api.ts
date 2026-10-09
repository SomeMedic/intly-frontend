import { api, refreshAccessToken } from "@/services/api";
import type { AccountStatus, CurrentUser, Density, Session, ThemeMode, ThemePack, UserRole } from "@/types";

type AppearancePreferences = {
  themePack: ThemePack;
  mode: ThemeMode;
  density: Density;
  reducedMotion: boolean;
};

type AppearancePreferencesPatch = Partial<AppearancePreferences>;

export type LoginRequest = {
  email: string;
  password: string;
};

export type ActivateInviteRequest = {
  token: string;
  name: string;
  password: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

type TokenResponse = {
  accessToken: string;
  expiresIn: number;
};

type BackendPublicUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: AccountStatus;
  locale?: "ru" | "en";
  timezone?: string;
  uiSettings?: {
    themePack?: AppearancePreferences["themePack"];
    theme?: "light" | "dark" | "system";
    density?: "compact" | "comfortable";
    reducedMotion?: boolean;
  };
  onboarding?: {
    minimumComplete?: boolean;
    checklist?: Record<string, unknown>;
  };
};

type LoginResponse = TokenResponse & { user: BackendPublicUser };

type InviteValidationResponse = {
  email: string;
  name?: string;
  status: AccountStatus;
  expiresAt: string;
};

function normalizeUser(user: BackendPublicUser): CurrentUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    onboardingComplete: Boolean(user.onboarding?.minimumComplete),
    onboarding: {
      minimumComplete: Boolean(user.onboarding?.minimumComplete),
      checklist: user.onboarding?.checklist ?? {}
    },
    settings: {
      locale: user.locale ?? "ru",
      timezone: user.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      themePack: user.uiSettings?.themePack ?? "intly-plum",
      mode: user.uiSettings?.theme ?? "system",
      density: user.uiSettings?.density ?? "comfortable",
      reducedMotion: user.uiSettings?.reducedMotion ?? false
    }
  };
}

async function login(body: LoginRequest): Promise<Session> {
  const response = await api.post<LoginResponse>("/auth/login", body, { retryOnAuth: false });
  return { accessToken: response.accessToken, user: normalizeUser(response.user) };
}

async function refresh(): Promise<Session> {
  const token = await refreshAccessToken();
  const user = await api.get<BackendPublicUser>("/me", { retryOnAuth: false });
  return { accessToken: token.accessToken, user: normalizeUser(user) };
}

type BackendSettings = {
  uiSettings?: {
    themePack?: AppearancePreferences["themePack"];
    theme?: AppearancePreferences["mode"];
    density?: AppearancePreferences["density"];
    reducedMotion?: boolean;
  };
};

function normalizeAppearance(settings: BackendSettings, fallback: AppearancePreferences): AppearancePreferences {
  return {
    themePack: settings.uiSettings?.themePack ?? fallback.themePack,
    mode: settings.uiSettings?.theme ?? fallback.mode,
    density: settings.uiSettings?.density ?? fallback.density,
    reducedMotion: settings.uiSettings?.reducedMotion ?? fallback.reducedMotion
  };
}

async function updateAppearanceSettings(body: AppearancePreferencesPatch, fallback: AppearancePreferences): Promise<AppearancePreferences> {
  const response = await api.patch<BackendSettings>("/me/settings", {
    uiSettings: {
      ...(body.themePack !== undefined ? { themePack: body.themePack } : {}),
      ...(body.mode !== undefined ? { theme: body.mode } : {}),
      ...(body.density !== undefined ? { density: body.density } : {}),
      ...(body.reducedMotion !== undefined ? { reducedMotion: body.reducedMotion } : {})
    }
  });
  return normalizeAppearance(response, fallback);
}

export const authApi = {
  login,
  refresh,
  logout: () => api.post<{ success: true }>("/auth/logout", undefined, { retryOnAuth: false }),
  me: async () => normalizeUser(await api.get<BackendPublicUser>("/me")),
  forgotPassword: (email: string) => api.post<{ accepted: boolean; emailSent?: boolean }>("/auth/forgot-password", { email }),
  resetPassword: (body: ResetPasswordRequest) => api.post<{ success: true }>("/auth/reset-password", body),
  updateAppearanceSettings,
  validateInvite: (token: string) =>
    api.get<InviteValidationResponse>(`/auth/invite/validate?token=${encodeURIComponent(token)}`, { retryOnAuth: false }),
  activateInvite: async (body: ActivateInviteRequest) => {
    const response = await api.post<LoginResponse>("/auth/invite/activate", body, { retryOnAuth: false });
    return { accessToken: response.accessToken, user: normalizeUser(response.user) };
  }
};
