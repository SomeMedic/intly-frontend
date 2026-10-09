import { getAccessToken, setAccessToken } from "@/services/auth/token-store";
import type { ApiErrorBody } from "@/types";
import { ApiError, normalizeApiError } from "./errors";
import { createSharedRefresh } from "./refresh-coordinator";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  retryOnAuth?: boolean;
  responseType?: "json" | "blob";
};

type RefreshTokenResponse = { accessToken: string; expiresIn: number };


async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export const refreshAccessToken = createSharedRefresh(async () => {
  const session = await rawApiRequest<RefreshTokenResponse>("/auth/refresh", {
    method: "POST",
    retryOnAuth: false
  });
  setAccessToken(session.accessToken);
  return session;
});

async function rawApiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAccessToken();

  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (options.body !== undefined && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      body: options.body === undefined ? undefined : options.body instanceof FormData ? options.body : JSON.stringify(options.body),
      headers,
      credentials: "include"
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request aborted", { kind: "AbortError" });
    }
    throw new ApiError("Network request failed", { kind: "NetworkError", details: error });
  }

  if (!response.ok) {
    const body = await parseJson<ApiErrorBody>(response).catch(() => null);
    throw normalizeApiError(response.status, body);
  }

  if (options.responseType === "blob") return response.blob() as Promise<T>;
  return parseJson<T>(response);
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  try {
    return await rawApiRequest<T>(path, options);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.kind === "Unauthorized" &&
      options.retryOnAuth !== false
    ) {
      await refreshAccessToken();
      return rawApiRequest<T>(path, { ...options, retryOnAuth: false });
    }
    throw error;
  }
}

export const api = {
  download: (path: string) => apiRequest<Blob>(path, { method: "GET", responseType: "blob" }),
  upload: <T>(path: string, form: FormData) => apiRequest<T>(path, { method: "POST", body: form }),
  get: <T>(path: string, options?: ApiRequestOptions) => apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" })
};
