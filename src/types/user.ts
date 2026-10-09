export type UserRole = "Admin" | "User";

export type AccountStatus = "Invited" | "Active" | "Disabled" | "Locked" | "Deleted";

export type ThemePack = "intly-plum" | "forest-teal" | "warm-clay" | "graphite-copper";
export type ThemeMode = "light" | "dark" | "system";
export type Density = "compact" | "comfortable";

export type UserSettings = {
  locale: "ru" | "en";
  timezone: string;
  themePack: ThemePack;
  mode: ThemeMode;
  density: Density;
  reducedMotion: boolean;
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: AccountStatus;
  onboardingComplete: boolean;
  onboarding: {
    minimumComplete: boolean;
    checklist: Record<string, unknown>;
  };
  settings: UserSettings;
};

export type Session = {
  accessToken: string;
  user: CurrentUser;
};
