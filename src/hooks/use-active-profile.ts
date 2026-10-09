"use client";

import { create } from "zustand";

type ActiveProfileState = {
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
};

export const useActiveProfileStore = create<ActiveProfileState>((set) => ({
  activeProfileId: null,
  setActiveProfileId: (activeProfileId) => set({ activeProfileId })
}));
