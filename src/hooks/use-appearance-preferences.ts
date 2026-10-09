"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth";
import { api } from "@/services/api";
import { defaultAppearance, useUiPreferences, type Density, type ThemeMode, type ThemePack } from "./use-ui-preferences";

export type AppearancePreferences = {
  themePack: ThemePack;
  mode: ThemeMode;
  density: Density;
  reducedMotion: boolean;
};

export type AppearancePreferencesPatch = Partial<AppearancePreferences>;

export function resolveEffectiveMode(mode: ThemeMode, systemPrefersDark: boolean): "light" | "dark" {
  return mode === "system" ? (systemPrefersDark ? "dark" : "light") : mode;
}

export function resolveEffectiveReducedMotion(reducedMotion: boolean, systemPrefersReducedMotion: boolean): boolean {
  return reducedMotion || systemPrefersReducedMotion;
}

export function mergeAppearance(current: AppearancePreferences, patch: AppearancePreferencesPatch): AppearancePreferences {
  return { ...current, ...patch };
}

export function appearanceFromUserSettings(settings: Partial<AppearancePreferences> | undefined, fallback: AppearancePreferences): AppearancePreferences {
  return {
    themePack: settings?.themePack ?? fallback.themePack,
    mode: settings?.mode ?? fallback.mode,
    density: settings?.density ?? fallback.density,
    reducedMotion: settings?.reducedMotion ?? fallback.reducedMotion
  };
}

type AppearanceCommit = {
  userId: string | null;
  appearance: AppearancePreferences;
};

let committedAppearance: AppearanceCommit = { userId: null, appearance: defaultAppearance };
let sharedMutationChain: Promise<unknown> = Promise.resolve();
let sharedMutationRevision = 0;

export function noteCommittedAppearance(userId: string | null, appearance: AppearancePreferences) {
  committedAppearance = { userId, appearance };
}

function rollbackAppearanceForUser(userId: string, fallback: AppearancePreferences) {
  return committedAppearance.userId === userId ? committedAppearance.appearance : fallback;
}

export function resetAppearanceSyncForTests() {
  committedAppearance = { userId: null, appearance: defaultAppearance };
  sharedMutationChain = Promise.resolve();
  sharedMutationRevision = 0;
}

function currentAppearance(): AppearancePreferences {
  const state = useUiPreferences.getState();
  return {
    themePack: state.themePack,
    mode: state.mode,
    density: state.density,
    reducedMotion: state.reducedMotion
  };
}

function mergeUserAppearance(userId: string, patch: AppearancePreferencesPatch) {
  const { user, setUser } = useAuthStore.getState();
  if (!user || user.id !== userId) return;
  setUser({
    ...user,
    settings: {
      ...user.settings,
      ...patch
    }
  });
}

type BackendAppearanceSettings = {
  uiSettings?: {
    themePack?: ThemePack;
    theme?: ThemeMode;
    density?: Density;
    reducedMotion?: boolean;
  };
};

function normalizeBackendAppearance(settings: BackendAppearanceSettings, fallback: AppearancePreferences): AppearancePreferences {
  return {
    themePack: settings.uiSettings?.themePack ?? fallback.themePack,
    mode: settings.uiSettings?.theme ?? fallback.mode,
    density: settings.uiSettings?.density ?? fallback.density,
    reducedMotion: settings.uiSettings?.reducedMotion ?? fallback.reducedMotion
  };
}

async function persistAppearanceSettings(body: AppearancePreferencesPatch, fallback: AppearancePreferences): Promise<AppearancePreferences> {
  const response = await api.patch<BackendAppearanceSettings>("/me/settings", {
    uiSettings: {
      ...(body.themePack !== undefined ? { themePack: body.themePack } : {}),
      ...(body.mode !== undefined ? { theme: body.mode } : {}),
      ...(body.density !== undefined ? { density: body.density } : {}),
      ...(body.reducedMotion !== undefined ? { reducedMotion: body.reducedMotion } : {})
    }
  });
  return normalizeBackendAppearance(response, fallback);
}

export function enqueueAppearanceMutation({
  userId,
  patch,
  optimistic,
  persist,
  getCurrentUserId,
  applySaved,
  applyRollback
}: {
  userId: string;
  patch: AppearancePreferencesPatch;
  optimistic: AppearancePreferences;
  persist: (patch: AppearancePreferencesPatch, fallback: AppearancePreferences) => Promise<AppearancePreferences>;
  getCurrentUserId: () => string | null;
  applySaved: (appearance: AppearancePreferences) => void;
  applyRollback: (appearance: AppearancePreferences) => void;
}) {
  const mutationRevision = sharedMutationRevision + 1;
  sharedMutationRevision = mutationRevision;

  const task = sharedMutationChain
    .catch(() => undefined)
    .then(async () => {
      if (getCurrentUserId() !== userId) return optimistic;
      try {
        const updated = await persist(patch, optimistic);
        if (getCurrentUserId() === userId) {
          noteCommittedAppearance(userId, updated);
          if (mutationRevision === sharedMutationRevision) {
            applySaved(updated);
          }
        }
        return updated;
      } catch (error) {
        if (getCurrentUserId() === userId && mutationRevision === sharedMutationRevision) {
          applyRollback(rollbackAppearanceForUser(userId, optimistic));
        }
        throw error;
      }
    });

  sharedMutationChain = task.catch(() => undefined);
  return task;
}

export function useAppearancePreferences() {
  const themePack = useUiPreferences((state) => state.themePack);
  const mode = useUiPreferences((state) => state.mode);
  const density = useUiPreferences((state) => state.density);
  const reducedMotion = useUiPreferences((state) => state.reducedMotion);
  const setAppearance = useUiPreferences((state) => state.setAppearance);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const revisionRef = React.useRef(0);

  const syncSavedAppearance = React.useCallback(
    (userId: string, appearance: AppearancePreferences) => {
      setAppearance(appearance);
      mergeUserAppearance(userId, appearance);
      queryClient.setQueryData(["settings", "me"], (current: unknown) => {
        if (!current || typeof current !== "object") return current;
        return { ...current, ...appearance };
      });
      void queryClient.invalidateQueries({ queryKey: ["settings", "me"], exact: true });
    },
    [queryClient, setAppearance]
  );

  const updateAppearance = React.useCallback(
    async (patch: AppearancePreferencesPatch) => {
      const userAtCall = useAuthStore.getState().user;
      const before = currentAppearance();
      const optimistic = mergeAppearance(before, patch);
      setAppearance(optimistic);

      if (!userAtCall) {
        setError(null);
        return optimistic;
      }

      const revision = revisionRef.current + 1;
      revisionRef.current = revision;
      setPending(true);
      setError(null);

      return enqueueAppearanceMutation({
        userId: userAtCall.id,
        patch,
        optimistic,
        persist: persistAppearanceSettings,
        getCurrentUserId: () => useAuthStore.getState().user?.id ?? null,
        applySaved: (appearance) => syncSavedAppearance(userAtCall.id, appearance),
        applyRollback: setAppearance
      })
        .then((updated) => {
          if (revision === revisionRef.current) {
            setError(null);
          }
          return updated;
        })
        .catch((caught) => {
          const nextError = caught instanceof Error ? caught : new Error("Failed to update appearance settings");
          if (revision === revisionRef.current) {
            setError(nextError);
          }
          throw nextError;
        })
        .finally(() => {
          if (revision === revisionRef.current) {
            setPending(false);
          }
        });
    },
    [setAppearance, syncSavedAppearance]
  );

  return {
    themePack,
    mode,
    density,
    reducedMotion,
    pending,
    error,
    updateAppearance,
    userSettings: user?.settings
  };
}
