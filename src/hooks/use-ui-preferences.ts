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
  setAppearance: (
    appearance: Partial<Pick<UiPreferences, "themePack" | "mode" | "density" | "reducedMotion">>
  ) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSearchOpen: (open: boolean) => void;
};

export const themePacks: Array<{
  id: ThemePack;
  label: string;
  labelEn: string;
  swatch: string;
  accent: string;
}> = [
  { id: "intly-plum", label: "Индиго", labelEn: "Indigo", swatch: "#5e6ad2", accent: "#8fa6ff" },
  { id: "forest-teal", label: "Шалфей", labelEn: "Sage", swatch: "#2b6a55", accent: "#8bcbb6" },
  {
    id: "warm-clay",
    label: "Терракота",
    labelEn: "Terracotta",
    swatch: "#8b5a3c",
    accent: "#e8b894"
  },
  {
    id: "graphite-copper",
    label: "Графит",
    labelEn: "Graphite",
    swatch: "#444950",
    accent: "#e2e4e7"
  }
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
