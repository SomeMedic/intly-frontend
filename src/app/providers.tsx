"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuthStore } from "@/features/auth";
import { appearanceFromUserSettings, noteCommittedAppearance, resolveEffectiveMode, resolveEffectiveReducedMotion } from "@/hooks/use-appearance-preferences";
import { defaultAppearance, useUiPreferences } from "@/hooks/use-ui-preferences";
import { trackHistoryPositions } from "@/lib/draft-history";
import "@/i18n/client";

function UiRootSync() {
  const themePack = useUiPreferences((state) => state.themePack);
  const mode = useUiPreferences((state) => state.mode);
  const density = useUiPreferences((state) => state.density);
  const reducedMotion = useUiPreferences((state) => state.reducedMotion);
  const setAppearance = useUiPreferences((state) => state.setAppearance);
  const user = useAuthStore((state) => state.user);
  const bootstrapped = useAuthStore((state) => state.bootstrapped);
  const userId = user?.id ?? null;
  const userThemePack = user?.settings.themePack;
  const userMode = user?.settings.mode;
  const userDensity = user?.settings.density;
  const userReducedMotion = user?.settings.reducedMotion;
  const [systemPrefersDark, setSystemPrefersDark] = React.useState(false);
  const [systemPrefersReducedMotion, setSystemPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncSystemPreferences = () => {
      setSystemPrefersDark(darkQuery.matches);
      setSystemPrefersReducedMotion(motionQuery.matches);
    };

    syncSystemPreferences();
    darkQuery.addEventListener("change", syncSystemPreferences);
    motionQuery.addEventListener("change", syncSystemPreferences);
    return () => {
      darkQuery.removeEventListener("change", syncSystemPreferences);
      motionQuery.removeEventListener("change", syncSystemPreferences);
    };
  }, []);

  React.useEffect(() => {
    if (userId) {
      const nextAppearance = appearanceFromUserSettings(
        {
          themePack: userThemePack,
          mode: userMode,
          density: userDensity,
          reducedMotion: userReducedMotion
        },
        defaultAppearance
      );
      noteCommittedAppearance(userId, nextAppearance);
      setAppearance(nextAppearance);
      return;
    }
    if (bootstrapped) {
      noteCommittedAppearance(null, defaultAppearance);
      setAppearance(defaultAppearance);
    }
  }, [bootstrapped, setAppearance, userDensity, userId, userMode, userReducedMotion, userThemePack]);

  React.useEffect(() => {
    const effectiveMode = resolveEffectiveMode(mode, systemPrefersDark);
    const effectiveReducedMotion = resolveEffectiveReducedMotion(reducedMotion, systemPrefersReducedMotion);
    document.documentElement.dataset.theme = themePack;
    document.documentElement.dataset.mode = mode;
    document.documentElement.dataset.effectiveMode = effectiveMode;
    document.documentElement.dataset.density = density;
    document.documentElement.dataset.reducedMotion = String(effectiveReducedMotion);
    document.documentElement.classList.toggle("dark", effectiveMode === "dark");
  }, [density, mode, reducedMotion, systemPrefersDark, systemPrefersReducedMotion, themePack]);

  return null;
}

function MotionPreferenceProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useUiPreferences((state) => state.reducedMotion);
  return <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>{children}</MotionConfig>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  React.useEffect(() => trackHistoryPositions(window), []);
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={250}>
        <AuthProvider>
          <MotionPreferenceProvider>
            <UiRootSync />
            {children}
            <Toaster richColors closeButton />
          </MotionPreferenceProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
