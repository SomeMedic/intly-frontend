"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { setAccessToken } from "@/services/auth/token-store";
import { queryKeys } from "@/services/api";
import { authApi, type LoginRequest } from "../api/auth-api";
import { useAuthStore } from "./auth-store";
import { currentReturnTo, defaultAuthenticatedRoute, isPublicAuthRoute, safeReturnTo } from "./redirect";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, bootstrapped, setUser, setBootstrapped } = useAuthStore();

  React.useEffect(() => {
    let cancelled = false;

    authApi
      .refresh()
      .then((session) => {
        if (cancelled) return;
        setAccessToken(session.accessToken);
        setUser(session.user);
      })
      .catch(() => {
        if (cancelled) return;
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setBootstrapped(true);
      });

    return () => {
      cancelled = true;
    };
  }, [setBootstrapped, setUser]);

  const loginMutation = useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: (session) => {
      setAccessToken(session.accessToken);
      setUser(session.user);
      queryClient.setQueryData(queryKeys.session(), session.user);
      router.replace(session.user.onboardingComplete ? safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"), defaultAuthenticatedRoute) : "/onboarding");
    }
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      setAccessToken(null);
      setUser(null);
      queryClient.clear();
      router.replace("/login");
    }
  });

  return (
    <AuthContext.Provider value={{ user, bootstrapped, loginMutation, logout: () => logoutMutation.mutate() }}>
      <React.Suspense fallback={null}>
        <AuthNavigation />
      </React.Suspense>
      {children}
    </AuthContext.Provider>
  );
}

function AuthNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, bootstrapped } = useAuthStore();

  React.useEffect(() => {
    if (!bootstrapped) return;
    const isPublic = isPublicAuthRoute(pathname);

    if (!user && !isPublic) {
      router.replace(`/login?returnTo=${encodeURIComponent(currentReturnTo(pathname, searchParams))}`);
      return;
    }

    if (user && isPublic) {
      router.replace(user.onboardingComplete ? safeReturnTo(searchParams.get("returnTo"), defaultAuthenticatedRoute) : "/onboarding");
      return;
    }

    if (user && !user.onboardingComplete && pathname !== "/onboarding" && !pathname.startsWith("/admin")) {
      router.replace("/onboarding");
    }
  }, [bootstrapped, pathname, router, searchParams, user]);

  return null;
}

type AuthContextValue = {
  user: ReturnType<typeof useAuthStore.getState>["user"];
  bootstrapped: boolean;
  loginMutation: UseMutationResult<Awaited<ReturnType<typeof authApi.login>>, Error, LoginRequest>;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
