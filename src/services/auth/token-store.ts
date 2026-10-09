let accessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  if (accessToken === token) return;
  accessToken = token;
  for (const listener of listeners) listener(token);
}

export function subscribeAccessToken(listener: (token: string | null) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
