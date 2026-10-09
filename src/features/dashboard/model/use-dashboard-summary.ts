"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardPeriod } from "@/types";
import { queryKeys } from "@/services/api";
import { useActiveProfileStore } from "@/hooks/use-active-profile";
import { dashboardApi } from "../api/dashboard-api";

export function useDashboardSummary(period?: DashboardPeriod) {
  const activeProfileId = useActiveProfileStore((state) => state.activeProfileId);

  return useQuery({
    queryKey: queryKeys.dashboard.summary(activeProfileId, period),
    queryFn: () => dashboardApi.summary({ profileId: activeProfileId, period }),
    staleTime: 30_000
  });
}
