export function createSharedRefresh<T>(execute: () => Promise<T>) {
  let refreshPromise: Promise<T> | null = null;

  return function sharedRefresh() {
    refreshPromise ??= execute().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  };
}
