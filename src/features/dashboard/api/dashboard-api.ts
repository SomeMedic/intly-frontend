import { api } from "@/services/api";
import type { DashboardPeriod, DashboardSummary } from "@/types";

export type DashboardSummaryParams = {
  profileId?: string | null;
  period?: DashboardPeriod;
  from?: string;
  to?: string;
};

export const dashboardApi = {
  summary: (params?: DashboardSummaryParams | string | null) => {
    const search = new URLSearchParams();
    if (typeof params === "string") {
      search.set("profileId", params);
    } else if (params) {
      if (params.profileId) search.set("profileId", params.profileId);
      if (params.period) search.set("period", params.period);
      if (params.from) search.set("from", params.from);
      if (params.to) search.set("to", params.to);
    }
    const query = search.toString();
    return api.get<DashboardSummary>(`/dashboard${query ? `?${query}` : ""}`);
  },
  setFavorite: (opportunityId: string, profileId: string, favorite: boolean) =>
    api.patch(`/opportunities/${opportunityId}/personal`, { profileId, favorite })
};
