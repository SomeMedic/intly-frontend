import { describe, expect, it } from "vitest";
import { guardDraftHistory, trackHistoryPositions } from "./draft-history";

function browser(native = true) {
  const entries = [{ state: { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ["dashboard"] }, url: "/dashboard" }];
  let index = 0;
  const listeners = new Set<(event: PopStateEvent) => void>();
  const nativeListeners = new Set<(event: Event & { navigationType: string; destination: { index: number } }) => void>();
  const traversals: number[] = [];
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const delivered: string[] = [];
  const window = {
    crypto: { randomUUID: () => "test-timeline" },
    setTimeout(callback: () => void) { timers.set(++timerId, callback); return timerId; },
    clearTimeout(id: number) { timers.delete(id); },
    location: { get href() { return `http://localhost:3000${entries[index].url}`; } },
    ...(native ? { navigation: {
      get currentEntry() { return { index }; },
      addEventListener(_type: string, listener: typeof nativeListeners extends Set<infer T> ? T : never) { nativeListeners.add(listener); },
      removeEventListener(_type: string, listener: typeof nativeListeners extends Set<infer T> ? T : never) { nativeListeners.delete(listener); }
    } } : {}),
    history: {
      get state() { return entries[index].state; },
      pushState(state: typeof entries[number]["state"], _unused: string, url?: string) {
        entries.splice(index + 1);
        entries.push({ state, url: url ?? entries[index].url });
        index += 1;
      },
      replaceState(state: typeof entries[number]["state"], _unused: string, url?: string) {
        entries[index] = { state, url: url ?? entries[index].url };
      },
      go(delta: number) { traversals.push(delta); }
    },
    addEventListener(_type: string, listener: (event: PopStateEvent) => void) { listeners.add(listener); },
    removeEventListener(_type: string, listener: (event: PopStateEvent) => void) { listeners.delete(listener); }
  } as unknown as Window;
  const traverse = (delta: number) => {
    index += delta;
    let stopped = false;
    const event = { stopImmediatePropagation() { stopped = true; } } as PopStateEvent;
    for (const listener of listeners) listener(event);
    if (!stopped) delivered.push(entries[index].url);
  };
  const finishTraversal = () => {
    for (const [id, callback] of timers) { timers.delete(id); callback(); }
    const delta = traversals.shift();
    if (delta === undefined) throw new Error("No queued traversal");
    traverse(delta);
  };
  const push = (url: string) => window.history.pushState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: [url] }, "", url);
  const requestNative = (delta: number, cancelable = true) => {
    const event = new Event("navigate", { cancelable }) as Event & { navigationType: string; destination: { index: number } };
    Object.assign(event, { navigationType: "traverse", destination: { index: index + delta } });
    for (const listener of nativeListeners) listener(event);
    if (!event.defaultPrevented) traverse(delta);
    return event.defaultPrevented;
  };
  return { window, entries, traversals, delivered, traverse, finishTraversal, requestNative, push, get index() { return index; } };
}

describe("unsaved draft browser history", () => {
  it("blocks cancellable native Back before any history entry changes", () => {
    const page = browser();
    page.push("/settings?tab=ai");
    let resume: (() => void) | undefined;
    const cleanup = guardDraftHistory(page.window, action => { resume = action; });
    expect(page.requestNative(-1)).toBe(true);
    expect(page.index).toBe(1);
    expect(page.traversals).toEqual([]);
    resume!();
    page.finishTraversal();
    expect(page.delivered).toEqual(["/dashboard"]);
    cleanup();
  });

  it("uses the popstate fallback when the native traversal cannot be cancelled", () => {
    const page = browser();
    page.push("/settings?tab=ai");
    let blocked = 0;
    const cleanup = guardDraftHistory(page.window, () => { blocked += 1; });
    expect(page.requestNative(-1, false)).toBe(false);
    page.finishTraversal();
    expect(page.index).toBe(1);
    expect(blocked).toBe(1);
    expect(page.delivered).toEqual([]);
    cleanup();
  });
  it("records the requested traversal before returning, so a recreated editor can recover it", () => {
    const page = browser();
    page.push("/settings?tab=ai");
    const requests: unknown[] = [];
    const cleanup = guardDraftHistory(page.window, () => {}, request => requests.push(request));
    page.traverse(-1);
    expect(requests).toEqual([{ originHref: "http://localhost:3000/settings?tab=ai", delta: -1 }]);
    expect(page.traversals).toEqual([]);
    page.finishTraversal();
    expect(page.index).toBe(1);
    cleanup();
  });

  it("does not queue an inverse traversal after the dirty editor is discarded", () => {
    const page = browser();
    page.push("/settings?tab=ai");
    const cleanup = guardDraftHistory(page.window, () => {});
    page.traverse(-1);
    cleanup();
    expect(() => page.finishTraversal()).toThrow("No queued traversal");
    expect(page.index).toBe(0);
  });
  it("keeps a draft on multi-entry Back and repeats the exact traversal only after discard", () => {
    const page = browser();
    page.push("/settings?tab=account");
    page.push("/settings?tab=ai");
    let resume: (() => void) | undefined;
    const cleanup = guardDraftHistory(page.window, action => { resume = action; });
    page.traverse(-2);
    expect(page.delivered).toEqual([]);
    expect(resume).toBeUndefined();
    page.finishTraversal();
    expect(page.index).toBe(2);
    expect(page.entries).toHaveLength(3);
    expect(page.delivered).toEqual([]);
    resume!();
    page.finishTraversal();
    expect(page.delivered).toEqual(["/dashboard"]);
    expect(page.entries).toHaveLength(3);
    cleanup();
  });

  it("keeps Forward available after cancelling, then removes the guard after save", () => {
    const page = browser();
    page.push("/settings?tab=ai");
    page.push("/settings?tab=appearance");
    page.traverse(-1);
    page.delivered.length = 0;
    let requests = 0;
    const cleanup = guardDraftHistory(page.window, () => { requests += 1; });
    page.traverse(1);
    page.finishTraversal();
    expect(requests).toBe(1);
    expect(page.index).toBe(1);
    expect(page.entries).toHaveLength(3);
    expect(page.delivered).toEqual([]);
    cleanup();
    page.traverse(1);
    expect(page.delivered).toEqual(["/settings?tab=appearance"]);
  });

  it("uses real browser positions after a reload without modifying framework state", () => {
    const page = browser();
    page.push("/settings?tab=ai");
    const state = page.window.history.state;
    const cleanup = trackHistoryPositions(page.window);
    expect(page.window.history.state).toBe(state);
    expect(page.entries).toHaveLength(2);
    cleanup();
  });

  it("preserves Next history trees and entry count in the older-browser fallback", () => {
    const page = browser(false);
    const cleanupTracker = trackHistoryPositions(page.window);
    page.push("/settings?tab=ai");
    page.window.history.replaceState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ["updated-ai"] }, "");
    expect(page.window.history.state.__PRIVATE_NEXTJS_INTERNALS_TREE).toEqual(["updated-ai"]);
    expect(page.window.history.state.__NA).toBe(true);
    const originalState = page.window.history.state;
    let resume: (() => void) | undefined;
    const cleanupGuard = guardDraftHistory(page.window, action => { resume = action; });
    page.traverse(-1);
    page.finishTraversal();
    expect(page.window.history.state).toBe(originalState);
    expect(page.entries).toHaveLength(2);
    resume!();
    page.finishTraversal();
    expect(page.delivered).toEqual(["/dashboard"]);
    cleanupGuard();
    cleanupTracker();
  });
});
