"use client";

import { create } from "zustand";
import type { CurrentUser } from "@/types";

type AuthState = {
  user: CurrentUser | null;
  bootstrapped: boolean;
  setUser: (user: CurrentUser | null) => void;
  setBootstrapped: (bootstrapped: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  bootstrapped: false,
  setUser: (user) => set({ user }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped })
}));
