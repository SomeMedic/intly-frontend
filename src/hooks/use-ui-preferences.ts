"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePack = "intly-plum" | "forest-teal" | "warm-clay" | "graphite-copper";
export type ThemeMode = "light" | "dark" | "system";
export type Density = "compact" | "comfortable";

type UiPreferences = {
  themePack: ThemePack;
  mode: ThemeMode;
  density: Density;
  reducedMotion: boolean;
  sidebarCollapsed: boolean;
  searchOpen: boolean;
  setThemePack: (themePack: ThemePack) => void;
  setMode: (mode: ThemeMode) => void;
  setDensity: (density: Density) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setAppearance: (appearance: Partial<Pick<UiPreferences, "themePack" | "mode" | "density" | "reducedMotion">>) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSearchOpen: (open: boolean) => void;
};

export const themePacks: Array<{ id: ThemePack; label: string; swatch: string; accent: string }> = [
  { id: "intly-plum", label: "Plum", swatch: "hsl(268 58% 42%)", accent: "hsl(184 70% 38%)" },
  { id: "forest-teal", label: "Forest", swatch: "hsl(164 58% 28%)", accent: "hsl(38 78% 48%)" },
  { id: "warm-clay", label: "Clay", swatch: "hsl(18 58% 43%)", accent: "hsl(210 48% 38%)" },
  { id: "graphite-copper", label: "Copper", swatch: "hsl(24 74% 45%)", accent: "hsl(210 11% 18%)" }
];

export const defaultAppearance = {
  themePack: "intly-plum",
  mode: "system",
  density: "comfortable",
  reducedMotion: false
} satisfies Pick<UiPreferences, "themePack" | "mode" | "density" | "reducedMotion">;

export const useUiPreferences = create<UiPreferences>()(
  persist(
    (set) => ({
      ...defaultAppearance,
      sidebarCollapsed: false,
      searchOpen: false,
      setThemePack: (themePack) => set({ themePack }),
      setMode: (mode) => set({ mode }),
      setDensity: (density) => set({ density }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setAppearance: (appearance) => set(appearance),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setSearchOpen: (searchOpen) => set({ searchOpen })
    }),
    {
      name: "intly-ui-preferences",
      partialize: ({ themePack, mode, density, reducedMotion, sidebarCollapsed }) => ({
        themePack,
        mode,
        density,
        reducedMotion,
        sidebarCollapsed
      })
    }
  )
);
