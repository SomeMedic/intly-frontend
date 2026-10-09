const positionKey = "__intly_history_position";

type Position = { timeline: string; index: number };
type DraftNavigateEvent = Event & { navigationType: string; destination: { index: number } };
type NavigationWindow = Window & {
  navigation?: {
    currentEntry?: { index: number } | null;
    addEventListener?: (type: "navigate", listener: (event: DraftNavigateEvent) => void) => void;
    removeEventListener?: (type: "navigate", listener: (event: DraftNavigateEvent) => void) => void;
  };
};

function position(window: NavigationWindow): Position | null {
  const nativeIndex = window.navigation?.currentEntry?.index;
  if (Number.isInteger(nativeIndex) && nativeIndex! >= 0) {
    return { timeline: "navigation", index: nativeIndex! };
  }
  const stored = window.history.state?.[positionKey] as Position | undefined;
  return stored && typeof stored.timeline === "string" && Number.isInteger(stored.index) ? stored : null;
}

/** Track existing entries on older browsers without adding placeholder entries. */
export function trackHistoryPositions(window: NavigationWindow): () => void {
  if (window.navigation?.currentEntry) return () => {};
  const history = window.history;
  const push = history.pushState;
  const replace = history.replaceState;
  const initial = position(window) ?? { timeline: window.crypto.randomUUID(), index: 0 };
  replace.call(history, { ...history.state, [positionKey]: initial }, "");

  const trackedPush: History["pushState"] = function (data, unused, url) {
    const current = position(window) ?? initial;
    push.call(history, { ...data, [positionKey]: { ...current, index: current.index + 1 } }, unused, url);
  };
  const trackedReplace: History["replaceState"] = function (data, unused, url) {
    replace.call(history, { ...data, [positionKey]: position(window) ?? initial }, unused, url);
  };
  history.pushState = trackedPush;
  history.replaceState = trackedReplace;
  return () => {
    if (history.pushState === trackedPush) history.pushState = push;
    if (history.replaceState === trackedReplace) history.replaceState = replace;
  };
}

/**
 * popstate cannot be cancelled. Return to the original entry before Next's
 * bubble listener updates its tree, then offer to repeat the exact traversal.
 * Native navigation.currentEntry supplies positions even after a reload.
 */
export function guardDraftHistory(window: NavigationWindow, onBlocked: (resume: () => void) => void, onReturning?: (request: { originHref: string; delta: number }) => void): () => void {
  const origin = position(window);
  if (!origin) return () => {};
  const originHref = window.location.href;
  let returning = false;
  let pendingDelta = 0;
  let allowNext = false;
  let returnTimer: number | undefined;
  const navigate = (event: DraftNavigateEvent) => {
    if (returning || allowNext || event.navigationType !== "traverse" || !event.cancelable) return;
    const delta = event.destination.index - origin.index;
    if (!Number.isInteger(event.destination.index) || event.destination.index < 0 || delta === 0) return;
    event.preventDefault();
    onBlocked(() => {
      allowNext = true;
      window.history.go(delta);
    });
  };

  const guard = (event: PopStateEvent) => {
    if (allowNext) {
      allowNext = false;
      return;
    }
    const target = position(window);
    if (!target || target.timeline !== origin.timeline) return;
    const delta = target.index - origin.index;
    if (!returning && delta === 0) return;
    event.stopImmediatePropagation();
    if (delta !== 0) {
      if (!returning) {
        pendingDelta = delta;
        onReturning?.({ originHref, delta });
      }
      returning = true;
      // Finish the active traversal before scheduling its inverse. WebKit may
      // coalesce history.go() calls made while a traversal is still running.
      if (returnTimer !== undefined) window.clearTimeout(returnTimer);
      returnTimer = window.setTimeout(() => {
        returnTimer = undefined;
        const current = position(window);
        if (current?.timeline === origin.timeline && current.index !== origin.index) {
          window.history.go(origin.index - current.index);
        }
      }, 0);
      return;
    }
    returning = false;
    const requestedDelta = pendingDelta;
    onBlocked(() => {
      const current = position(window);
      if (current?.timeline !== origin.timeline || current.index !== origin.index) return;
      allowNext = true;
      window.history.go(requestedDelta);
    });
  };
  window.navigation?.addEventListener?.("navigate", navigate);
  window.addEventListener("popstate", guard, true);
  return () => {
    window.navigation?.removeEventListener?.("navigate", navigate);
    window.removeEventListener("popstate", guard, true);
    if (returnTimer !== undefined) window.clearTimeout(returnTimer);
  };
}
