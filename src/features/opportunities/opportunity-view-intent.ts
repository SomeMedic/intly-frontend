import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";
import type { OpportunityRecord, Page } from "./contracts";

type ProfileChoice = {
  id: string;
  isActive?: boolean | null;
};

export type OpportunityProfileResolution = {
  ready: boolean;
  profileId?: string;
  error?: string;
};

export const opportunityViewIntentRetry = 2;
export type OpportunityViewOpenContext = {
  opportunityId: string;
  userId: string;
  profileId?: string;
};

export function opportunityViewOpenContextKey(context: OpportunityViewOpenContext) {
  return JSON.stringify([context.opportunityId, context.userId, context.profileId ?? null]);
}

export type OpportunityViewIntentState = {
  contextKey: string | null;
  generation: number;
  retryNonce: number;
};

export function resolveOpportunityViewIntentState(previous: OpportunityViewIntentState, contextKey: string | null, retryNonce: number): OpportunityViewIntentState {
  if (previous.contextKey === contextKey && previous.retryNonce === retryNonce) return previous;
  return { contextKey, retryNonce, generation: previous.generation + 1 };
}

export function opportunityViewIntentKey(state: OpportunityViewIntentState) {
  return state.contextKey ? `${state.contextKey}:${state.retryNonce}:${state.generation}` : null;
}

export function isOpportunityViewReady(status: string | undefined) {
  return status === "success";
}

export function resolveOpportunityWorkspaceProfileId({
  profileIdOverride,
  selectedProfileId,
  profiles,
  profilesPending,
  profilesError,
}: {
  profileIdOverride?: string;
  selectedProfileId?: string | null;
  profiles?: ProfileChoice[];
  profilesPending: boolean;
  profilesError?: boolean;
}): OpportunityProfileResolution {
  if (profilesPending && !profiles) return { ready: false };
  if (profilesError) return { ready: true, error: "Profile context failed to load" };
  if (profileIdOverride && profiles?.some(profile => profile.id === profileIdOverride)) {
    return { ready: true, profileId: profileIdOverride };
  }
  if (profileIdOverride) return { ready: true, error: "Selected profile is not available" };
  return {
    ready: true,
    profileId: selectedProfileId ?? profiles?.find(profile => profile.isActive)?.id,
  };
}

export function opportunityDetailPath(id: string, profileId?: string) {
  return `/opportunities/${id}${profileId ? `?profileId=${encodeURIComponent(profileId)}` : ""}`;
}

export function opportunityViewPath(id: string) {
  return `/opportunities/${id}/view`;
}

export function opportunityViewBody(profileId?: string) {
  return profileId ? { profileId } : {};
}

export function opportunityDetailQueryKey(id: string, userId?: string | null, profileId?: string): QueryKey {
  return ["opportunity", id, userId ?? null, profileId ?? null];
}

export function syncOpportunityViewCaches(client: QueryClient, record: OpportunityRecord, userId?: string | null, profileId?: string) {
  client.setQueryData(opportunityDetailQueryKey(record.id, userId, profileId), record);
  for (const query of client.getQueryCache().findAll({ queryKey: ["opportunities"] })) {
    if (query.queryKey[1] !== profileId) continue;
    client.setQueryData<InfiniteData<Page<OpportunityRecord>>>(query.queryKey, current => {
      if (!current || !Array.isArray(current.pages)) return current;
      let changed = false;
      const pages = current.pages.map(page => {
        let pageChanged = false;
        const items = page.items.map(item => {
          if (item.id !== record.id) return item;
          pageChanged = true;
          changed = true;
          return record;
        });
        return pageChanged ? { ...page, items } : page;
      });
      return changed ? { ...current, pages } : current;
    });
  }
  void client.invalidateQueries({ queryKey: ["opportunities"] });
  void client.invalidateQueries({ queryKey: ["dashboard"] });
  void client.invalidateQueries({ queryKey: ["pipelines"] });
  void client.invalidateQueries({ queryKey: ["analytics"] });
}

export function opportunityViewIntentQueryKey(id: string, userId: string, profileId: string | undefined, openInstanceId: string): QueryKey {
  return ["opportunity-view", id, userId, profileId ?? null, openInstanceId];
}
