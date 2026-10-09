import { QueryClient, QueryObserver, type InfiniteData } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { OpportunityRecord, Page } from "./contracts";
import { isOpportunityViewReady, opportunityDetailPath, opportunityDetailQueryKey, opportunityViewBody, opportunityViewIntentKey, opportunityViewIntentRetry, opportunityViewPath, resolveOpportunityViewIntentState, resolveOpportunityWorkspaceProfileId, syncOpportunityViewCaches } from "./opportunity-view-intent";

type ViewVariables = {
  opportunityId: string;
  profileId?: string;
  userId: string;
  intentKey: string;
};

function opportunity(stage: "New" | "Reviewed", id = "opp-1", profileId = "profile-1"): OpportunityRecord {
  return {
    id,
    type: "vacancy",
    title: "Backend Engineer",
    companyOrClient: "INTLY",
    description: "Build things",
    skills: [],
    technologies: [],
    money: {},
    sourceStatus: "Active",
    sourceOccurrences: [],
    firstSeenAt: "2026-10-05T00:00:00.000Z",
    vacancyData: {},
    freelanceData: {},
    tenderData: {},
    personalState: {
      id: `state-${id}-${profileId}`,
      profileId,
      pipelineStatus: stage,
      favorite: false,
      hidden: false,
      archived: false,
      tags: [],
      matchScore: null,
      matchComponents: {},
      notes: [],
    },
  };
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function opportunityPages(items: OpportunityRecord[]): InfiniteData<Page<OpportunityRecord>> {
  return { pages: [{ items, nextCursor: null, total: items.length }], pageParams: [null] };
}

async function flushQueryWork() {
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
}

function createViewObserver({
  client,
  post,
}: {
  client: QueryClient;
  post: (path: string, body: unknown) => Promise<OpportunityRecord>;
}) {
  let state = { contextKey: null as string | null, generation: 0, retryNonce: 0 };
  const intents: Array<{ contextKey: string | null; generation: number; retryNonce: number; intentKey: string | null }> = [];
  async function mutate(variables: ViewVariables): Promise<OpportunityRecord> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= opportunityViewIntentRetry; attempt += 1) {
      try {
        const record = await post(opportunityViewPath(variables.opportunityId), opportunityViewBody(variables.profileId));
        if (variables.intentKey === opportunityViewIntentKey(state)) {
          syncOpportunityViewCaches(client, record, variables.userId, variables.profileId);
        }
        return record;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    throw lastError ?? new Error("View failed");
  }
  return {
    intents,
    open(input: { opportunityId: string; profileId?: string; userId: string }) {
      const contextKey = JSON.stringify([input.opportunityId, input.userId, input.profileId ?? null]);
      state = resolveOpportunityViewIntentState(state, contextKey, state.retryNonce);
      const intentKey = opportunityViewIntentKey(state)!;
      intents.push({ ...state, intentKey });
      return mutate({ ...input, intentKey });
    },
  };
}

describe("opportunity workspace view intent", () => {
  it("marks view through mutation once and keeps passive broad invalidation on read-only detail GET", async () => {
    const client = createClient();
    const posts: Array<{ path: string; body: unknown }> = [];
    const gets: string[] = [];
    const post = vi.fn(async (path: string, body: unknown) => {
      posts.push({ path, body });
      return opportunity("Reviewed");
    });
    const get = vi.fn(async (path: string) => {
      gets.push(path);
      return opportunity("New");
    });
    const harness = createViewObserver({ client, post });
    const detailKey = opportunityDetailQueryKey("opp-1", "user-1", "profile-1");

    await harness.open({ opportunityId: "opp-1", profileId: "profile-1", userId: "user-1" });
    expect(posts).toEqual([{ path: "/opportunities/opp-1/view", body: { profileId: "profile-1" } }]);
    expect(client.getQueryData<OpportunityRecord>(detailKey)?.personalState?.pipelineStatus).toBe("Reviewed");

    const detail = new QueryObserver(client, {
      queryKey: detailKey,
      queryFn: () => get(opportunityDetailPath("opp-1", "profile-1")),
      enabled: true,
    });
    const unsubscribe = detail.subscribe(() => undefined);
    client.setQueryData<OpportunityRecord>(detailKey, current => current ? { ...current, personalState: current.personalState ? { ...current.personalState, pipelineStatus: "New" } : current.personalState } : current);

    await client.invalidateQueries({ queryKey: ["opportunity"] });
    unsubscribe();

    expect(posts).toHaveLength(1);
    expect(gets).toContain("/opportunities/opp-1?profileId=profile-1");
    expect(client.getQueryData<OpportunityRecord>(detailKey)?.personalState?.pipelineStatus).toBe("New");
  });

  it("syncs loaded opportunity lists for the viewed profile and refetches staged filters", async () => {
    const client = createClient();
    const allKey = ["opportunities", "profile-1", "sort=recommended"];
    const stagedKey = ["opportunities", "profile-1", "pipelineStatuses=New"];
    const otherProfileKey = ["opportunities", "profile-2", "sort=recommended"];
    let stagedRefetches = 0;
    client.setQueryData(allKey, opportunityPages([opportunity("New", "opp-1", "profile-1")]));
    client.setQueryData(stagedKey, opportunityPages([opportunity("New", "opp-1", "profile-1")]));
    client.setQueryData(otherProfileKey, opportunityPages([opportunity("New", "opp-1", "profile-2")]));
    const stagedObserver = new QueryObserver(client, {
      queryKey: stagedKey,
      queryFn: async () => {
        stagedRefetches += 1;
        return opportunityPages([]);
      },
      enabled: true,
      staleTime: Infinity,
    });
    const unsubscribe = stagedObserver.subscribe(() => undefined);
    const harness = createViewObserver({
      client,
      post: async () => opportunity("Reviewed", "opp-1", "profile-1"),
    });

    await harness.open({ opportunityId: "opp-1", profileId: "profile-1", userId: "user-1" });
    await flushQueryWork();
    unsubscribe();

    expect(client.getQueryData<InfiniteData<Page<OpportunityRecord>>>(allKey)?.pages[0]?.items[0]?.personalState?.pipelineStatus).toBe("Reviewed");
    expect(client.getQueryData<InfiniteData<Page<OpportunityRecord>>>(otherProfileKey)?.pages[0]?.items[0]?.personalState?.pipelineStatus).toBe("New");
    expect(stagedRefetches).toBeGreaterThanOrEqual(1);
    expect(client.getQueryData<InfiniteData<Page<OpportunityRecord>>>(stagedKey)?.pages[0]?.items).toEqual([]);
  });

  it("treats reopen and A to B to A navigation as new real view intents", async () => {
    const client = createClient();
    const posts: string[] = [];
    const harness = createViewObserver({
      client,
      post: async (path) => {
        posts.push(path);
        return opportunity("Reviewed", path.includes("opp-2") ? "opp-2" : "opp-1");
      },
    });

    await harness.open({ opportunityId: "opp-1", profileId: "profile-1", userId: "user-1" });
    await harness.open({ opportunityId: "opp-1", profileId: "profile-1", userId: "user-1" });
    await harness.open({ opportunityId: "opp-2", profileId: "profile-1", userId: "user-1" });
    await harness.open({ opportunityId: "opp-1", profileId: "profile-1", userId: "user-1" });

    expect(posts).toEqual([
      "/opportunities/opp-1/view",
      "/opportunities/opp-1/view",
      "/opportunities/opp-2/view",
      "/opportunities/opp-1/view",
    ]);
  });

  it("does not treat cached detail as controls-ready before the current real-open intent succeeds", () => {
    const contextKey = JSON.stringify(["opp-1", "user-1", "profile-1"]);
    const cachedDetail = opportunity("New");
    const intent = resolveOpportunityViewIntentState({ contextKey: null, generation: 0, retryNonce: 0 }, contextKey, 0);

    expect(cachedDetail.personalState?.pipelineStatus).toBe("New");
    expect(opportunityViewIntentKey(intent)).toBe(`${contextKey}:0:1`);
    expect(isOpportunityViewReady(undefined)).toBe(false);
    expect(isOpportunityViewReady("pending")).toBe(false);
    expect(isOpportunityViewReady("error")).toBe(false);
    expect(isOpportunityViewReady("success")).toBe(true);
  });

  it("ignores delayed stale A results after A to B to A navigation and manual New", async () => {
    const client = createClient();
    const requests: Array<{ path: string; response: ReturnType<typeof deferred<OpportunityRecord>> }> = [];
    const harness = createViewObserver({
      client,
      post: (path) => {
        const response = deferred<OpportunityRecord>();
        requests.push({ path, response });
        return response.promise;
      },
    });
    const aKey = opportunityDetailQueryKey("opp-1", "user-1", "profile-1");

    const staleA = harness.open({ opportunityId: "opp-1", profileId: "profile-1", userId: "user-1" });
    const b = harness.open({ opportunityId: "opp-2", profileId: "profile-1", userId: "user-1" });
    const staleAKey = harness.intents[0].intentKey;
    expect(harness.intents).toEqual([
      { contextKey: JSON.stringify(["opp-1", "user-1", "profile-1"]), generation: 1, retryNonce: 0, intentKey: `${JSON.stringify(["opp-1", "user-1", "profile-1"])}:0:1` },
      { contextKey: JSON.stringify(["opp-2", "user-1", "profile-1"]), generation: 2, retryNonce: 0, intentKey: `${JSON.stringify(["opp-2", "user-1", "profile-1"])}:0:2` },
    ]);
    requests[1].response.resolve(opportunity("Reviewed", "opp-2"));
    await b;

    const currentA = harness.open({ opportunityId: "opp-1", profileId: "profile-1", userId: "user-1" });
    expect(harness.intents[2]).toEqual({ contextKey: JSON.stringify(["opp-1", "user-1", "profile-1"]), generation: 3, retryNonce: 0, intentKey: `${JSON.stringify(["opp-1", "user-1", "profile-1"])}:0:3` });
    expect(staleAKey).not.toBe(harness.intents[2].intentKey);
    requests[2].response.resolve(opportunity("Reviewed", "opp-1"));
    await currentA;
    client.setQueryData<OpportunityRecord>(aKey, current => current ? { ...current, personalState: current.personalState ? { ...current.personalState, pipelineStatus: "New" } : current.personalState } : current);

    requests[0].response.resolve(opportunity("Reviewed", "opp-1"));
    await staleA;

    expect(requests.map(request => request.path)).toEqual([
      "/opportunities/opp-1/view",
      "/opportunities/opp-2/view",
      "/opportunities/opp-1/view",
    ]);
    expect(client.getQueryData<OpportunityRecord>(aKey)?.personalState?.pipelineStatus).toBe("New");
  });

  it("retries failed view intent without enabling a stale detail record", async () => {
    const client = createClient();
    let attempts = 0;
    const harness = createViewObserver({
      client,
      post: async () => {
        attempts += 1;
        throw new Error("view failed");
      },
    });

    await expect(harness.open({ opportunityId: "opp-1", profileId: "profile-1", userId: "user-1" })).rejects.toThrow("view failed");

    expect(attempts).toBe(opportunityViewIntentRetry + 1);
    expect(client.getQueryData(opportunityDetailQueryKey("opp-1", "user-1", "profile-1"))).toBeUndefined();
  });

  it("keeps profile and user identity isolated in detail cache", async () => {
    const client = createClient();
    const harness = createViewObserver({
      client,
      post: async (_path, body) => opportunity("Reviewed", "opp-1", (body as { profileId?: string }).profileId ?? "shared"),
    });

    await harness.open({ opportunityId: "opp-1", profileId: "profile-1", userId: "user-a" });
    await harness.open({ opportunityId: "opp-1", profileId: "profile-1", userId: "user-b" });
    await harness.open({ opportunityId: "opp-1", profileId: "profile-2", userId: "user-a" });

    expect(client.getQueryData<OpportunityRecord>(opportunityDetailQueryKey("opp-1", "user-a", "profile-1"))?.personalState?.profileId).toBe("profile-1");
    expect(client.getQueryData<OpportunityRecord>(opportunityDetailQueryKey("opp-1", "user-b", "profile-1"))?.personalState?.profileId).toBe("profile-1");
    expect(client.getQueryData<OpportunityRecord>(opportunityDetailQueryKey("opp-1", "user-a", "profile-2"))?.personalState?.profileId).toBe("profile-2");
    expect(opportunityDetailQueryKey("opp-1", "user-a", "profile-1")).not.toEqual(opportunityDetailQueryKey("opp-1", "user-b", "profile-1"));
  });

  it("waits for profiles and rejects invalid explicit overrides instead of falling back to active profile", () => {
    expect(resolveOpportunityWorkspaceProfileId({
      selectedProfileId: "profile-active",
      profilesPending: true,
    })).toEqual({ ready: false });

    expect(resolveOpportunityWorkspaceProfileId({
      profileIdOverride: "profile-url",
      selectedProfileId: "profile-active",
      profilesPending: true,
    })).toEqual({ ready: false });

    expect(resolveOpportunityWorkspaceProfileId({
      profileIdOverride: "profile-url",
      selectedProfileId: "profile-active",
      profiles: [{ id: "profile-url" }, { id: "profile-active", isActive: true }],
      profilesPending: false,
    })).toEqual({ ready: true, profileId: "profile-url" });

    expect(resolveOpportunityWorkspaceProfileId({
      profileIdOverride: "missing",
      selectedProfileId: "profile-active",
      profiles: [{ id: "profile-url" }, { id: "profile-active", isActive: true }],
      profilesPending: false,
    })).toEqual({ ready: true, error: "Selected profile is not available" });

    expect(resolveOpportunityWorkspaceProfileId({
      selectedProfileId: "profile-active",
      profilesPending: false,
      profilesError: true,
    })).toEqual({ ready: true, error: "Profile context failed to load" });
  });
});
